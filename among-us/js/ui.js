/* ===================================================
   AMONG US UI & INPUT CONTROLLER
   HUD action buttons, keyboards, touch joystick, maps, cams, admin
   =================================================== */

class UIController {
    constructor(game) {
        this.game = game;

        // Action HUD Buttons
        this.btnReport = document.getElementById('btn-report');
        this.btnUse = document.getElementById('btn-use');
        this.btnKill = document.getElementById('btn-kill');
        this.btnVent = document.getElementById('btn-vent');
        this.btnSabotage = document.getElementById('btn-sabotage');
        this.btnMap = document.getElementById('btn-map');
        this.killTimerEl = document.getElementById('kill-timer');

        // Modals
        this.mapModal = document.getElementById('map-modal');
        this.camsModal = document.getElementById('cams-modal');
        this.adminModal = document.getElementById('admin-modal');
        this.closeMapBtn = document.getElementById('close-map-btn');
        this.closeCamsBtn = document.getElementById('close-cams-btn');
        this.closeAdminBtn = document.getElementById('close-admin-btn');

        // Top Task Bar
        this.taskBarInner = document.getElementById('task-bar-inner');
        this.taskListContainer = document.getElementById('task-items');

        this.keys = {};
        this.joystickVector = { x: 0, y: 0 };

        this.setupKeyboard();
        this.setupActionButtons();
        this.setupVirtualJoystick();
        this.setupTopControls();
    }

    setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
            this.keys[e.code] = true;

