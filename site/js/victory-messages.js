/**
 * Victory messages and animations for Scorched Earth
 * Provides dynamic, contextual victory/defeat messages
 */

export const VictoryMessages = {
    // Victory messages (winner perspective)
    victory: [
        "Tank-tastic Victory!",
        "You dominated the battlefield!",
        "Mission Accomplished!",
        "Unstoppable Force!",
        "You reign supreme!",
        "Boom goes the dynamite!",
        "Direct hit on victory!",
        "You crushed them!",
        "Total domination!",
        "You brought the heat!",
        "Tank you very much!",
        "Artillery master!",
        "You leveled the playing field!",
        "Victory is yours, Commander!",
        "Explosive performance!",
        "You turned up the pressure!",
        "Battlefield genius!",
        "You conquered all!",
        "Supreme commander!",
        "Flawless victory!"
    ],

    // Defeat messages (loser perspective)
    defeat: [
        "Better luck next time!",
        "You blew it!",
        "That was a blast... for them!",
        "Back to tank school!",
        "You got schooled!",
        "Ouch! That hurt!",
        "Why did you do that?",
        "You call that a shot?",
        "Is that all you've got?",
        "Tank fail!",
        "Boom! You're done!",
        "Wrecked!",
        "You've been terminated!",
        "Game over, man!",
        "That didn't go as planned...",
        "Your tank needs repairs!",
        "Defeated but not destroyed!",
        "Time for target practice!",
        "Back to the drawing board!",
        "You fought valiantly!"
    ],

    // Close match messages
    closeMatch: [
        "What a nail-biter!",
        "That was too close!",
        "Epic battle!",
        "Down to the wire!",
        "Heart-stopping finish!",
        "Incredible match!",
        "That could've gone either way!",
        "Photo finish!",
        "What a showdown!",
        "Legendary battle!"
    ],

    // Perfect game messages (no damage taken)
    perfect: [
        "PERFECT! Not a scratch!",
        "Untouchable!",
        "Flawless execution!",
        "Master tactician!",
        "Godlike!",
        "Absolutely perfect!",
        "No one could touch you!",
        "Legendary performance!",
        "You're invincible!",
        "Ultimate tank commander!"
    ],

    // Quick victory messages (won in few turns)
    quick: [
        "Lightning fast victory!",
        "That was quick!",
        "Speed demon!",
        "Rapid fire victory!",
        "Blitzkrieg!",
        "Swift and deadly!",
        "Quick and clean!",
        "Efficiency expert!",
        "No time wasted!",
        "Express delivery!"
    ],

    // Long battle messages
    marathon: [
        "What an epic battle!",
        "Marathon match!",
        "War of attrition!",
        "That took forever!",
        "Endurance test complete!",
        "Epic struggle!",
        "Battle for the ages!",
        "Persistence pays off!",
        "Long but worth it!",
        "Tactical masterpiece!"
    ],

    // Team victory
    team: [
        "Teamwork makes the dream work!",
        "United we stand!",
        "Team victory!",
        "Squad goals achieved!",
        "Better together!",
        "Coordinated destruction!",
        "Team domination!",
        "Allied forces win!",
        "Combined arms victory!",
        "Unity is strength!"
    ],

    // AI victory (when AI wins)
    aiVictory: [
        "The machines have won!",
        "AI supremacy achieved!",
        "Skynet sends its regards!",
        "Resistance is futile!",
        "Silicon superiority!",
        "The algorithm prevails!",
        "Calculated victory!",
        "Processing... Victory!",
        "AI overlord victorious!",
        "Human defeated by code!"
    ],

    /**
     * Get a contextual victory message based on game state
     */
    getVictoryMessage(winner, stats = {}) {
        const {
            turnCount = 0,
            damageDealt = 0,
            damageTaken = 0,
            isTeamGame = false,
            isAI = false,
            closeMatch = false
        } = stats;

        // AI victory
        if (isAI) {
            return this.aiVictory[Math.floor(Math.random() * this.aiVictory.length)];
        }

        // Team victory
        if (isTeamGame) {
            return this.team[Math.floor(Math.random() * this.team.length)];
        }

        // Perfect game (no damage taken)
        if (damageTaken === 0 && damageDealt > 0) {
            return this.perfect[Math.floor(Math.random() * this.perfect.length)];
        }

        // Quick victory (less than 5 turns)
        if (turnCount < 5 && turnCount > 0) {
            return this.quick[Math.floor(Math.random() * this.quick.length)];
        }

        // Long battle (more than 20 turns)
        if (turnCount > 20) {
            return this.marathon[Math.floor(Math.random() * this.marathon.length)];
        }

        // Close match
        if (closeMatch) {
            return this.closeMatch[Math.floor(Math.random() * this.closeMatch.length)];
        }

        // Default victory message
        return this.victory[Math.floor(Math.random() * this.victory.length)];
    },

    /**
     * Get a defeat message
     */
    getDefeatMessage() {
        return this.defeat[Math.floor(Math.random() * this.defeat.length)];
    },

    /**
     * Create victory animation elements
     */
    createVictoryAnimation(message, isVictory = true) {
        const container = document.createElement('div');
        container.className = 'victory-animation';
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            text-align: center;
            pointer-events: none;
            animation: victoryPulse 2s ease-out;
        `;

        const messageEl = document.createElement('h1');
        messageEl.textContent = message;
        messageEl.style.cssText = `
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 48px;
            font-weight: bold;
            color: ${isVictory ? '#00ff00' : '#ff4444'};
            text-shadow:
                2px 2px 4px rgba(0,0,0,0.8),
                0 0 20px ${isVictory ? 'rgba(0,255,0,0.5)' : 'rgba(255,68,68,0.5)'};
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg,
                ${isVictory ? 'rgba(0,50,0,0.9)' : 'rgba(50,0,0,0.9)'},
                rgba(0,0,0,0.8));
            border-radius: 10px;
            border: 2px solid ${isVictory ? '#00ff00' : '#ff4444'};
        `;

        container.appendChild(messageEl);

        // Add CSS animation if not already present
        if (!document.querySelector('#victory-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'victory-animation-styles';
            style.textContent = `
                @keyframes victoryPulse {
                    0% {
                        transform: translate(-50%, -50%) scale(0.5);
                        opacity: 0;
                    }
                    20% {
                        transform: translate(-50%, -50%) scale(1.1);
                        opacity: 1;
                    }
                    40% {
                        transform: translate(-50%, -50%) scale(1);
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        return container;
    }
};

export default VictoryMessages;