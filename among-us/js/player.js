/* ===================================================
   AMONG US BEAN CHARACTER & PLAYER CONTROLLER
   Smooth walking animations, hats, dead bodies, ghosts
   =================================================== */

class Player {
    constructor(id, name, colorId, hatId, isImpostor = false, isAI = false) {
        this.id = id;
        this.name = name || 'Oyuncu';
        this.colorId = colorId || 'red';
        this.hatId = hatId || 'none';
        this.isImpostor = isImpostor;
        this.isAI = isAI;

        // Position & Movement
        this.x = 1600;
        this.y = 600;
        this.vx = 0;
        this.vy = 0;
        this.facingRight = true;
        this.isMoving = false;
        this.walkCycle = 0;
        this.speed = CONFIG.BASE_SPEED;

        // State
        this.isDead = false;
        this.isGhost = false;
        this.inVent = false;
        this.currentVent = null;
        this.killCooldown = 10;
        this.canReport = false;
        this.targetToKill = null;
        this.tasks = [];
        this.completedTasks = 0;

        // Dead body info (when killed)
        this.deadBodyX = 0;
        this.deadBodyY = 0;
        this.reported = false;

        this.colorData = CONFIG.COLORS.find(c => c.id === this.colorId) || CONFIG.COLORS[0];
    }

    setColor(colorId) {
        this.colorId = colorId;
        this.colorData = CONFIG.COLORS.find(c => c.id === this.colorId) || CONFIG.COLORS[0];
    }

    setHat(hatId) {
        this.hatId = hatId;
    }

    update(deltaTime, shipMap) {
        if (this.isDead && !this.isGhost) return;

        // Update kill cooldown
        if (this.isImpostor && this.killCooldown > 0) {
            this.killCooldown -= deltaTime;
            if (this.killCooldown < 0) this.killCooldown = 0;
        }

        // Vent state
        if (this.inVent) {
            this.isMoving = false;
            return;
        }

        // Apply movement
        if (this.vx !== 0 || this.vy !== 0) {
            this.isMoving = true;
            this.walkCycle += deltaTime * 12;
            if (this.vx > 0.1) this.facingRight = true;
            else if (this.vx < -0.1) this.facingRight = false;

            const moveStepX = this.vx * this.speed;
            const moveStepY = this.vy * this.speed;

            if (this.isGhost) {
                // Ghosts can fly through walls
                this.x += moveStepX;
                this.y += moveStepY;
            } else {
                // Collide with map walls
                const resolved = shipMap.resolvePlayerCollision(
                    this.x + moveStepX,
                    this.y + moveStepY,
                    CONFIG.PLAYER_RADIUS
                );
                this.x = resolved.x;
                this.y = resolved.y;
            }
        } else {
            this.isMoving = false;
            this.walkCycle = 0;
        }
    }

    // Render the player bean
    render(ctx, camera, isLocalPlayer = false, localIsImpostor = false) {
        if (this.inVent && !isLocalPlayer) return;

        const screen = camera.worldToScreen(this.x, this.y);
        
        ctx.save();
        ctx.translate(screen.x, screen.y);

        // Flip for direction
        if (!this.facingRight) {
            ctx.scale(-1, 1);
        }

        // Ghost opacity
        if (this.isGhost) {
            ctx.globalAlpha = 0.55;
        }

        // Render Character Shape
        if (this.isGhost) {
            this.drawGhost(ctx);
        } else {
            this.drawBean(ctx);
        }

        // Draw Hat
        this.drawHat(ctx);

        ctx.restore();

        // Draw Name Tag & Kill Indicator (Unflipped)
        this.drawNameTag(ctx, screen.x, screen.y, localIsImpostor);
    }