            // Hotkeys
            if (e.code === 'KeyE' || e.code === 'Space') {
                this.handleUseAction();
            } else if (e.code === 'KeyQ') {
                this.handleKillAction();
            } else if (e.code === 'KeyR') {
                this.handleReportAction();
            } else if (e.code === 'KeyV') {
                this.handleVentAction();
            } else if (e.code === 'Tab') {
                e.preventDefault();
                this.handleSabotageAction();
            } else if (e.code === 'KeyM') {
                this.toggleMap();
            } else if (e.code === 'Escape') {
                this.closeAllModals();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    setupActionButtons() {
        this.btnUse.addEventListener('click', () => this.handleUseAction());
        this.btnKill.addEventListener('click', () => this.handleKillAction());
        this.btnReport.addEventListener('click', () => this.handleReportAction());
        this.btnVent.addEventListener('click', () => this.handleVentAction());
        this.btnSabotage.addEventListener('click', () => this.handleSabotageAction());
        this.btnMap.addEventListener('click', () => this.toggleMap());

        this.closeMapBtn.addEventListener('click', () => this.mapModal.classList.add('hidden'));
        this.closeCamsBtn.addEventListener('click', () => this.camsModal.classList.add('hidden'));
        this.closeAdminBtn.addEventListener('click', () => this.adminModal.classList.add('hidden'));
    }

    setupTopControls() {
        const soundBtn = document.getElementById('btn-sound-toggle');
        soundBtn.addEventListener('click', () => {
            const enabled = window.audio.toggleSound();
            soundBtn.textContent = enabled ? '🔊' : '🔇';
        });

        const fullBtn = document.getElementById('btn-fullscreen');
        fullBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        });
    }

    setupVirtualJoystick() {
        const joystickEl = document.getElementById('virtual-joystick');
        const thumbEl = document.getElementById('joystick-thumb');
        const baseEl = document.getElementById('joystick-base');

        let isTouch = false;
        const maxRadius = 40;

        const onTouchStart = (clientX, clientY) => {
            isTouch = true;
            onTouchMove(clientX, clientY);
        };

        const onTouchMove = (clientX, clientY) => {
            if (!isTouch) return;
            const rect = baseEl.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            let dx = clientX - centerX;
            let dy = clientY - centerY;
            const dist = Math.hypot(dx, dy);

            if (dist > maxRadius) {
                dx = (dx / dist) * maxRadius;
                dy = (dy / dist) * maxRadius;
            }

            thumbEl.style.transform = `translate(${dx}px, ${dy}px)`;
            this.joystickVector.x = dx / maxRadius;
            this.joystickVector.y = dy / maxRadius;
        };

        const onTouchEnd = () => {
            isTouch = false;
            thumbEl.style.transform = 'translate(0px, 0px)';
            this.joystickVector.x = 0;
            this.joystickVector.y = 0;
        };

        baseEl.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            onTouchStart(t.clientX, t.clientY);
        });

        window.addEventListener('touchmove', (e) => {
            if (isTouch) {
                const t = e.touches[0];
                onTouchMove(t.clientX, t.clientY);
            }
        });

        window.addEventListener('touchend', onTouchEnd);
    }

    getMovementInput() {
        let x = 0;
        let y = 0;

        if (this.keys['KeyW'] || this.keys['ArrowUp']) y -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) y += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;

        if (this.joystickVector.x !== 0 || this.joystickVector.y !== 0) {
            x = this.joystickVector.x;
            y = this.joystickVector.y;
        }

        const len = Math.hypot(x, y);
        if (len > 1) {
            x /= len;
            y /= len;
        }

        return { x, y };
    }

    updateHUD(player, nearbyTask, nearbyConsole, nearbyBody, nearbyVictim, nearbyVent, totalTasks, completedTasks) {
        if (!player) return;

        // 1. Task Progress Bar
        const pct = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        this.taskBarInner.style.width = `${pct}%`;

        // 2. Use Button State
        const canUse = (nearbyTask && !player.isDead) || nearbyConsole || (this.game.sabotageManager.activeSabotage && this.game.isNearSabotageStation(player));
        if (canUse) {
            this.btnUse.classList.remove('disabled');
        } else {
            this.btnUse.classList.add('disabled');
        }

        // 3. Report Button State
        if (nearbyBody && !player.isDead) {
            this.btnReport.classList.remove('disabled');
        } else {
            this.btnReport.classList.add('disabled');
        }

        // 4. Impostor Specific Buttons
        if (player.isImpostor) {
            this.btnKill.classList.remove('hidden');
            this.btnVent.classList.remove('hidden');
            this.btnSabotage.classList.remove('hidden');

            // Kill cooldown display
            if (player.killCooldown > 0) {
                this.killTimerEl.textContent = Math.ceil(player.killCooldown);
                this.killTimerEl.classList.remove('hidden');
                this.btnKill.classList.add('disabled');
            } else {
                this.killTimerEl.classList.add('hidden');
                if (nearbyVictim && !player.isDead && !player.inVent) {
                    this.btnKill.classList.remove('disabled');
                } else {
                    this.btnKill.classList.add('disabled');
                }
            }

            // Vent Button
            if (nearbyVent || player.inVent) {
                this.btnVent.classList.remove('disabled');
            } else {
                this.btnVent.classList.add('disabled');
            }
        } else {
            this.btnKill.classList.add('hidden');
            this.btnVent.classList.add('hidden');
            this.btnSabotage.classList.add('hidden');
        }
    }

    updateTaskList(tasks, completedList) {
        this.taskListContainer.innerHTML = tasks.map(t => {
            const isDone = completedList.includes(t.id);
            return `<li class="${isDone ? 'done' : ''}">${t.name}</li>`;
        }).join('');
    }

    handleUseAction() {
        this.game.onUsePressed();
    }

    handleKillAction() {
        this.game.onKillPressed();
    }

    handleReportAction() {
        this.game.onReportPressed();
    }

    handleVentAction() {
        this.game.onVentPressed();
    }

    handleSabotageAction() {
        if (this.game.localPlayer && this.game.localPlayer.isImpostor) {
            this.game.sabotageManager.openSabotageMenu();
        }
    }

    toggleMap() {
        if (this.mapModal.classList.contains('hidden')) {
            this.mapModal.classList.remove('hidden');
            this.renderFullMap();
        } else {
            this.mapModal.classList.add('hidden');
        }
    }

    renderFullMap() {
        const canvas = document.getElementById('map-canvas');
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = '#0a101d';
        ctx.fillRect(0, 0, w, h);

        // Draw Ship Outline
        ctx.strokeStyle = '#283c5e';
        ctx.lineWidth = 4;
        ctx.strokeRect(40, 30, w - 80, h - 60);

        // Draw Rooms
        for (const r of CONFIG.ROOMS) {
            const rx = (r.x / CONFIG.MAP_WIDTH) * w;
            const ry = (r.y / CONFIG.MAP_HEIGHT) * h;
            const rw = (r.w / CONFIG.MAP_WIDTH) * w;
            const rh = (r.h / CONFIG.MAP_HEIGHT) * h;

            ctx.fillStyle = '#182438';
            ctx.strokeStyle = '#39537d';
            ctx.lineWidth = 2;
            ctx.fillRect(rx - rw / 2, ry - rh / 2, rw, rh);
            ctx.strokeRect(rx - rw / 2, ry - rh / 2, rw, rh);

            ctx.fillStyle = '#8fa3c7';
            ctx.font = 'bold 9px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText(r.name, rx, ry + 3);
        }

        // Draw Player Location Icon
        if (this.game.localPlayer) {
            const px = (this.game.localPlayer.x / CONFIG.MAP_WIDTH) * w;
            const py = (this.game.localPlayer.y / CONFIG.MAP_HEIGHT) * h;

            ctx.fillStyle = '#ff3366';
            ctx.beginPath();
            ctx.arc(px, py, 7, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw Task Exclamation Marks (!)
        if (this.game.localPlayer && !this.game.localPlayer.isImpostor) {
            for (const t of this.game.localPlayer.tasks) {
                if (!this.game.completedTaskIds.includes(t.id)) {
                    const tx = (t.x / CONFIG.MAP_WIDTH) * w;
                    const ty = (t.y / CONFIG.MAP_HEIGHT) * h;

                    ctx.fillStyle = '#f8c21a';
                    ctx.font = 'bold 14px Orbitron';
                    ctx.fillText('!', tx, ty - 6);
                }
            }
        }
    }

    openSecurityCameras() {
        this.camsModal.classList.remove('hidden');
    }

    openAdminRadar() {
        this.adminModal.classList.remove('hidden');
        this.renderAdminRadar();
    }

    renderAdminRadar() {
        const canvas = document.getElementById('admin-canvas');
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = '#060a12';
        ctx.fillRect(0, 0, w, h);

        // Count players in each room
        const counts = {};
        for (const p of this.game.players) {
            if (p.isDead) continue;
            const room = this.game.shipMap.getRoomAt(p.x, p.y);
            counts[room.id] = (counts[room.id] || 0) + 1;
        }

        // Render Rooms with Bean Counters
        for (const r of CONFIG.ROOMS) {
            const rx = (r.x / CONFIG.MAP_WIDTH) * w;
            const ry = (r.y / CONFIG.MAP_HEIGHT) * h;
            const rw = (r.w / CONFIG.MAP_WIDTH) * w;
            const rh = (r.h / CONFIG.MAP_HEIGHT) * h;

            ctx.fillStyle = '#141d2e';
            ctx.strokeStyle = '#00d2ff';
            ctx.lineWidth = 2;
            ctx.fillRect(rx - rw / 2, ry - rh / 2, rw, rh);
            ctx.strokeRect(rx - rw / 2, ry - rh / 2, rw, rh);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText(r.name, rx, ry - 10);

            // Display count
            const num = counts[r.id] || 0;
            ctx.fillStyle = num > 0 ? '#38ef7d' : '#555';
            ctx.font = 'bold 18px Orbitron';
            ctx.fillText(`${num} 👤`, rx, ry + 12);
        }
    }

    closeAllModals() {
        this.mapModal.classList.add('hidden');
        this.camsModal.classList.add('hidden');
        this.adminModal.classList.add('hidden');
        this.game.sabotageManager.closeSabotageMenu();
        this.game.taskManager.closeTask();
    }
}

window.UIController = UIController;
