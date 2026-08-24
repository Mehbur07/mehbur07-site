/* ===================================================
   AMONG US SMART BOT AI ENGINE
   Autonomous Crewmates & Cunning Impostor Bots
   =================================================== */

class BotAIController {
    constructor(shipMap, sabotageManager, taskManager) {
        this.shipMap = shipMap;
        this.sabotageManager = sabotageManager;
        this.taskManager = taskManager;

        // Navigation waypoints for smooth pathfinding
        this.waypoints = [
            { x: 1600, y: 550, name: 'cafe' },
            { x: 1600, y: 1050, name: 'main_hall' },
            { x: 1600, y: 1550, name: 'storage' },
            { x: 2150, y: 650, name: 'weapons_hall' },
            { x: 2350, y: 550, name: 'weapons' },
            { x: 2150, y: 920, name: 'o2' },
            { x: 2150, y: 1280, name: 'admin' },
            { x: 2750, y: 1100, name: 'nav' },
            { x: 2350, y: 1650, name: 'shields' },
            { x: 1180, y: 1250, name: 'electrical' },
            { x: 1200, y: 680, name: 'medbay' },
            { x: 1080, y: 920, name: 'security' },
            { x: 800, y: 650, name: 'upper_engine' },
            { x: 800, y: 1600, name: 'lower_engine' },
            { x: 420, y: 1120, name: 'reactor' }
        ];

        this.botStates = new Map(); // botId -> state data
        this.globalSabotageTimer = 45; // 45 seconds initial grace period
    }

    initBot(bot) {
        this.botStates.set(bot.id, {
            targetX: bot.x,
            targetY: bot.y,
            state: 'wandering', // 'wandering', 'doing_task', 'fixing_sabotage', 'hunting', 'venting'
            stateTimer: Math.random() * 3 + 2,
            targetTask: null,
            targetSabotageStation: null,
            stalkTarget: null
        });
    }

    updateBots(deltaTime, allPlayers, onDeadBodyFound, onTaskDoneByBot) {
        if (this.globalSabotageTimer > 0) {
            this.globalSabotageTimer -= deltaTime;
        }

        for (const player of allPlayers) {
            if (!player.isAI || player.isDead) continue;

            let data = this.botStates.get(player.id);
            if (!data) {
                this.initBot(player);
                data = this.botStates.get(player.id);
            }

            data.stateTimer -= deltaTime;

            // 1. Vision Check: Did this bot spot a dead body?
            if (!player.isDead) {
                for (const other of allPlayers) {
                    if (other.isDead && !other.reported) {
                        const distToBody = Math.hypot(player.x - other.deadBodyX, player.y - other.deadBodyY);
                        if (distToBody < 280) {
                            // Report body!
                            other.reported = true;
                            onDeadBodyFound(player, other);
                            return;
                        }
                    }
                }
            }

            // 2. React to Sabotage
            if (this.sabotageManager.activeSabotage && !player.isImpostor) {
                if (data.state !== 'fixing_sabotage') {
                    data.state = 'fixing_sabotage';
                    data.stateTimer = 20;
                    const stations = CONFIG.SABOTAGE_STATIONS[this.sabotageManager.activeSabotage];
                    if (stations && stations.length > 0) {
                        const st = stations[Math.floor(Math.random() * stations.length)];
                        data.targetX = st.x;
                        data.targetY = st.y;
                    }
                }
            }

            // 3. Crewmate AI Routine
            if (!player.isImpostor) {
                this.updateCrewmateAI(deltaTime, player, data, onTaskDoneByBot);
            } else {
                // 4. Impostor AI Routine
                this.updateImpostorAI(deltaTime, player, data, allPlayers);
            }

            // 5. Apply Movement towards target
            this.moveTowardsTarget(player, data.targetX, data.targetY, deltaTime);
        }
    }

