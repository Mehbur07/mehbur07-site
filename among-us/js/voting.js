/* ===================================================
   AMONG US EMERGENCY MEETING & VOTING SYSTEM
   Player cards, AI dynamic discussion, voting tally, ejection screen
   =================================================== */

class VotingSystem {
    constructor(onMeetingEnded) {
        this.onMeetingEnded = onMeetingEnded;

        this.modal = document.getElementById('meeting-modal');
        this.reasonBanner = document.getElementById('meeting-reason');
        this.timerNum = document.getElementById('meeting-timer-num');
        this.grid = document.getElementById('voting-grid');
        this.chatMessages = document.getElementById('chat-messages');
        this.skipBtn = document.getElementById('btn-skip-vote');
        this.statusText = document.getElementById('vote-feedback');

        this.ejectionModal = document.getElementById('ejection-modal');
        this.ejectionCanvas = document.getElementById('ejection-canvas');
        this.ejectionCtx = this.ejectionCanvas.getContext('2d');
        this.ejectionText = document.getElementById('ejection-text');

        this.timeLeft = 45;
        this.timerInterval = null;
        this.hasVoted = false;
        this.votes = {}; // targetPlayerId -> [voterIds]
        this.players = [];
        this.localPlayer = null;

        this.skipBtn.addEventListener('click', () => this.castLocalVote('skip'));
        this.setupQuickChat();
    }

    startMeeting(reason, reporter, deadBodyPlayer, allPlayers, localPlayer) {
        this.players = allPlayers;
        this.localPlayer = localPlayer;
        this.hasVoted = false;
        this.votes = { 'skip': [] };
        this.players.forEach(p => this.votes[p.id] = []);

        this.reasonBanner.textContent = reason === 'dead_body' 
            ? `🚨 CESET BULUNDU: ${reporter.name.toUpperCase()} BİLDİRDİ!` 
            : `📢 ACİL DURUM TOPLANTISI: ${reporter.name.toUpperCase()} ÇAĞIRDI!`;

        this.modal.classList.remove('hidden');
        this.chatMessages.innerHTML = '';
        this.statusText.textContent = 'Oyunuzu kullanmak için bir oyuncuya veya Skip butonuna tıklayın.';
        this.skipBtn.disabled = localPlayer.isDead;

        if (reason === 'dead_body') {
            window.audio.playReport();
        } else {
            window.audio.playEmergency();
        }

        this.renderPlayerCards();
        this.startDiscussion(reporter, deadBodyPlayer);
        this.startTimer();
    }

    renderPlayerCards() {
        this.grid.innerHTML = '';

        this.players.forEach(player => {
            const card = document.createElement('div');
            card.className = `voter-card ${player.isDead ? 'dead' : ''}`;
            card.id = `vote-card-${player.id}`;

            card.innerHTML = `
                <div class="voter-info">
                    <div style="width:28px; height:34px; background:${player.colorData.hex}; border-radius:6px; border:2px solid #000; position:relative;">
                        <div style="width:14px; height:10px; background:#75c8e8; border-radius:3px; position:absolute; top:6px; right:-2px;"></div>
                    </div>
                    <div>
                        <div class="voter-name" style="color:${player.colorData.hex};">${player.name}</div>
                        ${player.isDead ? '<div class="voter-dead-tag">💀 ELENDİ</div>' : ''}
                    </div>
                </div>
                <div class="vote-tally-pins" id="pins-${player.id}"></div>
            `;

            if (!player.isDead && !this.localPlayer.isDead) {
                card.addEventListener('click', () => {
                    if (!this.hasVoted) {
                        this.castLocalVote(player.id);
                    }
                });
            }

            this.grid.appendChild(card);
        });
    }