    drawBean(ctx) {
        const color = this.colorData.hex;
        const shadow = this.colorData.shadow;
        const legOffset = this.isMoving ? Math.sin(this.walkCycle) * 6 : 0;

        // Ground drop shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 24, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // 1. Backpack (Oxygen Tank)
        ctx.fillStyle = shadow;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-28, -12, 14, 28, [6]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(-26, -10, 10, 24, [4]);
        ctx.fill();

        // 2. Legs
        ctx.fillStyle = shadow;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;

        // Left Leg
        ctx.beginPath();
        ctx.roundRect(-16, 14 + legOffset, 12, 18 - legOffset, [0, 0, 6, 6]);
        ctx.fill();
        ctx.stroke();

        // Right Leg
        ctx.beginPath();
        ctx.roundRect(4, 14 - legOffset, 12, 18 + legOffset, [0, 0, 6, 6]);
        ctx.fill();
        ctx.stroke();

        // 3. Main Body
        ctx.fillStyle = color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3.5;

        ctx.beginPath();
        // Rounded bean body
        ctx.moveTo(-18, 14);
        ctx.lineTo(-18, -16);
        ctx.bezierCurveTo(-18, -34, 18, -34, 18, -16);
        ctx.lineTo(18, 14);
        ctx.bezierCurveTo(18, 22, -18, 22, -18, 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Body shadow bottom curve
        ctx.fillStyle = shadow;
        ctx.beginPath();
        ctx.moveTo(-17, 4);
        ctx.bezierCurveTo(-17, 18, 17, 18, 17, 4);
        ctx.bezierCurveTo(10, 10, -10, 10, -17, 4);
        ctx.fill();

        // 4. Visor (Glass)
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.roundRect(2, -22, 24, 18, [9]);
        ctx.fill();
        ctx.stroke();

        const visorGrad = ctx.createLinearGradient(4, -20, 24, -6);
        visorGrad.addColorStop(0, '#c3f1fe');
        visorGrad.addColorStop(0.5, '#75c8e8');
        visorGrad.addColorStop(1, '#2f74a0');

        ctx.fillStyle = visorGrad;
        ctx.beginPath();
        ctx.roundRect(4, -20, 20, 14, [7]);
        ctx.fill();

        // Visor glass reflection
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(10, -16, 5, 2.5, -Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
    }

    drawGhost(ctx) {
        const color = this.colorData.hex;
        const shadow = this.colorData.shadow;
        const floatWave = Math.sin(Date.now() * 0.005) * 4;

        ctx.translate(0, floatWave);

        // Ghost body with tail
        ctx.fillStyle = color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(-18, 4);
        ctx.bezierCurveTo(-18, -32, 18, -32, 18, 4);
        // Wavy ghost tail
        ctx.bezierCurveTo(14, 20, 6, 26, 0, 30);
        ctx.bezierCurveTo(-8, 26, -14, 18, -18, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Visor
        ctx.fillStyle = '#75c8e8';
        ctx.beginPath();
        ctx.roundRect(2, -20, 20, 14, [7]);
        ctx.fill();
        ctx.stroke();
    }

    drawHat(ctx) {
        if (!this.hatId || this.hatId === 'none') return;

        ctx.save();
        ctx.translate(0, -32);

        switch (this.hatId) {
            case 'tophat':
                ctx.fillStyle = '#111';
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.fillRect(-18, -2, 36, 6); // Brim
                ctx.fillRect(-12, -26, 24, 24); // Top
                ctx.fillStyle = '#c51111'; // Red ribbon
                ctx.fillRect(-12, -8, 24, 6);
                break;
            case 'party':
                ctx.fillStyle = '#ffcc00';
                ctx.beginPath();
                ctx.moveTo(0, -28);
                ctx.lineTo(-14, 0);
                ctx.lineTo(14, 0);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#ff0066';
                ctx.beginPath();
                ctx.arc(0, -28, 4, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'crown':
                ctx.fillStyle = '#ffd700';
                ctx.strokeStyle = '#b8860b';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-16, 0);
                ctx.lineTo(-16, -18);
                ctx.lineTo(-8, -8);
                ctx.lineTo(0, -22);
                ctx.lineTo(8, -8);
                ctx.lineTo(16, -18);
                ctx.lineTo(16, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            case 'devil':
                ctx.fillStyle = '#e62424';
                // Left Horn
                ctx.beginPath();
                ctx.moveTo(-12, 0);
                ctx.quadraticCurveTo(-18, -14, -14, -20);
                ctx.quadraticCurveTo(-6, -12, -4, 0);
                ctx.fill();
                // Right Horn
                ctx.beginPath();
                ctx.moveTo(4, 0);
                ctx.quadraticCurveTo(6, -12, 14, -20);
                ctx.quadraticCurveTo(18, -14, 12, 0);
                ctx.fill();
                break;
            case 'flower':
                ctx.fillStyle = '#ff69b4';
                for (let i = 0; i < 5; i++) {
                    const a = (i / 5) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.arc(Math.cos(a) * 8, -8 + Math.sin(a) * 8, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.arc(0, -8, 4, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'beanie':
                ctx.fillStyle = '#2277bb';
                ctx.beginPath();
                ctx.arc(0, -4, 18, Math.PI, 0);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, -22, 5, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'astronaut':
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 10, 24, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 'police':
                ctx.fillStyle = '#1e3a8a';
                ctx.fillRect(-18, -12, 36, 12);
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(-4, -10, 8, 8);
                break;
        }
        ctx.restore();
    }

    drawNameTag(ctx, sx, sy, localIsImpostor) {
        ctx.font = 'bold 13px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = (localIsImpostor && this.isImpostor) ? '#ea2b2b' : '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;

        ctx.strokeText(this.name, sx, sy - 38);
        ctx.fillText(this.name, sx, sy - 38);
    }

    // Render the dead body if killed
    renderDeadBody(ctx, camera) {
        if (!this.isDead || this.reported) return;

        const screen = camera.worldToScreen(this.deadBodyX, this.deadBodyY);
        const color = this.colorData.hex;
        const shadow = this.colorData.shadow;

        ctx.save();
        ctx.translate(screen.x, screen.y);

        // Blood puddle
        ctx.fillStyle = 'rgba(180, 20, 20, 0.6)';
        ctx.beginPath();
        ctx.ellipse(0, 8, 26, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bottom body half
        ctx.fillStyle = color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(-18, 0, 36, 18, [0, 0, 8, 8]);
        ctx.fill();
        ctx.stroke();

        // Legs
        ctx.fillStyle = shadow;
        ctx.fillRect(-14, 14, 10, 10);
        ctx.strokeRect(-14, 14, 10, 10);
        ctx.fillRect(4, 14, 10, 10);
        ctx.strokeRect(4, 14, 10, 10);

        // Protruding Bone
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2.5;

        // Bone shaft
        ctx.fillRect(-4, -14, 8, 16);
        ctx.strokeRect(-4, -14, 8, 16);
        // Bone knobs
        ctx.beginPath();
        ctx.arc(-4, -14, 4, 0, Math.PI * 2);
        ctx.arc(4, -14, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

window.Player = Player;
