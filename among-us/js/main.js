/* ===================================================
   AMONG US MASTER GAME ENGINE (THE SKELD)
   State machine, camera, loop, interactions, win/loss
   =================================================== */

class AmongUsGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.state = 'LOBBY'; // 'LOBBY', 'ROLE_REVEAL', 'PLAYING', 'MEETING', 'EJECTION', 'GAME_OVER'
        this.lastTime = 0;

        // Customization Settings
        this.playerName = 'Oyuncu';
        this.selectedColorId = 'red';
        this.selectedHatId = 'tophat';
        this.rolePreference = 'random';
        this.playerCount = 8;
        this.impostorCount = 1;
        this.playerSpeedMult = 1.5;
        this.killCooldownSetting = 25;
        this.fogOfWarEnabled = true;

        // Systems
        this.shipMap = new ShipMap();
        this.lighting = new LightingEngine();
        this.lighting.setWalls(this.shipMap.walls);

        this.taskManager = new TaskManager((completedTask) => this.onTaskDone(completedTask));
        this.sabotageManager = new SabotageManager(
            (type) => this.onSabotageStarted(type),
            (type) => this.onSabotageEnded(type),
            (type) => this.triggerImpostorVictory('sabotage')
        );
        this.votingSystem = new VotingSystem((ejectedPlayer) => this.onEjectionFinished(ejectedPlayer));
        this.botAI = new BotAIController(this.shipMap, this.sabotageManager, this.taskManager);
        this.ui = new UIController(this);

        // Entities
        this.players = [];
        this.localPlayer = null;
        this.completedTaskIds = [];
        this.totalRequiredTasks = 0;
        this.completedTasksCount = 0;

        // Camera
        this.camera = {
            x: 1600,
            y: 600,
            worldToScreen: (wx, wy) => ({
                x: wx - this.camera.x + this.canvas.width / 2,
                y: wy - this.camera.y + this.canvas.height / 2
            })
        };

        this.initCanvasResize();
        this.initLobbyCustomizer();
        this.startGameLoop();
    }

    initCanvasResize() {
        const resize = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();
    }

    initLobbyCustomizer() {
        // Color Palette
        const palette = document.getElementById('color-palette');
        palette.innerHTML = CONFIG.COLORS.map(c => `
            <div class="color-dot ${c.id === this.selectedColorId ? 'selected' : ''}" 
                 data-color="${c.id}" 
                 style="background-color: ${c.hex};" 
                 title="${c.name}"></div>
        `).join('');

        palette.querySelectorAll('.color-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                palette.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
                dot.classList.add('selected');
                this.selectedColorId = dot.getAttribute('data-color');
                this.renderLobbyPreview();
            });
        });

        // Hat Palette
        const hatPalette = document.getElementById('hat-palette');
        hatPalette.innerHTML = CONFIG.HATS.map(h => `
            <button class="hat-item-btn ${h.id === this.selectedHatId ? 'selected' : ''}" 
                    data-hat="${h.id}" 
                    title="${h.name}">${h.icon}</button>
        `).join('');

        hatPalette.querySelectorAll('.hat-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                hatPalette.querySelectorAll('.hat-item-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.selectedHatId = btn.getAttribute('data-hat');
                this.renderLobbyPreview();
            });
        });

        // Name Input
        const nameInput = document.getElementById('player-name-input');
        nameInput.addEventListener('input', (e) => {
            this.playerName = e.target.value || 'Oyuncu';
            this.renderLobbyPreview();
        });

        // Settings Sliders
        const setupSlider = (id, valId, callback, suffix = '') => {
            const el = document.getElementById(id);
            const valEl = document.getElementById(valId);
            el.addEventListener('input', () => {
                valEl.textContent = `${el.value}${suffix}`;
                callback(parseFloat(el.value));
            });
        };

        setupSlider('setting-players', 'val-players', (v) => this.playerCount = v);
        setupSlider('setting-impostors', 'val-impostors', (v) => this.impostorCount = v);
        setupSlider('setting-speed', 'val-speed', (v) => this.playerSpeedMult = v, 'x');
        setupSlider('setting-kill-cd', 'val-kill-cd', (v) => this.killCooldownSetting = v, 's');

        // Role Preference Buttons
        const roleBtns = document.querySelectorAll('.role-opt-btn');
        roleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                roleBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.rolePreference = btn.getAttribute('data-role');
            });
        });

        // Fog of War Toggle
        document.getElementById('setting-fog').addEventListener('change', (e) => {
            this.fogOfWarEnabled = e.target.checked;
        });

        // Start Button
        document.getElementById('btn-start-game').addEventListener('click', () => {
            window.audio.init();
            this.startMatch();
        });

        // Play Again Button
        document.getElementById('btn-play-again').addEventListener('click', () => {
            document.getElementById('endgame-modal').classList.add('hidden');
            document.getElementById('lobby-modal').classList.remove('hidden');
            this.state = 'LOBBY';
        });

        this.renderLobbyPreview();
    }

    renderLobbyPreview() {
        const previewCanvas = document.getElementById('lobby-preview-canvas');
        if (!previewCanvas) return;
        const ctx = previewCanvas.getContext('2d');
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

        const dummy = new Player('preview', this.playerName, this.selectedColorId, this.selectedHatId);
        dummy.x = previewCanvas.width / 2;
        dummy.y = previewCanvas.height / 2 + 10;

        const fakeCam = {
            worldToScreen: (wx, wy) => ({ x: wx, y: wy })
        };
        dummy.render(ctx, fakeCam, true, false);
    }

    startMatch() {
        document.getElementById('lobby-modal').classList.add('hidden');
        this.state = 'ROLE_REVEAL';

        // 1. Generate Players & Assign Roles
        this.players = [];
        this.completedTaskIds = [];
        this.completedTasksCount = 0;

        const colors = [...CONFIG.COLORS].filter(c => c.id !== this.selectedColorId);
        const botNames = ['Kırmızı', 'Mavi', 'Yeşil', 'Mandalina', 'Sarı', 'Siyah', 'Beyaz', 'Mor', 'Siyan', 'Fıstık'];

        // Determine if local player is Impostor
        let localIsImpostor = false;
        if (this.rolePreference === 'impostor') {
            localIsImpostor = true;
        } else if (this.rolePreference === 'crewmate') {
            localIsImpostor = false;
        } else {
            localIsImpostor = Math.random() < (this.impostorCount / this.playerCount);
        }

        // Create Local Player
        this.localPlayer = new Player('local_player', this.playerName, this.selectedColorId, this.selectedHatId, localIsImpostor, false);
        this.localPlayer.speed = CONFIG.BASE_SPEED * this.playerSpeedMult;
        this.localPlayer.killCooldown = this.killCooldownSetting;
        this.players.push(this.localPlayer);

        // Create AI Bots
        let neededImpostors = this.impostorCount - (localIsImpostor ? 1 : 0);

        for (let i = 1; i < this.playerCount; i++) {
            const bColor = colors[i % colors.length];
            const bHat = CONFIG.HATS[Math.floor(Math.random() * CONFIG.HATS.length)].id;
            const bName = botNames[i % botNames.length];

            const isImpostor = neededImpostors > 0;
            if (isImpostor) neededImpostors--;

            const bot = new Player(`bot_${i}`, bName, bColor.id, bHat, isImpostor, true);
            bot.speed = CONFIG.BASE_SPEED * this.playerSpeedMult;
            bot.killCooldown = this.killCooldownSetting;

            // Spawn at cafeteria table
            const angle = (i / this.playerCount) * Math.PI * 2;
            bot.x = 1600 + Math.cos(angle) * 120;
            bot.y = 550 + Math.sin(angle) * 120;

            this.players.push(bot);
        }

        // Assign 4 Tasks to Crewmates
        const crewmates = this.players.filter(p => !p.isImpostor);
        crewmates.forEach(crew => {
            crew.tasks = [...CONFIG.TASKS_DATA].sort(() => Math.random() - 0.5).slice(0, 4);
        });

        this.totalRequiredTasks = crewmates.length * 4;
        this.ui.updateTaskList(this.localPlayer.tasks || [], this.completedTaskIds);

        // Center camera directly on local player
        this.camera.x = this.localPlayer.x;
        this.camera.y = this.localPlayer.y;

        // Reset sabotage states & grace period
        this.sabotageManager.activeSabotage = null;
        this.sabotageManager.cooldown = 40;
        this.sabotageManager.alertBanner.classList.add('hidden');
        window.audio.stopSabotageAlarm();
        if (this.botAI) {
            this.botAI.globalSabotageTimer = 50;
            this.botAI.botStates.clear();
        }

        // Show Role Reveal Screen
        this.showRoleRevealScreen();
    }

    showRoleRevealScreen() {
        const modal = document.getElementById('role-reveal-modal');
        const title = document.getElementById('role-title');
        const subtitle = document.getElementById('role-subtitle');
        const impostorCountSpan = document.getElementById('role-impostor-count');
        const teammateList = document.getElementById('role-teammates');
        const roleCanvas = document.getElementById('role-canvas');
        const ctx = roleCanvas.getContext('2d');

        modal.classList.remove('hidden');
        impostorCountSpan.textContent = this.impostorCount;

        if (this.localPlayer.isImpostor) {
            title.textContent = 'IMPOSTOR';
            title.className = 'role-title-text impostor';
            subtitle.textContent = 'Mürettebatı Gizlice Avla ve Gemiyi Sabote Et!';

            const impostorTeammates = this.players.filter(p => p.isImpostor && p !== this.localPlayer);
            if (impostorTeammates.length > 0) {
                teammateList.textContent = `Ortak Sahtekarlar: ${impostorTeammates.map(t => t.name).join(', ')}`;
            } else {
                teammateList.textContent = '';
            }
        } else {
            title.textContent = 'CREWMATE';
            title.className = 'role-title-text crewmate';
            subtitle.textContent = `Aramızda ${this.impostorCount} Sahtekar Var!`;
            teammateList.textContent = '';
        }

        // Draw Player on Role Reveal Canvas
        ctx.clearRect(0, 0, roleCanvas.width, roleCanvas.height);
        const dummy = new Player('reveal', this.playerName, this.selectedColorId, this.selectedHatId);
        dummy.x = roleCanvas.width / 2;
        dummy.y = roleCanvas.height / 2 + 10;
        const fakeCam = { worldToScreen: (wx, wy) => ({ x: wx, y: wy }) };
        dummy.render(ctx, fakeCam, true, this.localPlayer.isImpostor);

        // Auto transition to playing
        setTimeout(() => {
            modal.classList.add('hidden');
            document.getElementById('task-bar-container').classList.remove('hidden');
            document.getElementById('task-list').classList.remove('hidden');
            document.getElementById('action-hud').classList.remove('hidden');
            this.state = 'PLAYING';
        }, 3000);
    }

    startGameLoop() {
        const loop = (timestamp) => {
            if (!this.lastTime) this.lastTime = timestamp;
            const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1);
            this.lastTime = timestamp;

            this.update(deltaTime);
            this.render();

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    update(deltaTime) {
        if (this.state !== 'PLAYING') return;

        // 1. Update Movement for Local Player
        const move = this.ui.getMovementInput();
        this.localPlayer.vx = move.x;
        this.localPlayer.vy = move.y;

        // Footstep audio
        if (this.localPlayer.isMoving && Math.random() < 0.12) {
            window.audio.playStep();
        }

        // 2. Update all players & AI
        for (const p of this.players) {
            p.update(deltaTime, this.shipMap);
        }

        // 3. Update AI Bots
        this.botAI.updateBots(
            deltaTime,
            this.players,
            (reporter, deadBody) => this.triggerMeeting('dead_body', reporter, deadBody),
            (bot) => this.onBotCompletedTask(bot)
        );

        // 4. Update Sabotages
        this.sabotageManager.update(deltaTime);

        // 5. Update Camera Target (Smooth Interpolation)
        this.camera.x += (this.localPlayer.x - this.camera.x) * 0.1;
        this.camera.y += (this.localPlayer.y - this.camera.y) * 0.1;

        // 6. Check Proximities for HUD
        this.updateProximityChecks();

        // 7. Check Victory/Defeat Conditions
        this.checkWinConditions();
    }

    updateProximityChecks() {
        const p = this.localPlayer;
        if (!p) return;

        // Check nearby task
        let nearbyTask = null;
        if (!p.isImpostor && p.tasks) {
            for (const task of p.tasks) {
                if (!this.completedTaskIds.includes(task.id)) {
                    if (Math.hypot(p.x - task.x, p.y - task.y) < 60) {
                        nearbyTask = task;
                        break;
                    }
                }
            }
        }
        this.activeNearbyTask = nearbyTask;

        // Check nearby console (Emergency, Cams, Admin)
        let nearbyConsole = null;
        for (const con of CONFIG.CONSOLES) {
            if (Math.hypot(p.x - con.x, p.y - con.y) < con.radius + 20) {
                nearbyConsole = con;
                break;
            }
        }
        this.activeNearbyConsole = nearbyConsole;

        // Check nearby dead body to report
        let nearbyBody = null;
        for (const other of this.players) {
            if (other.isDead && !other.reported) {
                if (Math.hypot(p.x - other.deadBodyX, p.y - other.deadBodyY) < 80) {
                    nearbyBody = other;
                    break;
                }
            }
        }
        this.activeNearbyBody = nearbyBody;

        // Check nearby victim to kill (if Impostor)
        let nearbyVictim = null;
        if (p.isImpostor && !p.isDead && !p.inVent) {
            let closestDist = CONFIG.KILL_DISTANCE;
            for (const other of this.players) {
                if (other !== p && !other.isDead && !other.isImpostor) {
                    const dist = Math.hypot(p.x - other.x, p.y - other.y);
                    if (dist < closestDist) {
                        closestDist = dist;
                        nearbyVictim = other;
                    }
                }
            }
        }
        this.activeNearbyVictim = nearbyVictim;

        // Check nearby vent
        let nearbyVent = null;
        if (p.isImpostor) {
            for (const v of CONFIG.VENTS) {
                if (Math.hypot(p.x - v.x, p.y - v.y) < 55) {
                    nearbyVent = v;
                    break;
                }
            }
        }
        this.activeNearbyVent = nearbyVent;

        // Update UI Button states
        this.ui.updateHUD(
            p,
            nearbyTask,
            nearbyConsole,
            nearbyBody,
            nearbyVictim,
            nearbyVent,
            this.totalRequiredTasks,
            this.completedTasksCount
        );
    }

    render() {
        if (this.state === 'LOBBY') return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Draw Map & Floor layout
        this.shipMap.render(this.ctx, this.camera, this.activeNearbyTask, this.localPlayer.isImpostor);

        // 2. Draw Dead Bodies
        for (const p of this.players) {
            p.renderDeadBody(this.ctx, this.camera);
        }

        // 3. Draw Players (Sorted by Y for depth layering)
        const sortedPlayers = [...this.players].sort((a, b) => a.y - b.y);
        for (const p of sortedPlayers) {
            if (p.isDead && !p.isGhost) continue;
            // Line of sight check for other players
            if (p !== this.localPlayer && !this.localPlayer.isDead && this.fogOfWarEnabled) {
                const canSee = this.lighting.canSee(
                    this.localPlayer.x,
                    this.localPlayer.y,
                    p.x,
                    p.y,
                    this.getVisionRadius()
                );
                if (!canSee) continue; // In the shadow / behind wall!
            }

            p.render(this.ctx, this.camera, p === this.localPlayer, this.localPlayer.isImpostor);
        }

        // 4. Fog of War / Darkness Shadow Layer
        if (this.fogOfWarEnabled && !this.localPlayer.isDead) {
            this.lighting.renderFogOfWar(
                this.ctx,
                this.localPlayer.x,
                this.localPlayer.y,
                this.getVisionRadius(),
                this.canvas.width,
                this.canvas.height,
                this.camera
            );
        }
    }

    getVisionRadius() {
        if (this.sabotageManager.activeSabotage === 'electrical') {
            return this.localPlayer.isImpostor ? CONFIG.VISION_IMPOSTOR : CONFIG.VISION_LIGHTS_OUT;
        }
        return this.localPlayer.isImpostor ? CONFIG.VISION_IMPOSTOR : CONFIG.VISION_CREWMATE;
    }

    isNearSabotageStation(player) {
        if (!this.sabotageManager.activeSabotage) return false;
        const stations = CONFIG.SABOTAGE_STATIONS[this.sabotageManager.activeSabotage];
        if (!stations) return false;

        for (const st of stations) {
            if (Math.hypot(player.x - st.x, player.y - st.y) < 65) {
                return true;
            }
        }
        return false;
    }

    // USER ACTIONS
    onUsePressed() {
        if (this.state !== 'PLAYING') return;

        // 1. Sabotage repair check
        if (this.sabotageManager.activeSabotage && this.isNearSabotageStation(this.localPlayer)) {
            this.sabotageManager.openRepairTask(this.taskManager);
            return;
        }

        // 2. Console check (Emergency Button, Admin Radar, Cams)
        if (this.activeNearbyConsole) {
            const con = this.activeNearbyConsole;
            if (con.type === 'emergency') {
                this.triggerMeeting('emergency', this.localPlayer, null);
            } else if (con.type === 'admin_table') {
                this.ui.openAdminRadar();
            } else if (con.type === 'security_cams') {
                this.ui.openSecurityCameras();
            }
            return;
        }

        // 3. Task check
        if (this.activeNearbyTask && !this.localPlayer.isDead) {
            this.taskManager.openTask(this.activeNearbyTask);
        }
    }

    onKillPressed() {
        if (this.state !== 'PLAYING' || !this.localPlayer.isImpostor) return;
        if (this.localPlayer.killCooldown > 0 || this.localPlayer.inVent) return;

        if (this.activeNearbyVictim) {
            const victim = this.activeNearbyVictim;
            victim.isDead = true;
            victim.deadBodyX = victim.x;
            victim.deadBodyY = victim.y;
            victim.reported = false;

            // Teleport to victim & trigger cooldown
            this.localPlayer.x = victim.x;
            this.localPlayer.y = victim.y;
            this.localPlayer.killCooldown = this.killCooldownSetting;

            window.audio.playKill();
            this.checkWinConditions();
        }
    }

    onReportPressed() {
        if (this.state !== 'PLAYING' || this.localPlayer.isDead) return;
        if (this.activeNearbyBody) {
            this.activeNearbyBody.reported = true;
            this.triggerMeeting('dead_body', this.localPlayer, this.activeNearbyBody);
        }
    }

    onVentPressed() {
        if (this.state !== 'PLAYING' || !this.localPlayer.isImpostor) return;
        const p = this.localPlayer;

        if (!p.inVent && this.activeNearbyVent) {
            // Enter Vent
            p.inVent = true;
            p.currentVent = this.activeNearbyVent;
            p.x = this.activeNearbyVent.x;
            p.y = this.activeNearbyVent.y;
            window.audio.playVent();
        } else if (p.inVent && p.currentVent) {
            // Hop to next connected vent or exit
            const conns = p.currentVent.connections;
            if (conns && conns.length > 0) {
                const nextVentId = conns[0];
                const nextVent = CONFIG.VENTS.find(v => v.id === nextVentId);
                if (nextVent) {
                    p.x = nextVent.x;
                    p.y = nextVent.y;
                    p.inVent = false;
                    p.currentVent = null;
                    window.audio.playVent();
                }
            } else {
                p.inVent = false;
                p.currentVent = null;
                window.audio.playVent();
            }
        }
    }

    onTaskDone(task) {
        if (!this.completedTaskIds.includes(task.id)) {
            this.completedTaskIds.push(task.id);
            this.completedTasksCount++;
            this.localPlayer.completedTasks++;
            this.ui.updateTaskList(this.localPlayer.tasks, this.completedTaskIds);
            this.checkWinConditions();
        }
    }

    onBotCompletedTask(bot) {
        this.completedTasksCount++;
        this.checkWinConditions();
    }

    onSabotageStarted(type) {
        // Handled in sabotage manager
    }

    onSabotageEnded(type) {
        // Handled in sabotage manager
    }

    triggerMeeting(reason, reporter, deadBody) {
        this.state = 'MEETING';
        this.ui.closeAllModals();

        // Teleport all players to cafeteria
        this.players.forEach((p, idx) => {
            const angle = (idx / this.players.length) * Math.PI * 2;
            p.x = 1600 + Math.cos(angle) * 110;
            p.y = 550 + Math.sin(angle) * 110;
            p.inVent = false;
            p.currentVent = null;
        });

        this.votingSystem.startMeeting(reason, reporter, deadBody, this.players, this.localPlayer);
    }

    onEjectionFinished(ejectedPlayer) {
        this.state = 'PLAYING';
        this.checkWinConditions();
    }

    checkWinConditions() {
        const aliveCrew = this.players.filter(p => !p.isImpostor && !p.isDead).length;
        const aliveImpostors = this.players.filter(p => p.isImpostor && !p.isDead).length;

        // 1. Crewmate Win by Tasks
        if (this.completedTasksCount >= this.totalRequiredTasks && this.totalRequiredTasks > 0) {
            this.triggerCrewmateVictory('tasks');
            return;
        }

        // 2. Crewmate Win by Ejecting all Impostors
        if (aliveImpostors === 0) {
            this.triggerCrewmateVictory('impostors_eliminated');
            return;
        }

        // 3. Impostor Win by Kills (Impostors >= Crewmates)
        if (aliveImpostors >= aliveCrew) {
            this.triggerImpostorVictory('kills');
            return;
        }
    }

    triggerCrewmateVictory(reason) {
        this.state = 'GAME_OVER';
        window.audio.playVictory();

        const modal = document.getElementById('endgame-modal');
        const title = document.getElementById('endgame-title');
        const subtitle = document.getElementById('endgame-subtitle');
        const reveal = document.getElementById('endgame-impostors-reveal');

        modal.classList.remove('hidden');
        title.textContent = 'VICTORY';
        title.className = 'endgame-title victory';

        subtitle.textContent = reason === 'tasks' 
            ? 'Tüm Görevler Başarıyla Tamamlandı!' 
            : 'Tüm Sahtekarlar Yakalandı!';

        const impostors = this.players.filter(p => p.isImpostor).map(p => p.name).join(', ');
        reveal.textContent = `Sahtekarlar: ${impostors}`;
    }

    triggerImpostorVictory(reason) {
        this.state = 'GAME_OVER';
        window.audio.playDefeat();

        const modal = document.getElementById('endgame-modal');
        const title = document.getElementById('endgame-title');
        const subtitle = document.getElementById('endgame-subtitle');
        const reveal = document.getElementById('endgame-impostors-reveal');

        modal.classList.remove('hidden');
        title.textContent = 'DEFEAT';
        title.className = 'endgame-title defeat';

        subtitle.textContent = reason === 'sabotage' 
            ? 'Kritik Sabotaj Tamir Edilemedi! Gemi Düştü.' 
            : 'Sahtekarlar Mürettebatı Alt Etti!';

        const impostors = this.players.filter(p => p.isImpostor).map(p => p.name).join(', ');
        reveal.textContent = `Sahtekarlar: ${impostors}`;
    }
}

// Start game instance on load
window.addEventListener('DOMContentLoaded', () => {
    window.game = new AmongUsGame();
});