    setupQuickChat() {
        const quickBtns = document.querySelectorAll('.quick-chat-btn');
        quickBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.localPlayer && !this.localPlayer.isDead) {
                    this.addChatMessage(this.localPlayer, btn.getAttribute('data-msg'));
                }
            });
        });
    }

    addChatMessage(player, message) {
        const bubble = document.createElement('div');
        bubble.className = 'chat-msg-bubble';
        bubble.innerHTML = `
            <span class="sender-name" style="color:${player.colorData.hex};">${player.name}:</span>
            <span>${message}</span>
        `;
        this.chatMessages.appendChild(bubble);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    startDiscussion(reporter, deadBodyPlayer) {
        // AI dynamic dialog generator
        setTimeout(() => {
            if (reporter) {
                if (deadBodyPlayer) {
                    this.addChatMessage(reporter, `${deadBodyPlayer.name}'ın cesedini buldum! Koridorda yatıyordu.`);
                } else {
                    this.addChatMessage(reporter, 'Şüpheli hareketler gördüm, toplantı başlattım!');
                }
            }
        }, 600);

        // Bots respond
        const aliveBots = this.players.filter(p => p.isAI && !p.isDead && p !== reporter);
        aliveBots.forEach((bot, index) => {
            setTimeout(() => {
                if (!this.modal.classList.contains('hidden')) {
                    const lines = [
                        'Neredeydiniz?',
                        'Ben Medbay tarafında görev yapıyordum.',
                        'Kabloları bağlıyordum, kimseyi görmedim.',
                        'Herkes dikkatli olsun.',
                        'Bence pas geçelim (Skip vote).',
                        'Kameraları izliyordum her şey normaldi.',
                        'Kimse bir şey görmedi mi?'
                    ];
                    const randomLine = lines[Math.floor(Math.random() * lines.length)];
                    this.addChatMessage(bot, randomLine);
                }
            }, 2000 + index * 2500);
        });
    }

    startTimer() {
        this.timeLeft = 35;
        this.timerNum.textContent = this.timeLeft;

        if (this.timerInterval) clearInterval(this.timerInterval);

        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.timerNum.textContent = this.timeLeft;

            if (this.timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.concludeVoting();
            }
        }, 1000);
    }

    castLocalVote(targetId) {
        if (this.hasVoted) return;
        this.hasVoted = true;
        window.audio.playVoteClick();

        this.votes[targetId].push(this.localPlayer);
        this.statusText.textContent = targetId === 'skip' 
            ? 'Oyunuzu PAS GEÇTİNİZ.' 
            : `Oyunuzu verdiniz. Diğer oyuncular bekleniyor...`;

        // Highlight selected card
        if (targetId !== 'skip') {
            const card = document.getElementById(`vote-card-${targetId}`);
            if (card) card.classList.add('selected');
        }

        // Trigger bot votes after a short delay
        this.performBotVotes();
    }

    performBotVotes() {
        const aliveBots = this.players.filter(p => p.isAI && !p.isDead);
        const aliveTargets = this.players.filter(p => !p.isDead);

        aliveBots.forEach(bot => {
            // Bot decision: 40% skip, 60% vote someone suspicious
            let targetId = 'skip';
            if (Math.random() > 0.4 && aliveTargets.length > 0) {
                const randomTarget = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
                targetId = randomTarget.id;
            }
            this.votes[targetId].push(bot);
        });

        // Fast forward timer if everyone voted
        setTimeout(() => {
            if (this.timeLeft > 3) {
                this.timeLeft = 3;
            }
        }, 3000);
    }

    concludeVoting() {
        clearInterval(this.timerInterval);
        this.statusText.textContent = 'Oylar Sayılıyor...';

        // Render vote pins
        for (const [targetId, voters] of Object.entries(this.votes)) {
            if (targetId === 'skip') continue;
            const pinsEl = document.getElementById(`pins-${targetId}`);
            if (pinsEl) {
                pinsEl.innerHTML = voters.map(v => `
                    <div class="vote-pin-icon" style="background:${v.colorData.hex};"></div>
                `).join('');
            }
        }

        setTimeout(() => {
            // Find player with highest votes
            let maxVotes = 0;
            let highestCandidateId = null;
            let isTie = false;

            for (const [targetId, voters] of Object.entries(this.votes)) {
                if (voters.length > maxVotes) {
                    maxVotes = voters.length;
                    highestCandidateId = targetId;
                    isTie = false;
                } else if (voters.length === maxVotes && maxVotes > 0) {
                    isTie = true;
                }
            }

            this.modal.classList.add('hidden');

            let ejectedPlayer = null;
            if (!isTie && highestCandidateId && highestCandidateId !== 'skip') {
                ejectedPlayer = this.players.find(p => p.id === highestCandidateId);
            }

            this.showEjectionScreen(ejectedPlayer, isTie || highestCandidateId === 'skip');
        }, 3000);
    }

    showEjectionScreen(ejectedPlayer, skipped) {
        this.ejectionModal.classList.remove('hidden');
        const canvas = this.ejectionCanvas;
        const ctx = this.ejectionCtx;
        const textEl = this.ejectionText;

        if (ejectedPlayer) {
            ejectedPlayer.isDead = true;
            ejectedPlayer.isGhost = true;
        }

        // Count remaining impostors
        const remainingImpostors = this.players.filter(p => p.isImpostor && !p.pEjected && !p.isDead).length;

        let subtitle = '';
        if (skipped || !ejectedPlayer) {
            subtitle = 'Kimse uzaya fırlatılmadı. (Pas geçildi)';
        } else {
            subtitle = `${ejectedPlayer.name} ${ejectedPlayer.isImpostor ? 'Bir Sahtekardı (An Impostor).' : 'Bir Sahtekar Değildi.'} (${remainingImpostors} Sahtekar Kaldı)`;
        }

        textEl.textContent = subtitle;

        // Space ejection animation loop
        let posX = -50;
        let rot = 0;
        let frameCount = 0;

        const animateEjection = () => {
            if (frameCount > 240) {
                this.ejectionModal.classList.add('hidden');
                if (this.onMeetingEnded) {
                    this.onMeetingEnded(ejectedPlayer);
                }
                return;
            }

            ctx.fillStyle = '#03050a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Stars
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 80; i++) {
                ctx.fillRect((i * 123 + frameCount * 0.5) % canvas.width, (i * 97) % canvas.height, 2, 2);
            }

            if (ejectedPlayer) {
                ctx.save();
                ctx.translate(posX, canvas.height / 2);
                ctx.rotate(rot);

                // Draw tumbling bean
                ctx.fillStyle = ejectedPlayer.colorData.hex;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.roundRect(-16, -22, 32, 44, [14]);
                ctx.fill();
                ctx.stroke();

                // Visor
                ctx.fillStyle = '#75c8e8';
                ctx.fillRect(4, -14, 16, 12);

                ctx.restore();

                posX += 4.5;
                rot += 0.05;
            }

            frameCount++;
            requestAnimationFrame(animateEjection);
        };

        animateEjection();
    }
}

window.VotingSystem = VotingSystem;
