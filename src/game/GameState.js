export class GameState {
    constructor() {
        this.state = 'playing'; // 'playing', 'gameover'
        this.showingMenu = true; // show menu at start?
        this.score = 0; 
        this.distance = 0;
        this.gatesPassed = 0;
        this.speed = 0; // current speed
        this.coins = 0;   

        this.currentRunPath = [];
        this.lastRunPath = [];
        
        this.bestDistance = 0; // track best distance for ghost replay
        this.bestRunPath = []; // store path of best run

        this.createUI();
    }
    
    startGame() {
        this.showingMenu = false;
        this.showHUD();
        // odstrani menu overlay
        const menuOverlay = document.getElementById('menuOverlay');
        if (menuOverlay) menuOverlay.remove();
    }
    
    createUI() {
        // ustvari overlay za game over
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
            <p style="font-size: 32px; margin: 10px 0;">Razdalja: <span id="finalDistance">0</span> m</p>
            <p style="font-size: 32px; margin: 10px 0;">Število vratc: <span id="finalGates">0</span></p>
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
            ">Še enkrat!</button>
        `;
        
        document.body.appendChild(this.gameOverOverlay);
        
        // ustvari HUD za score in distance med igro
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
            opacity: 0;
            transition: opacity 0.5s ease;
        `;
        this.hud.innerHTML = `
            <div>Razdalja: <span id="distanceDisplay">0</span> m</div>
            <div>Vratca: <span id="gatesDisplay">0</span></div>
            <div>Hitrost: <span id="speedDisplay">0</span> m/s</div>
            <div>Kovanci: <span id="coinsDisplay">0</span> 🪙</div>
        `;
        document.body.appendChild(this.hud);
    }
    
    showHUD() {
        if (this.hud) {
            this.hud.style.opacity = '1';
        }
    }
    
    hideHUD() {
        if (this.hud) {
            this.hud.style.opacity = '0';
        }
    }
    
    update(skierZ, speed = 0) {
        if (this.state === 'playing') {
            // posodobi razdaljo (z je negativen, zato -z)
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

        window.stopMusic?.();
        
        this.state = 'gameover';

        // save current run to lastRunPath for immediate replay
        this.lastRunPath = this.currentRunPath.slice();
        
        // Check if current run is better than best run (by distance)
        if (this.distance > this.bestDistance) {
            this.bestDistance = this.distance;
            this.bestRunPath = this.currentRunPath.slice();
            console.log(`New best distance: ${this.bestDistance}m`);
        }
        
        this.currentRunPath = [];
        
        // Prikaži game over overlay
        this.gameOverOverlay.style.display = 'flex';
        
        // gamer over napis glede na razlog za konec igre
        const titleElement = this.gameOverOverlay.querySelector('h1');
        if (titleElement) {
            titleElement.textContent = reason === 'finish' ? 'CILJ!' : 'KONEC IGRE!';
            titleElement.style.color = reason === 'finish' ? '#00ff00' : 'white';
        }
        
        // posodobi končno razdaljo
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
                'tree': 'Zadel si drevo!',
                'gate': 'Zadel si vratca!',
                'miss-gate': 'Zgrešil si vratca!',
                'finish': 'Čestitamo! Prismučal si do cilja!',
                'obstacle': 'Zadel si hlod!',
            };
            failReason.textContent = messages[reason] ?? 'Konec igre.';
        }

        console.log(`Konec igre! Razlog: ${reason}, Razdalja: ${this.distance}m`);
    }
    
    reset() {
        this.state = 'playing';
        this.score = 0;
        this.distance = 0;
        this.gatesPassed = 0;
        this.speed = 0;
        this.gameOverOverlay.style.display = 'none';
        this.coins = 0;
        this.currentRunPath = [];
        this.gameOverOverlay.style.display = 'none';
        this.showHUD();

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
