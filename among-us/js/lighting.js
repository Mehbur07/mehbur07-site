/* ===================================================
   AMONG US 2D LIGHTING & LINE-OF-SIGHT (FOG OF WAR)
   Raycasting Shadow Engine with Offscreen Darkness Mask
   =================================================== */

class LightingEngine {
    constructor() {
        this.wallSegments = [];
        this.maskCanvas = document.createElement('canvas');
        this.maskCtx = this.maskCanvas.getContext('2d');
    }

    setWalls(segments) {
        this.wallSegments = segments;
    }

    // Raycast from player origin to build 2D visibility polygon
    computeVisibilityPolygon(originX, originY, maxRadius) {
        if (!this.wallSegments || this.wallSegments.length === 0) {
            return null;
        }

        const angles = [];
        const numCircleRays = 64; // High precision circle rays
        for (let i = 0; i < numCircleRays; i++) {
            angles.push((i / numCircleRays) * Math.PI * 2);
        }

        // Add angles to all wall endpoints within range
        const eps = 0.0001;
        for (const seg of this.wallSegments) {
            const dist1 = Math.hypot(seg.x1 - originX, seg.y1 - originY);
            const dist2 = Math.hypot(seg.x2 - originX, seg.y2 - originY);

            if (dist1 <= maxRadius * 1.6 || dist2 <= maxRadius * 1.6) {
                const a1 = Math.atan2(seg.y1 - originY, seg.x1 - originX);
                const a2 = Math.atan2(seg.y2 - originY, seg.x2 - originX);
                angles.push(a1 - eps, a1, a1 + eps);
                angles.push(a2 - eps, a2, a2 + eps);
            }
        }

        // Cast rays and find closest intersection
        const points = [];
        for (const angle of angles) {
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            let closestDist = maxRadius;
            let hitX = originX + dx * maxRadius;
            let hitY = originY + dy * maxRadius;

            // Test ray intersection against all segments
            for (const seg of this.wallSegments) {
                const hit = this.getRaySegmentIntersection(originX, originY, dx, dy, seg);
                if (hit && hit.dist < closestDist) {
                    closestDist = hit.dist;
                    hitX = hit.x;
                    hitY = hit.y;
                }
            }

            points.push({ x: hitX, y: hitY, angle: angle });
        }

        // Sort points by angle to form continuous polygon
        points.sort((a, b) => {
            let diff = a.angle - b.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            return diff;
        });

        return points;
    }

    getRaySegmentIntersection(rx, ry, rdx, rdy, seg) {
        const x1 = seg.x1, y1 = seg.y1;
        const x2 = seg.x2, y2 = seg.y2;

        const sdx = x2 - x1;
        const sdy = y2 - y1;

        const cross = rdx * sdy - rdy * sdx;
        if (Math.abs(cross) < 1e-8) return null;

        const t1 = ((x1 - rx) * sdy - (y1 - ry) * sdx) / cross;
        const t2 = ((x1 - rx) * rdy - (y1 - ry) * rdx) / cross;

        if (t1 > 0 && t2 >= 0 && t2 <= 1) {
            return {
                x: rx + rdx * t1,
                y: ry + rdy * t1,
                dist: t1
            };
        }
        return null;
    }

    // Check if target is inside player's line of sight
    canSee(fromX, fromY, toX, toY, maxRadius) {
        const dist = Math.hypot(toX - fromX, toY - fromY);
        if (dist > maxRadius) return false;

        const dx = (toX - fromX) / dist;
        const dy = (toY - fromY) / dist;

        for (const seg of this.wallSegments) {
            const hit = this.getRaySegmentIntersection(fromX, fromY, dx, dy, seg);
            if (hit && hit.dist < dist - 8) {
                return false; // Obstructed by wall
            }
        }
        return true;
    }

    // Render darkness mask using an OFFSCREEN canvas, leaving vision area crystal clear!
    renderFogOfWar(ctx, playerX, playerY, visionRadius, canvasWidth, canvasHeight, camera) {
        const poly = this.computeVisibilityPolygon(playerX, playerY, visionRadius);
        if (!poly || poly.length < 3) return;

        if (this.maskCanvas.width !== canvasWidth || this.maskCanvas.height !== canvasHeight) {
            this.maskCanvas.width = canvasWidth;
            this.maskCanvas.height = canvasHeight;
        }

        const mCtx = this.maskCtx;

        // 1. Clear offscreen canvas
        mCtx.clearRect(0, 0, canvasWidth, canvasHeight);

        // 2. Fill with solid darkness
        mCtx.fillStyle = 'rgba(5, 8, 16, 0.92)';
        mCtx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 3. Cut out the vision polygon from the darkness
        mCtx.globalCompositeOperation = 'destination-out';
        mCtx.beginPath();
        
        const first = camera.worldToScreen(poly[0].x, poly[0].y);
        mCtx.moveTo(first.x, first.y);

        for (let i = 1; i < poly.length; i++) {
            const pt = camera.worldToScreen(poly[i].x, poly[i].y);
            mCtx.lineTo(pt.x, pt.y);
        }
        mCtx.closePath();
        mCtx.fill();

        // 4. Soft radial gradient edge for atmospheric lighting
        const centerScreen = camera.worldToScreen(playerX, playerY);
        const grad = mCtx.createRadialGradient(
            centerScreen.x, centerScreen.y, visionRadius * 0.75,
            centerScreen.x, centerScreen.y, visionRadius
        );
        grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        mCtx.fillStyle = grad;
        mCtx.beginPath();
        mCtx.arc(centerScreen.x, centerScreen.y, visionRadius, 0, Math.PI * 2);
        mCtx.fill();

        // Reset composite mode
        mCtx.globalCompositeOperation = 'source-over';

        // 5. Draw darkness mask directly onto main game canvas
        ctx.drawImage(this.maskCanvas, 0, 0);
    }
}

window.LightingEngine = LightingEngine;
