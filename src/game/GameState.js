export class GameState {
    constructor() {
        this.state = 'playing'; // 'playing', 'gameover'
        this.score = 0; // reserved for future
        this.distance = 0;
        this.gatesPassed = 0;
        this.speed = 0; // current speed
        this.coins = 0;
        this.createUI();
    }
    
    createUI() {
        // Ustvari overlay za game over
        this.gameOverOverlay = document.createElement('div');
        this.gameOverOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            color: white;
            font-family: Arial, sans-serif;
            z-index: 1000;
        `;
        
        this.gameOverOverlay.innerHTML = `
            <h1 style="font-size: 72px; margin: 0;">GAME OVER</h1>
            <p style="font-size: 32px; margin: 10px 0;">Distance: <span id="finalDistance">0</span> m</p>
            <p style="font-size: 32px; margin: 10px 0;">Gates Passed: <span id="finalGates">0</span></p>
            <p id="failReason" style="font-size: 20px; margin: 5px 0; opacity: 0.9;"></p>
            <button id="restartButton" style="
                font-size: 24px;
                padding: 15px 40px;
                margin-top: 20px;
                cursor: pointer;
                background: #ff4444;
                color: white;
                border: none;
                border-radius: 8px;
            ">Restart</button>
        `;
        
        document.body.appendChild(this.gameOverOverlay);
        
        // Ustvari HUD za score in distance med igro
        this.hud = document.createElement('div');
        this.hud.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 24px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            z-index: 100;
        `;
        this.hud.innerHTML = `
            <div>Distance: <span id="distanceDisplay">0</span> m</div>
            <div>Gates: <span id="gatesDisplay">0</span></div>
            <div>Speed: <span id="speedDisplay">0</span> m/s</div>
            <div>Coins: <span id="coinsDisplay">0</span> 🪙</div>
        `;
        document.body.appendChild(this.hud);
    }
    
    update(skierZ, speed = 0) {
        if (this.state === 'playing') {
            // Posodobi razdaljo (z je negativen, zato -z)
            this.distance = Math.max(0, Math.floor(-skierZ));
            this.speed = speed;
            
            const distanceDisplay = document.getElementById('distanceDisplay');
            if (distanceDisplay) {
                distanceDisplay.textContent = this.distance;
            }

            const gatesDisplay = document.getElementById('gatesDisplay');
            if (gatesDisplay) {
                gatesDisplay.textContent = this.gatesPassed;
            }
            
            const speedDisplay = document.getElementById('speedDisplay');
            if (speedDisplay) {
                speedDisplay.textContent = Math.round(this.speed);
            }
            const coinsDisplay = document.getElementById('coinsDisplay');
            if (coinsDisplay) {
            coinsDisplay.textContent = this.coins;
            }

        }
    }
    
    gameOver(reason = 'collision') {
        if (this.state === 'gameover') return;
        
        this.state = 'gameover';
        
        // Prikaži game over overlay
        this.gameOverOverlay.style.display = 'flex';
        
        // Update title based on finish or crash
        const titleElement = this.gameOverOverlay.querySelector('h1');
        if (titleElement) {
            titleElement.textContent = reason === 'finish' ? 'FINISH!' : 'GAME OVER';
            titleElement.style.color = reason === 'finish' ? '#00ff00' : 'white';
        }
        
        // Posodobi končno razdaljo
        const finalDistance = document.getElementById('finalDistance');
        if (finalDistance) {
            finalDistance.textContent = this.distance;
        }

        const finalGates = document.getElementById('finalGates');
        if (finalGates) {
            finalGates.textContent = this.gatesPassed;
        }

        const failReason = document.getElementById('failReason');
        if (failReason) {
            const messages = {
                'tree': 'You crashed into a tree!',
                'gate': 'You hit a gate pole!',
                'miss-gate': 'You missed a gate!',
                'finish': 'Congratulations! You finished the course! 🏁',
                'collision': 'You crashed!',
            };
            failReason.textContent = messages[reason] ?? 'Game over.';
        }
        
        console.log(`Game Over! Reason: ${reason}, Distance: ${this.distance}m`);
    }
    
    reset() {
        this.state = 'playing';
        this.score = 0;
        this.distance = 0;
        this.gatesPassed = 0;
        this.speed = 0;
        this.gameOverOverlay.style.display = 'none';
        this.coins = 0;
        this.gameOverOverlay.style.display = 'none';

        const coinsDisplay = document.getElementById('coinsDisplay');
        if (coinsDisplay) coinsDisplay.textContent = 0;
    }
    
    isPlaying() {
        return this.state === 'playing';
    }

    gatePassed() {
        if (this.state !== 'playing') return;
        this.gatesPassed += 1;
    }
}
