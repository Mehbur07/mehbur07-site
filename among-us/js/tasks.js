/* ===================================================
   AMONG US INTERACTIVE MINI-GAME TASKS
   Complete with drag-and-drop, physics, canvas FX, sounds
   =================================================== */

class TaskManager {
    constructor(onTaskCompleted) {
        this.onTaskCompleted = onTaskCompleted;
        this.currentTask = null;
        this.container = document.getElementById('task-content');
        this.titleEl = document.getElementById('task-title-text');
        this.modalEl = document.getElementById('task-modal-overlay');
        this.closeBtn = document.getElementById('close-task-btn');

        this.closeBtn.addEventListener('click', () => this.closeTask());
        this.activeListeners = [];
    }

    openTask(task) {
        this.currentTask = task;
        this.titleEl.textContent = task.name.toUpperCase();
        this.container.innerHTML = '';
        this.modalEl.classList.remove('hidden');

        switch (task.type) {
            case 'wiring':
                this.initWiringTask();
                break;
            case 'swipe_card':
                this.initSwipeCardTask();
                break;
            case 'asteroids':
                this.initAsteroidsTask();
                break;
            case 'medbay_scan':
                this.initMedBayScanTask();
                break;
            case 'manifolds':
                this.initManifoldsTask();
                break;
            case 'shields':
                this.initShieldsTask();
                break;
            case 'upload_data':
                this.initUploadDataTask();
                break;
            case 'align_engine':
                this.initAlignEngineTask();
                break;
            default:
                this.initGenericTask();
                break;
        }
    }

    closeTask() {
        this.modalEl.classList.add('hidden');
        this.container.innerHTML = '';
        this.currentTask = null;
    }

    finishCurrentTask() {
        window.audio.playTaskComplete();
        setTimeout(() => {
            if (this.currentTask) {
                this.onTaskCompleted(this.currentTask);
            }
            this.closeTask();
        }, 600);
    }

    // 1. MINI-GAME: WIRING
    initWiringTask() {
        const colors = [
            { id: 'red', hex: '#ea2b2b' },
            { id: 'blue', hex: '#2292f7' },
            { id: 'yellow', hex: '#f8c21a' },
            { id: 'pink', hex: '#ed54ba' }
        ];

        const leftOrder = [...colors].sort(() => Math.random() - 0.5);
        const rightOrder = [...colors].sort(() => Math.random() - 0.5);

        this.container.innerHTML = `
            <div class="wiring-board" id="wiring-board">
                <div class="wire-column" id="left-wires">
                    ${leftOrder.map(c => `
                        <div class="wire-slot left-slot" data-color="${c.id}">
                            <div class="wire-pin" style="background-color: ${c.hex};"></div>
                        </div>
                    `).join('')}
                </div>
                <canvas class="wiring-canvas" id="wire-canvas" width="560" height="320"></canvas>
                <div class="wire-column" id="right-wires">
                    ${rightOrder.map(c => `
                        <div class="wire-slot right-slot" data-color="${c.id}">
                            <div class="wire-pin" style="background-color: ${c.hex};"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        const board = document.getElementById('wiring-board');
        const canvas = document.getElementById('wire-canvas');
        const ctx = canvas.getContext('2d');
        const connected = {};
        let draggingWire = null;
        let mousePos = { x: 0, y: 0 };

        const leftSlots = board.querySelectorAll('.left-slot');
        const rightSlots = board.querySelectorAll('.right-slot');

        const redrawWires = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw completed wires
            for (const [color, rSlot] of Object.entries(connected)) {
                const lSlot = board.querySelector(`.left-slot[data-color="${color}"]`);
                const lRect = lSlot.getBoundingClientRect();
                const rRect = rSlot.getBoundingClientRect();
                const bRect = board.getBoundingClientRect();

                const cData = colors.find(c => c.id === color);
                ctx.strokeStyle = cData.hex;
                ctx.lineWidth = 14;
                ctx.lineCap = 'round';

                ctx.beginPath();
                ctx.moveTo(lRect.right - bRect.left, lRect.top + lRect.height / 2 - bRect.top);
                ctx.lineTo(rRect.left - bRect.left, rRect.top + rRect.height / 2 - bRect.top);
                ctx.stroke();
            }

            // Draw active dragging wire
            if (draggingWire) {
                const lSlot = draggingWire.element;
                const lRect = lSlot.getBoundingClientRect();
                const bRect = board.getBoundingClientRect();

                ctx.strokeStyle = draggingWire.colorData.hex;
                ctx.lineWidth = 14;
                ctx.lineCap = 'round';

                ctx.beginPath();
                ctx.moveTo(lRect.right - bRect.left, lRect.top + lRect.height / 2 - bRect.top);
                ctx.lineTo(mousePos.x, mousePos.y);
                ctx.stroke();
            }
        };

