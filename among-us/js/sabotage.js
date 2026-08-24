/* ===================================================
   AMONG US SABOTAGE ENGINE & CRISIS MANAGEMENT
   Reactor Meltdown, Oxygen Depletion, Lights Out
   =================================================== */

class SabotageManager {
    constructor(onSabotageTriggered, onSabotageFixed, onSabotageVictory) {
        this.onSabotageTriggered = onSabotageTriggered;
        this.onSabotageFixed = onSabotageFixed;
        this.onSabotageVictory = onSabotageVictory;

        this.activeSabotage = null; // 'reactor', 'oxygen', 'electrical' or null
        this.timer = 0;
        this.cooldown = 0; // Cooldown after a sabotage is resolved

        // UI elements
        this.alertBanner = document.getElementById('sabotage-alert');
        this.alertName = document.getElementById('sabotage-name');
        this.alertTimer = document.getElementById('sabotage-timer');

        this.modal = document.getElementById('sabotage-modal');
        this.canvas = document.getElementById('sabotage-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.closeBtn = document.getElementById('close-sabotage-btn');

        this.closeBtn.addEventListener('click', () => this.closeSabotageMenu());
        this.setupCanvasClicks();
    }

    openSabotageMenu() {
        if (this.activeSabotage || this.cooldown > 0) return;
        this.modal.classList.remove('hidden');
        this.renderSabotageMap();
    }

    closeSabotageMenu() {
        this.modal.classList.add('hidden');
    }

    renderSabotageMap() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Background
        ctx.fillStyle = '#0a101d';
        ctx.fillRect(0, 0, w, h);

        // Skeld Silhouette Outline
        ctx.strokeStyle = '#22334f';
        ctx.lineWidth = 4;
        ctx.strokeRect(50, 40, w - 100, h - 80);

        // Sabotage Action Buttons over the map
        const sabButtons = [
            { id: 'reactor', name: 'REAKTÖR KRİZİ', icon: '☢️', x: 140, y: 240, color: '#ff3366' },
            { id: 'electrical', name: 'IŞIKLARI KES (ELEKTRİK)', icon: '⚡', x: 320, y: 300, color: '#f8c21a' },
            { id: 'oxygen', name: 'OKSİJEN KRİZİ (O2)', icon: '🫧', x: 560, y: 220, color: '#00d2ff' }
        ];

        for (const btn of sabButtons) {
            ctx.fillStyle = 'rgba(20, 30, 50, 0.9)';
            ctx.strokeStyle = btn.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(btn.x - 70, btn.y - 45, 140, 90, [12]);
            ctx.fill();
            ctx.stroke();

            ctx.font = '28px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(btn.icon, btn.x, btn.y - 12);

            ctx.font = 'bold 10px Orbitron';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(btn.name, btn.x, btn.y + 24);
        }

        this.sabButtons = sabButtons;
    }

    setupCanvasClicks() {
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;

            if (!this.sabButtons) return;

            for (const btn of this.sabButtons) {
                if (cx >= btn.x - 70 && cx <= btn.x + 70 &&
                    cy >= btn.y - 45 && cy <= btn.y + 45) {
                    this.triggerSabotage(btn.id);
                    this.closeSabotageMenu();
                    break;
                }
            }
        });
    }

    triggerSabotage(type) {
        if (this.activeSabotage || this.cooldown > 0) return;

        this.activeSabotage = type;
        if (type === 'reactor' || type === 'oxygen') {
            this.timer = 30; // 30 seconds critical countdown!
            this.alertBanner.classList.remove('hidden');
            this.alertName.textContent = type === 'reactor' ? 'REAKTÖR ERİMESİ BAŞLADI!' : 'OKSİJEN TÜKENİYOR!';
            window.audio.startSabotageAlarm();
        } else if (type === 'electrical') {
            this.timer = 999; // Stays dark until fixed
            this.alertBanner.classList.remove('hidden');
            this.alertName.textContent = 'ELEKTRİK KESİNTİSİ: IŞIKLAR SÖNDÜ!';
            this.alertTimer.textContent = 'TAMİR ET';
        }

        if (this.onSabotageTriggered) {
            this.onSabotageTriggered(type);
        }
    }

    update(deltaTime) {
        if (this.cooldown > 0) {
            this.cooldown -= deltaTime;
            if (this.cooldown < 0) this.cooldown = 0;
        }

        if (!this.activeSabotage) return;

        if (this.activeSabotage === 'reactor' || this.activeSabotage === 'oxygen') {
            this.timer -= deltaTime;
            this.alertTimer.textContent = `${Math.ceil(this.timer)}s`;

            if (this.timer <= 0) {
                // Impostors win by Sabotage Crisis!
                window.audio.stopSabotageAlarm();
                this.alertBanner.classList.add('hidden');
                if (this.onSabotageVictory) {
                    this.onSabotageVictory(this.activeSabotage);
                }
                this.activeSabotage = null;
            }
        }
    }

    fixSabotage() {
        if (!this.activeSabotage) return;

        const fixedType = this.activeSabotage;
        this.activeSabotage = null;
        this.cooldown = 20; // 20s cooldown before next sabotage
        this.alertBanner.classList.add('hidden');
        window.audio.stopSabotageAlarm();
        window.audio.playTaskComplete();

        if (this.onSabotageFixed) {
            this.onSabotageFixed(fixedType);
        }
    }

    // Open Repair Mini-Game when player interacts with Sabotage station
    openRepairTask(taskManager) {
        if (!this.activeSabotage) return;

        if (this.activeSabotage === 'electrical') {
            // Electrical switch flip mini-game
            taskManager.container.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; gap:20px;">
                    <div style="font-family: Orbitron; font-size:18px; color:#f8c21a;">ŞALTERLERİ AÇIN (IŞIKLARI DÜZELT)</div>
                    <div style="display:flex; gap:16px;">
                        ${[1, 2, 3, 4, 5].map(i => `
                            <button class="elec-switch-btn" data-idx="${i}" style="width:60px; height:120px; background:#222; border:3px solid #666; border-radius:10px; cursor:pointer; color:#fff; font-weight:bold;">OFF</button>
                        `).join('')}
                    </div>
                </div>
            `;
            taskManager.titleEl.textContent = 'ELEKTRİK ARIZASI';
            taskManager.modalEl.classList.remove('hidden');

            const buttons = taskManager.container.querySelectorAll('.elec-switch-btn');
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    btn.textContent = 'ON';
                    btn.style.background = '#38ef7d';
                    btn.style.borderColor = '#fff';
                    window.audio.playWireConnect();

                    const allOn = Array.from(buttons).every(b => b.textContent === 'ON');
                    if (allOn) {
                        setTimeout(() => {
                            taskManager.closeTask();
                            this.fixSabotage();
                        }, 400);
                    }
                });
            });
        } else {
            // Reactor / O2 Hand Scan / Code fix
            taskManager.container.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; gap:20px;">
                    <div style="font-family: Orbitron; font-size:18px; color:#ff3366;">KRİZİ DURDURMAK İÇİN BUTONA BASIN</div>
                    <button class="primary-btn" id="fix-sabotage-btn" style="background:#ff3366; border-color:#fff; padding:20px 40px; font-size:20px;">ACİL SIFIRLAMA (RESET)</button>
                </div>
            `;
            taskManager.titleEl.textContent = 'KRİTİK SABOTAJ SIFIRLAMA';
            taskManager.modalEl.classList.remove('hidden');

            document.getElementById('fix-sabotage-btn').addEventListener('click', () => {
                taskManager.closeTask();
                this.fixSabotage();
            });
        }
    }
}

window.SabotageManager = SabotageManager;