    updateCrewmateAI(deltaTime, bot, data, onTaskDoneByBot) {
        const dist = Math.hypot(bot.x - data.targetX, bot.y - data.targetY);

        if (data.state === 'fixing_sabotage') {
            if (dist < 40) {
                // At sabotage station, fix it
                if (this.sabotageManager.activeSabotage) {
                    this.sabotageManager.fixSabotage();
                }
                data.state = 'wandering';
                data.stateTimer = 3;
            }
            return;
        }

        if (data.state === 'doing_task') {
            if (data.stateTimer <= 0) {
                // Task finished!
                bot.completedTasks++;
                onTaskDoneByBot(bot);
                data.state = 'wandering';
                data.stateTimer = Math.random() * 4 + 3;
                this.pickNewWaypoint(data);
            }
            return;
        }

        // Wandering / finding next task
        if (dist < 50 || data.stateTimer <= 0) {
            // Chance to start a task at current room
            if (Math.random() > 0.45 && CONFIG.TASKS_DATA.length > 0) {
                const randomTask = CONFIG.TASKS_DATA[Math.floor(Math.random() * CONFIG.TASKS_DATA.length)];
                data.targetX = randomTask.x;
                data.targetY = randomTask.y;
                data.targetTask = randomTask;
                data.state = 'doing_task';
                data.stateTimer = Math.random() * 4 + 3; // 3-7s to do task
            } else {
                this.pickNewWaypoint(data);
                data.stateTimer = Math.random() * 5 + 4;
            }
        }
    }

    updateImpostorAI(deltaTime, bot, data, allPlayers) {
        // Impostor Kill Decision
        if (bot.killCooldown <= 0 && !bot.inVent) {
            // Find closest alive crewmate
            let closestCrew = null;
            let closestDist = 9999;

            for (const other of allPlayers) {
                if (other === bot || other.isDead || other.isImpostor) continue;
                const dist = Math.hypot(bot.x - other.x, bot.y - other.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestCrew = other;
                }
            }

            if (closestCrew && closestDist < CONFIG.KILL_DISTANCE) {
                // Check if anyone else is watching
                let witnesses = 0;
                for (const onlooker of allPlayers) {
                    if (onlooker !== bot && onlooker !== closestCrew && !onlooker.isDead) {
                        const distToScene = Math.hypot(onlooker.x - bot.x, onlooker.y - bot.y);
                        if (distToScene < 220) witnesses++;
                    }
                }

                // If isolated or bold, execute kill!
                if (witnesses === 0 || Math.random() > 0.7) {
                    this.executeBotKill(bot, closestCrew);
                    data.state = 'venting';
                    data.stateTimer = 4;
                    this.pickNewWaypoint(data);
                    return;
                }
            } else if (closestCrew && closestDist < 300) {
                // Stalk the isolated crewmate
                data.targetX = closestCrew.x;
                data.targetY = closestCrew.y;
                return;
            }
        }

        // Controlled periodic sabotage trigger by AI Impostor (only after grace period)
        if (this.globalSabotageTimer <= 0 && !this.sabotageManager.activeSabotage && this.sabotageManager.cooldown <= 0) {
            this.globalSabotageTimer = 45; // Next sabotage opportunity in 45s
            const types = ['electrical', 'reactor', 'oxygen'];
            const chosen = types[Math.floor(Math.random() * types.length)];
            this.sabotageManager.triggerSabotage(chosen);
        }

        // Wander / blend in
        const dist = Math.hypot(bot.x - data.targetX, bot.y - data.targetY);
        if (dist < 50 || data.stateTimer <= 0) {
            this.pickNewWaypoint(data);
            data.stateTimer = Math.random() * 5 + 3;
        }
    }

    executeBotKill(bot, victim) {
        victim.isDead = true;
        victim.deadBodyX = victim.x;
        victim.deadBodyY = victim.y;
        victim.reported = false;
        bot.killCooldown = 25; // Reset cooldown
        window.audio.playKill();
    }

    pickNewWaypoint(data) {
        const wp = this.waypoints[Math.floor(Math.random() * this.waypoints.length)];
        data.targetX = wp.x + (Math.random() - 0.5) * 80;
        data.targetY = wp.y + (Math.random() - 0.5) * 80;
    }

    moveTowardsTarget(bot, tx, ty, deltaTime) {
        const dx = tx - bot.x;
        const dy = ty - bot.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 10) {
            bot.vx = (dx / dist);
            bot.vy = (dy / dist);
        } else {
            bot.vx = 0;
            bot.vy = 0;
        }
    }
}

window.BotAIController = BotAIController;
