/**
 * Loading Screen Manager
 * Shows progress while game assets load
 */

export class LoadingScreen {
    constructor() {
        this.container = null;
        this.progressBar = null;
        this.statusText = null;
        this.progress = 0;
        this.create();
    }

    create() {
        // Create loading overlay
        this.container = document.createElement('div');
        this.container.id = 'loading-screen';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #0a0e27 0%, #1a1a2e 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Courier New', monospace;
        `;

        // Game title
        const title = document.createElement('h1');
        title.textContent = 'REMOTE COMMAND';
        title.style.cssText = `
            color: #00ff88;
            font-size: 48px;
            margin-bottom: 20px;
            text-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
            letter-spacing: 4px;
        `;
        this.container.appendChild(title);

        // Status text
        this.statusText = document.createElement('div');
        this.statusText.textContent = 'Initializing...';
        this.statusText.style.cssText = `
            color: #aaaaaa;
            font-size: 16px;
            margin-bottom: 20px;
            min-height: 24px;
        `;
        this.container.appendChild(this.statusText);

        // Progress bar container
        const barContainer = document.createElement('div');
        barContainer.style.cssText = `
            width: 400px;
            max-width: 80vw;
            height: 30px;
            background: rgba(0, 0, 0, 0.5);
            border: 2px solid #00ff88;
            border-radius: 15px;
            overflow: hidden;
            position: relative;
        `;

        // Progress bar fill
        this.progressBar = document.createElement('div');
        this.progressBar.style.cssText = `
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #00ff88 0%, #00cc66 100%);
            transition: width 0.3s ease-out;
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.6);
        `;
        barContainer.appendChild(this.progressBar);

        // Percentage text
        this.percentText = document.createElement('div');
        this.percentText.textContent = '0%';
        this.percentText.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-weight: bold;
            font-size: 14px;
            text-shadow: 1px 1px 2px black;
        `;
        barContainer.appendChild(this.percentText);

        this.container.appendChild(barContainer);

        // Add to page
        document.body.appendChild(this.container);
    }

    setProgress(percent, status = null) {
        this.progress = Math.max(0, Math.min(100, percent));
        if (this.progressBar) {
            this.progressBar.style.width = `${this.progress}%`;
        }
        if (this.percentText) {
            this.percentText.textContent = `${Math.round(this.progress)}%`;
        }
        if (status && this.statusText) {
            this.statusText.textContent = status;
        }
    }

    async complete() {
        this.setProgress(100, 'Ready!');
        await new Promise(resolve => setTimeout(resolve, 500));
        this.hide();
    }

    hide() {
        if (this.container) {
            this.container.style.opacity = '0';
            this.container.style.transition = 'opacity 0.5s ease-out';
            setTimeout(() => {
                if (this.container && this.container.parentNode) {
                    this.container.parentNode.removeChild(this.container);
                }
            }, 500);
        }
    }
}