        leftSlots.forEach(slot => {
            const startDrag = (clientX, clientY) => {
                const color = slot.getAttribute('data-color');
                if (connected[color]) return;

                const cData = colors.find(c => c.id === color);
                draggingWire = { color: color, colorData: cData, element: slot };
                const bRect = board.getBoundingClientRect();
                mousePos = { x: clientX - bRect.left, y: clientY - bRect.top };
            };

            slot.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY));
            slot.addEventListener('touchstart', (e) => {
                const t = e.touches[0];
                startDrag(t.clientX, t.clientY);
            });
        });

        const onDragMove = (clientX, clientY) => {
            if (!draggingWire) return;
            const bRect = board.getBoundingClientRect();
            mousePos = { x: clientX - bRect.left, y: clientY - bRect.top };
            redrawWires();
        };

        board.addEventListener('mousemove', (e) => onDragMove(e.clientX, e.clientY));
        board.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                onDragMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        });

        const onDragEnd = (clientX, clientY) => {
            if (!draggingWire) return;

            // Check if dropped on matching right slot
            rightSlots.forEach(rSlot => {
                const rRect = rSlot.getBoundingClientRect();
                if (clientX >= rRect.left && clientX <= rRect.right &&
                    clientY >= rRect.top && clientY <= rRect.bottom) {
                    if (rSlot.getAttribute('data-color') === draggingWire.color) {
                        connected[draggingWire.color] = rSlot;
                        window.audio.playWireConnect();
                    }
                }
            });

            draggingWire = null;
            redrawWires();

            // Check all 4 connected
            if (Object.keys(connected).length === 4) {
                this.finishCurrentTask();
            }
        };

        window.addEventListener('mouseup', (e) => onDragEnd(e.clientX, e.clientY));
        window.addEventListener('touchend', (e) => {
            const touch = e.changedTouches ? e.changedTouches[0] : null;
            if (touch) onDragEnd(touch.clientX, touch.clientY);
        });
    }

    // 2. MINI-GAME: SWIPE CARD
    initSwipeCardTask() {
        this.container.innerHTML = `
            <div class="swipe-card-area">
                <div class="card-reader" id="card-reader">
                    <div class="card-slot-line"></div>
                    <div class="reader-light" id="reader-led"></div>
                </div>
                <div class="swipe-status" id="swipe-status-text">Lütfen kartı okutun...</div>
                <div class="wallet-card" id="swipe-card">
                    <div style="font-family: Orbitron; font-weight:800; font-size:12px; color:#fff;">CREW ACCESS CARD</div>
                    <div style="font-size:11px; color:#ddd; margin-top:8px;">ID: 709-SKELD</div>
                    <div style="font-size:24px; margin-top:12px;">💳</div>
                </div>
            </div>
        `;

        const card = document.getElementById('swipe-card');
        const reader = document.getElementById('card-reader');
        const statusText = document.getElementById('swipe-status-text');
        const led = document.getElementById('reader-led');

        let isDragging = false;
        let startTime = 0;
        let startX = 0;

        const startCardSwipe = (clientX) => {
            isDragging = true;
            startTime = Date.now();
            startX = clientX;
            statusText.textContent = 'Kart çekiliyor...';
        };

        const moveCardSwipe = (clientX) => {
            if (!isDragging) return;
            const diffX = clientX - startX;
            if (diffX > 0 && diffX < 360) {
                card.style.transform = `translateX(${diffX}px)`;
            }
        };

        const endCardSwipe = (clientX) => {
            if (!isDragging) return;
            isDragging = false;

            const totalDist = clientX - startX;
            const duration = Date.now() - startTime;
            card.style.transform = `translateX(0px)`;

            if (totalDist > 240) {
                if (duration < 280) {
                    statusText.textContent = 'Çok Hızlı! Tekrar Deneyin.';
                    statusText.style.color = '#ea2b2b';
                    led.className = 'reader-light red';
                    window.audio.playCardBeep(false);
                } else if (duration > 950) {
                    statusText.textContent = 'Çok Yavaş! Tekrar Deneyin.';
                    statusText.style.color = '#ea2b2b';
                    led.className = 'reader-light red';
                    window.audio.playCardBeep(false);
                } else {
                    statusText.textContent = 'KABUL EDİLDİ (ACCEPTED)';
                    statusText.style.color = '#38ef7d';
                    led.className = 'reader-light green';
                    window.audio.playCardBeep(true);
                    this.finishCurrentTask();
                }
            } else {
                statusText.textContent = 'Kartı sonuna kadar çekin!';
            }
        };

        card.addEventListener('mousedown', (e) => startCardSwipe(e.clientX));
        card.addEventListener('touchstart', (e) => startCardSwipe(e.touches[0].clientX));

        window.addEventListener('mousemove', (e) => moveCardSwipe(e.clientX));
        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) moveCardSwipe(e.touches[0].clientX);
        });

        window.addEventListener('mouseup', (e) => endCardSwipe(e.clientX));
        window.addEventListener('touchend', (e) => {
            const touch = e.changedTouches ? e.changedTouches[0] : null;
            if (touch) endCardSwipe(touch.clientX);
        });
    }

    // 3. MINI-GAME: CLEAR ASTEROIDS
    initAsteroidsTask() {
        let destroyed = 0;
        const targetCount = 12;

        this.container.innerHTML = `
            <div class="asteroids-hud">
                <div class="asteroids-count">Kalan Asteroit: <span id="ast-left">${targetCount}</span></div>
                <canvas id="asteroids-canvas" width="560" height="320" style="background:#040711; border:2px solid #334460; border-radius:10px; cursor:crosshair;"></canvas>
            </div>
        `;

        const canvas = document.getElementById('asteroids-canvas');
        const ctx = canvas.getContext('2d');
        const countText = document.getElementById('ast-left');

        let asteroids = [];
        let particles = [];
        let lasers = [];

        // Spawn asteroids
        for (let i = 0; i < 6; i++) {
            asteroids.push({
                x: canvas.width + Math.random() * 200,
                y: Math.random() * (canvas.height - 60) + 30,
                radius: Math.random() * 12 + 16,
                speed: Math.random() * 1.5 + 1.2
            });
        }

        const shootLaser = (tx, ty) => {
            window.audio.playLaser();
            lasers.push({
                x1: canvas.width / 2, y1: canvas.height,
                x2: tx, y2: ty,
                alpha: 1.0
            });

            // Check collision with asteroids
            for (let i = asteroids.length - 1; i >= 0; i--) {
                const ast = asteroids[i];
                if (Math.hypot(tx - ast.x, ty - ast.y) < ast.radius + 10) {
                    window.audio.playExplosion();
                    // Spawn explosion particles
                    for (let p = 0; p < 12; p++) {
                        particles.push({
                            x: ast.x, y: ast.y,
                            vx: (Math.random() - 0.5) * 6,
                            vy: (Math.random() - 0.5) * 6,
                            radius: Math.random() * 3 + 2,
                            alpha: 1.0
                        });
                    }

                    // Reset asteroid to right
                    ast.x = canvas.width + Math.random() * 150;
                    ast.y = Math.random() * (canvas.height - 60) + 30;

                    destroyed++;
                    countText.textContent = Math.max(0, targetCount - destroyed);

                    if (destroyed >= targetCount) {
                        this.finishCurrentTask();
                    }
                    break;
                }
            }
        };

        canvas.addEventListener('mousedown', (e) => {
            const rect = canvas.getBoundingClientRect();
            shootLaser(e.clientX - rect.left, e.clientY - rect.top);
        });

        let animFrame;
        const loop = () => {
            if (!this.currentTask || this.currentTask.type !== 'asteroids') return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Stars
            ctx.fillStyle = '#ffffff';
            for (let s = 0; s < 25; s++) {
                ctx.fillRect((s * 47) % canvas.width, (s * 83) % canvas.height, 2, 2);
            }

            // Update & Draw Asteroids
            for (const ast of asteroids) {
                ast.x -= ast.speed;
                if (ast.x < -40) {
                    ast.x = canvas.width + 40;
                    ast.y = Math.random() * (canvas.height - 60) + 30;
                }

                ctx.fillStyle = '#8b5a2b';
                ctx.strokeStyle = '#5c3a1e';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(ast.x, ast.y, ast.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            // Draw Lasers
            for (let i = lasers.length - 1; i >= 0; i--) {
                const l = lasers[i];
                ctx.strokeStyle = `rgba(0, 242, 195, ${l.alpha})`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(l.x1, l.y1);
                ctx.lineTo(l.x2, l.y2);
                ctx.stroke();
                l.alpha -= 0.1;
                if (l.alpha <= 0) lasers.splice(i, 1);
            }

            // Draw Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.04;
                ctx.fillStyle = `rgba(255, 120, 50, ${p.alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
                if (p.alpha <= 0) particles.splice(i, 1);
            }

            animFrame = requestAnimationFrame(loop);
        };
        loop();
    }

    // 4. MINI-GAME: MEDBAY SCAN
    initMedBayScanTask() {
        this.container.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:16px;">
                <div style="font-family: Orbitron; font-size:18px; color:var(--neon-cyan); letter-spacing:1px;">MEDBAY BIO-SCANNER</div>
                <div style="position:relative; width:220px; height:220px; border:3px solid #00f2c3; border-radius:50%; display:flex; align-items:center; justify-content:center; background:#08131e; overflow:hidden;">
                    <div id="scan-laser-line" style="position:absolute; top:0; left:0; right:0; height:4px; background:#00f2c3; box-shadow:0 0 15px #00f2c3; animation:scanBeam 1.5s infinite alternate ease-in-out;"></div>
                    <div style="font-size:70px;">🧍</div>
                </div>
                <div style="background:#131c2e; border:1px solid #334460; padding:12px 20px; border-radius:10px; width:360px; font-family:Orbitron; font-size:12px; line-height:1.8;">
                    <div>ID: <span style="color:#00f2c3;">CREW-#709</span></div>
                    <div>BOY: <span style="color:#fff;">3' 6" (1.07 m)</span> | KİLO: <span style="color:#fff;">92 lb (41 kg)</span></div>
                    <div>KAN GRUBU: <span style="color:#ff3366;">O+ (POZİTİF)</span></div>
                    <div>TARAMA TAMAMLANMA: <span id="scan-percent" style="color:#38ef7d;">0%</span></div>
                </div>
            </div>
            <style>
                @keyframes scanBeam {
                    0% { top: 0%; }
                    100% { top: 100%; }
                }
            </style>
        `;

        let progress = 0;
        const percentText = document.getElementById('scan-percent');
        const interval = setInterval(() => {
            if (!this.currentTask || this.currentTask.type !== 'medbay_scan') {
                clearInterval(interval);
                return;
            }
            progress += 10;
            percentText.textContent = `${progress}%`;

            if (progress >= 100) {
                clearInterval(interval);
                this.finishCurrentTask();
            }
        }, 500);
    }

    // 5. MINI-GAME: UNLOCK MANIFOLDS (1-10 Sequence)
    initManifoldsTask() {
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].sort(() => Math.random() - 0.5);
        let expectedNum = 1;

        this.container.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:16px;">
                <div style="font-family: Orbitron; font-size:16px; color:#f8c21a;">Sırayla 1'den 10'a kadar tuşlayın</div>
                <div class="manifolds-grid" id="manifolds-grid">
                    ${numbers.map(num => `
                        <button class="manifold-btn" data-num="${num}">${num}</button>
                    `).join('')}
                </div>
            </div>
        `;

        const buttons = this.container.querySelectorAll('.manifold-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseInt(btn.getAttribute('data-num'));
                if (val === expectedNum) {
                    btn.classList.add('active-click');
                    btn.disabled = true;
                    window.audio.playVoteClick();
                    expectedNum++;

                    if (expectedNum > 10) {
                        this.finishCurrentTask();
                    }
                } else {
                    // Reset on wrong press
                    window.audio.playCardBeep(false);
                    expectedNum = 1;
                    buttons.forEach(b => {
                        b.classList.remove('active-click');
                        b.disabled = false;
                    });
                }
            });
        });
    }

    // 6. MINI-GAME: PRIME SHIELDS
    initShieldsTask() {
        // 7 hexagons, some active, some inactive
        const states = [false, true, false, false, true, false, false];

        this.container.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:16px;">
                <div style="font-family: Orbitron; font-size:16px; color:var(--neon-cyan);">Kırmızı kalkan hücrelerine tıklayarak aktifleştirin</div>
                <div class="shields-grid" id="shields-grid">
                    ${states.map((active, i) => `
                        <div class="shield-cell ${active ? 'active' : ''}" data-idx="${i}"></div>
                    `).join('')}
                </div>
            </div>
        `;

        const cells = this.container.querySelectorAll('.shield-cell');
        cells.forEach(cell => {
            cell.addEventListener('click', () => {
                cell.classList.toggle('active');
                window.audio.playWireConnect();

                const allActive = Array.from(cells).every(c => c.classList.contains('active'));
                if (allActive) {
                    this.finishCurrentTask();
                }
            });
        });
    }

    // 7. MINI-GAME: UPLOAD / DOWNLOAD DATA
    initUploadDataTask() {
        this.container.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:20px; width:420px;">
                <div style="font-family: Orbitron; font-size:18px; color:var(--neon-cyan);">VERİ AKTARIMI (DATA TRANSFER)</div>
                <div style="display:flex; justify-content:space-between; width:100%; font-size:40px;">
                    <div>📁</div>
                    <div style="font-size:24px; animation:bounce 1s infinite;">➡️</div>
                    <div>📡</div>
                </div>
                <div style="width:100%; height:24px; background:#101828; border:2px solid #334460; border-radius:12px; overflow:hidden;">
                    <div id="data-progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #00d2ff, #00f2c3); transition:width 0.2s;"></div>
                </div>
                <div style="font-family:Orbitron; font-size:14px; color:#fff;" id="data-status-text">BAŞLATILIYOR...</div>
            </div>
        `;

        let pct = 0;
        const bar = document.getElementById('data-progress-bar');
        const txt = document.getElementById('data-status-text');

        const interval = setInterval(() => {
            if (!this.currentTask || this.currentTask.type !== 'upload_data') {
                clearInterval(interval);
                return;
            }
            pct += 15;
            bar.style.width = `${pct}%`;
            txt.textContent = `AKTARILIYOR... ${Math.min(100, pct)}% (Kalan: ${Math.max(0, Math.ceil((100 - pct) / 20))}s)`;

            if (pct >= 100) {
                clearInterval(interval);
                txt.textContent = 'AKTARIM TAMAMLANDI!';
                txt.style.color = '#38ef7d';
                this.finishCurrentTask();
            }
        }, 400);
    }

    // 8. MINI-GAME: ALIGN ENGINE OUTPUT
    initAlignEngineTask() {
        this.container.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:16px;">
                <div style="font-family: Orbitron; font-size:16px; color:#f8c21a;">Motor çıkış çizgisini ortaya hizalayın</div>
                <div style="position:relative; width:360px; height:180px; background:#0e1626; border:3px solid #334460; border-radius:12px; display:flex; align-items:center; justify-content:center;">
                    <!-- Center Target Line -->
                    <div style="position:absolute; width:100%; height:2px; background:#00f2c3; box-shadow:0 0 10px #00f2c3;"></div>
                    <div style="position:absolute; width:2px; height:100%; background:rgba(255,255,255,0.1);"></div>
                    <input type="range" id="engine-slider" min="0" max="100" value="15" style="width:280px; accent-color:#f8c21a; cursor:pointer;">
                </div>
                <div id="engine-feedback" style="font-family:Orbitron; font-size:14px; color:#ff6666;">HİZALAMA GEREKLİ</div>
            </div>
        `;

        const slider = document.getElementById('engine-slider');
        const feedback = document.getElementById('engine-feedback');

        slider.addEventListener('input', () => {
            const val = parseInt(slider.value);
            if (val >= 47 && val <= 53) {
                feedback.textContent = 'MÜKEMMEL HİZALANDI!';
                feedback.style.color = '#38ef7d';
                window.audio.playWireConnect();
                setTimeout(() => this.finishCurrentTask(), 500);
            } else {
                feedback.textContent = 'HİZALAMA GEREKLİ';
                feedback.style.color = '#ff6666';
            }
        });
    }

    initGenericTask() {
        this.container.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:20px;">
                <div style="font-size:48px;">⚙️</div>
                <div style="font-family: Orbitron; font-size:16px; color:#fff;">Görev Yapılıyor...</div>
                <button class="primary-btn" id="generic-done-btn">GÖREVİ TAMAMLA</button>
            </div>
        `;
        document.getElementById('generic-done-btn').addEventListener('click', () => {
            this.finishCurrentTask();
        });
    }
}

window.TaskManager = TaskManager;
