/* ===================================================
   AMONG US - THE SKELD MAP & COLLISION ENGINE
   Detailed ship rendering, rooms, consoles, vents, collision
   =================================================== */

class ShipMap {
    constructor() {
        this.rooms = CONFIG.ROOMS;
        this.vents = CONFIG.VENTS;
        this.tasks = CONFIG.TASKS_DATA;
        this.consoles = CONFIG.CONSOLES;
        this.walls = [];
        this.doors = [];
        this.initWalls();
    }

    initWalls() {
        // Build wall segments for collision and raycasting
        const addWall = (x1, y1, x2, y2) => {
            this.walls.push({ x1, y1, x2, y2 });
        };

        // Outer spaceship perimeter
        addWall(1300, 380, 2000, 380); // Cafe Top
        addWall(2000, 380, 2200, 480);
        addWall(2200, 480, 2650, 480); // Weapons Top
        addWall(2650, 480, 2950, 950);  // Weapons -> Nav
        addWall(2950, 950, 2950, 1450); // Nav Far Right
        addWall(2950, 1450, 2650, 1900); // Nav -> Shields
        addWall(2650, 1900, 2150, 1900); // Shields Bot
        addWall(2150, 1900, 2150, 2050); // Comms Right
        addWall(2150, 2050, 1800, 2050); // Comms Bot
        addWall(1800, 2050, 1800, 1920); // Comms Left
        addWall(1800, 1920, 1400, 1920); // Storage Bot
        addWall(1400, 1920, 1400, 1750);
        addWall(1400, 1750, 650, 1750);  // Lower Engine Bot
        addWall(650, 1750, 300, 1450);   // Lower Eng -> Reactor
        addWall(300, 1450, 300, 900);    // Reactor Far Left
        addWall(300, 900, 650, 500);     // Reactor -> Upper Eng
        addWall(650, 500, 1080, 500);    // Upper Eng Top
        addWall(1080, 500, 1080, 580);
        addWall(1080, 580, 1300, 380);   // Upper Eng -> Medbay -> Cafe

        // Cafeteria Inner walls
        addWall(1350, 720, 1500, 720);
        addWall(1700, 720, 2000, 720);
        addWall(1350, 380, 1350, 720);
        addWall(2000, 380, 2000, 720);

        // MedBay & Security walls
        addWall(1080, 580, 1080, 800);
        addWall(1080, 800, 1320, 800);
        addWall(1320, 580, 1320, 800);

        addWall(950, 820, 1200, 820);
        addWall(950, 1040, 1200, 1040);
        addWall(950, 820, 950, 1040);

        // Electrical walls
        addWall(1020, 1120, 1340, 1120);
        addWall(1020, 1400, 1340, 1400);
        addWall(1020, 1120, 1020, 1400);
        addWall(1340, 1120, 1340, 1260); // Doorway gap
        addWall(1340, 1320, 1340, 1400);

        // Admin & O2 walls
        addWall(2050, 800, 2300, 800);
        addWall(2050, 1040, 2300, 1040);
        addWall(2050, 800, 2050, 1040);

        addWall(2020, 1180, 2350, 1180);
        addWall(2020, 1450, 2350, 1450);
        addWall(2020, 1180, 2020, 1450);

        // Storage & Hallways
        addWall(1400, 1380, 1800, 1380);
        addWall(1400, 1380, 1400, 1750);
        addWall(1800, 1380, 1800, 1750);

        // Reactor walls
        addWall(550, 950, 550, 1380);
        addWall(300, 950, 550, 950);
        addWall(300, 1380, 550, 1380);

        // Upper & Lower Engines
        addWall(650, 520, 960, 520);
        addWall(650, 800, 960, 800);
        addWall(650, 520, 650, 800);

        addWall(650, 1480, 960, 1480);
        addWall(650, 1740, 960, 1740);
        addWall(650, 1480, 650, 1740);

        // Weapons & Shields
        addWall(2200, 480, 2550, 480);
        addWall(2200, 720, 2550, 720);
        addWall(2550, 480, 2550, 720);

        addWall(2200, 1550, 2550, 1550);
        addWall(2200, 1800, 2550, 1800);
        addWall(2550, 1550, 2550, 1800);
    }

    // Check circular collision against walls and resolve position
    resolvePlayerCollision(x, y, radius) {
        let newX = x;
        let newY = y;

        for (const wall of this.walls) {
            const nearest = this.getClosestPointOnSegment(newX, newY, wall.x1, wall.y1, wall.x2, wall.y2);
            const dist = Math.hypot(newX - nearest.x, newY - nearest.y);

            if (dist < radius) {
                const overlap = radius - dist;
                if (dist > 0.001) {
                    const nx = (newX - nearest.x) / dist;
                    const ny = (newY - nearest.y) / dist;
                    newX += nx * overlap;
                    newY += ny * overlap;
                } else {
                    newX += overlap;
                }
            }
        }
        return { x: newX, y: newY };
    }

    getClosestPointOnSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return { x: x1, y: y1 };

        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));

        return {
            x: x1 + t * dx,
            y: y1 + t * dy
        };
    }

    // Find which room a point is in
    getRoomAt(x, y) {
        for (const room of this.rooms) {
            if (x >= room.x - room.w / 2 && x <= room.x + room.w / 2 &&
                y >= room.y - room.h / 2 && y <= room.y + room.h / 2) {
                return room;
            }
        }
        return { id: 'hallway', name: 'Koridor' };
    }

    // Render the entire map onto canvas
    render(ctx, camera, activeTask = null, isImpostor = false) {
        ctx.save();

        // 1. Draw Space & Starfield background
        this.renderSpaceBackground(ctx, camera);

        // 2. Draw Floor Plates & Rooms
        this.renderFloorLayout(ctx, camera);

        // 3. Draw Room Furniture, Emergency Table, Engine Cores, Consoles
        this.renderFurniture(ctx, camera);

        // 4. Draw Vents
        this.renderVents(ctx, camera, isImpostor);

        // 5. Draw Task Interactable Highlights
        this.renderTaskHighlights(ctx, camera, activeTask);

        // 6. Draw Walls with 3D Depth Edges
        this.renderWalls(ctx, camera);

        // 7. Draw Room Text Labels
        this.renderRoomLabels(ctx, camera);

        ctx.restore();
    }

    renderSpaceBackground(ctx, camera) {
        // Deep space fill
        ctx.fillStyle = '#060914';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Parallax stars
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        for (let i = 0; i < 70; i++) {
            const sx = ((i * 137.5 + camera.x * 0.04) % ctx.canvas.width + ctx.canvas.width) % ctx.canvas.width;
            const sy = ((i * 219.3 + camera.y * 0.04) % ctx.canvas.height + ctx.canvas.height) % ctx.canvas.height;
            const size = (i % 3) + 1;
            ctx.fillRect(sx, sy, size, size);
        }
    }

    renderFloorLayout(ctx, camera) {
        // Draw Room Base Tiles with rich sci-fi metallic colors
        for (const room of this.rooms) {
            const screen = camera.worldToScreen(room.x - room.w / 2, room.y - room.h / 2);
            const w = room.w;
            const h = room.h;

            if (screen.x + w < -100 || screen.x > ctx.canvas.width + 100 ||
                screen.y + h < -100 || screen.y > ctx.canvas.height + 100) {
                continue; // Culling
            }

            // Room Floor Base
            ctx.fillStyle = room.color || '#26344d';
            ctx.fillRect(screen.x, screen.y, w, h);

            // Metal tile grid lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 2;
            const tileSize = 60;
            for (let tx = 0; tx < w; tx += tileSize) {
                ctx.beginPath();
                ctx.moveTo(screen.x + tx, screen.y);
                ctx.lineTo(screen.x + tx, screen.y + h);
                ctx.stroke();
            }
            for (let ty = 0; ty < h; ty += tileSize) {
                ctx.beginPath();
                ctx.moveTo(screen.x, screen.y + ty);
                ctx.lineTo(screen.x + w, screen.y + ty);
                ctx.stroke();
            }
        }

        // Draw connecting hallways
        this.renderHallways(ctx, camera);
    }

    renderHallways(ctx, camera) {
        ctx.fillStyle = '#1d273a';
        const hallways = [
            { x: 1600, y: 1050, w: 180, h: 680 }, // Main Central Hallway
            { x: 1950, y: 650, w: 500, h: 140 },  // Cafe to Weapons
            { x: 2350, y: 1000, w: 140, h: 560 }, // Weapons to Shields Hall
            { x: 1250, y: 1650, w: 520, h: 140 }, // Storage to Lower Eng
            { x: 600, y: 1150, w: 180, h: 620 },  // Reactor to Engines
            { x: 1250, y: 720, w: 520, h: 120 }   // Cafe to MedBay/Upper Eng
        ];

        for (const hall of hallways) {
            const s = camera.worldToScreen(hall.x - hall.w / 2, hall.y - hall.h / 2);
            ctx.fillRect(s.x, s.y, hall.w, hall.h);

            // Hallway center line pattern
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.lineWidth = 2;
            ctx.strokeRect(s.x + 4, s.y + 4, hall.w - 8, hall.h - 8);
        }
    }

    renderFurniture(ctx, camera) {
        // 1. Cafeteria Table with Emergency Button
        const cafeTable = camera.worldToScreen(1600, 530);
        
        // Outer table shadow & rim
        ctx.fillStyle = '#141c2c';
        ctx.strokeStyle = '#384d73';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(cafeTable.x, cafeTable.y, 85, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner table top
        ctx.fillStyle = '#223049';
        ctx.beginPath();
        ctx.arc(cafeTable.x, cafeTable.y, 75, 0, Math.PI * 2);
        ctx.fill();

        // Table center glass case
        ctx.fillStyle = 'rgba(0, 210, 255, 0.2)';
        ctx.strokeStyle = '#00d2ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cafeTable.x, cafeTable.y, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Big Red Emergency Button
        ctx.fillStyle = '#e62424';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cafeTable.x, cafeTable.y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('EMERGENCY', cafeTable.x, cafeTable.y);

        // 2. Reactor Core
        const reactorCore = camera.worldToScreen(420, 1120);
        const time = Date.now() * 0.003;
        const pulse = 1 + Math.sin(time) * 0.1;
        ctx.fillStyle = 'rgba(255, 50, 80, 0.25)';
        ctx.beginPath();
        ctx.arc(reactorCore.x, reactorCore.y, 65 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1b1b24';
        ctx.strokeStyle = '#ff3366';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(reactorCore.x, reactorCore.y, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 3. MedBay Scanner Pad
        const medScanner = camera.worldToScreen(1220, 720);
        ctx.fillStyle = '#182836';
        ctx.strokeStyle = '#00f2c3';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(medScanner.x, medScanner.y, 42, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Scanner holographic rings
        ctx.strokeStyle = 'rgba(0, 242, 195, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(medScanner.x, medScanner.y, 24 + Math.sin(time * 2) * 10, 0, Math.PI * 2);
        ctx.stroke();

        // 4. Admin Table
        const adminTable = camera.worldToScreen(2150, 1320);
        ctx.fillStyle = '#182338';
        ctx.strokeStyle = '#2b78c9';
        ctx.lineWidth = 4;
        ctx.fillRect(adminTable.x - 55, adminTable.y - 35, 110, 70);
        ctx.strokeRect(adminTable.x - 55, adminTable.y - 35, 110, 70);
        ctx.fillStyle = '#00d2ff';
        ctx.font = 'bold 11px Orbitron';
        ctx.fillText('ADMIN RADAR', adminTable.x, adminTable.y);

        // 5. Security Monitors
        const secScreen = camera.worldToScreen(1120, 920);
        ctx.fillStyle = '#111824';
        ctx.strokeStyle = '#ff3366';
        ctx.lineWidth = 3;
        ctx.fillRect(secScreen.x - 40, secScreen.y - 30, 80, 60);
        ctx.strokeRect(secScreen.x - 40, secScreen.y - 30, 80, 60);
        ctx.fillStyle = '#ff3366';
        ctx.font = 'bold 10px Orbitron';
        ctx.fillText('CAMERAS', secScreen.x, secScreen.y);
    }

    renderVents(ctx, camera, isImpostor) {
        for (const vent of this.vents) {
            const s = camera.worldToScreen(vent.x, vent.y);
            ctx.fillStyle = '#101520';
            ctx.strokeStyle = isImpostor ? '#a855f7' : '#3d4d68';
            ctx.lineWidth = isImpostor ? 3.5 : 2;

            ctx.fillRect(s.x - 22, s.y - 15, 44, 30);
            ctx.strokeRect(s.x - 22, s.y - 15, 44, 30);

            // Grate lines
            ctx.strokeStyle = isImpostor ? 'rgba(168, 85, 247, 0.8)' : '#536582';
            ctx.lineWidth = 2;
            for (let gx = -14; gx <= 14; gx += 7) {
                ctx.beginPath();
                ctx.moveTo(s.x + gx, s.y - 10);
                ctx.lineTo(s.x + gx, s.y + 10);
                ctx.stroke();
            }
        }
    }

    renderTaskHighlights(ctx, camera, activeTask) {
        const time = Date.now() * 0.005;
        for (const task of this.tasks) {
            const s = camera.worldToScreen(task.x, task.y);

            // Glowing yellow console panel for tasks
            ctx.fillStyle = '#202d3d';
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 3;
            ctx.fillRect(s.x - 18, s.y - 18, 36, 36);
            ctx.strokeRect(s.x - 18, s.y - 18, 36, 36);

            // Pulsing screen on console
            ctx.fillStyle = task === activeTask ? '#00f2c3' : '#f59e0b';
            ctx.fillRect(s.x - 10, s.y - 10, 20, 20);

            if (task === activeTask) {
                // Interactive yellow aura
                ctx.strokeStyle = `rgba(245, 158, 11, ${0.5 + Math.sin(time) * 0.3})`;
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(s.x, s.y, 35, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    renderWalls(ctx, camera) {
        ctx.strokeStyle = '#0d131f';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';

        // Outer dark wall shadow
        for (const wall of this.walls) {
            const p1 = camera.worldToScreen(wall.x1, wall.y1);
            const p2 = camera.worldToScreen(wall.x2, wall.y2);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }

        // Inner glowing border line
        ctx.strokeStyle = '#435882';
        ctx.lineWidth = 6;
        for (const wall of this.walls) {
            const p1 = camera.worldToScreen(wall.x1, wall.y1);
            const p2 = camera.worldToScreen(wall.x2, wall.y2);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
    }

    renderRoomLabels(ctx, camera) {
        ctx.font = 'bold 15px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';

        for (const room of this.rooms) {
            const s = camera.worldToScreen(room.x, room.y);
            ctx.fillText(room.name.toUpperCase(), s.x, s.y);
        }
    }
}

window.ShipMap = ShipMap;
