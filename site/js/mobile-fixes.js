/**
 * Mobile Interface Fixes
 * Improves touch handling, viewport management, and mobile controls
 */

export class MobileFixes {
    constructor() {
        this.isMobile = this.detectMobile();
        this.touchStartTime = 0;
        this.lastTouchEnd = 0;
    }

    /**
     * Detect if the device is mobile/tablet
     */
    detectMobile() {
        // Check for touch capability and screen size
        const hasTouch = ('ontouchstart' in window) ||
                        (navigator.maxTouchPoints > 0) ||
                        (navigator.msMaxTouchPoints > 0);

        // Check for mobile user agent
        const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // Check screen size
        const smallScreen = window.innerWidth <= 860 || window.innerHeight <= 600;

        // Check CSS media query
        const mediaQuery = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

        return hasTouch || mobileUA || smallScreen || mediaQuery;
    }

    /**
     * Initialize all mobile fixes
     */
    init() {
        if (!this.isMobile) {
            console.log('[MobileFixes] Desktop detected, skipping mobile optimizations');
            return;
        }

        console.log('[MobileFixes] Mobile device detected, applying optimizations');

        // Prevent unwanted behaviors
        this.preventDefaultBehaviors();

        // Fix viewport scaling
        this.fixViewport();

        // Enhance touch controls
        this.enhanceTouchControls();

        // Optimize performance
        this.optimizePerformance();

        // Fix canvas interaction
        this.fixCanvasInteraction();

        // Handle orientation changes
        this.handleOrientationChanges();
    }

    /**
     * Prevent default mobile behaviors that interfere with the game
     */
    preventDefaultBehaviors() {
        // Prevent double-tap zoom
        document.addEventListener('touchstart', (e) => {
            const now = Date.now();
            const timeSinceLastTouch = now - this.lastTouchEnd;

            if (timeSinceLastTouch < 300 && timeSinceLastTouch > 0) {
                e.preventDefault();
            }

            this.touchStartTime = now;
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            this.lastTouchEnd = Date.now();
        });

        // Prevent pinch zoom
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // Prevent gestures on game canvas
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            canvas.addEventListener('touchstart', (e) => {
                // Allow single touch for aiming but prevent multi-touch
                if (e.touches.length > 1) {
                    e.preventDefault();
                }
            }, { passive: false });

            // Prevent context menu on long press
            canvas.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });
        }

        // Prevent page scroll when interacting with controls
        const controls = ['#joystick', '#angle-dial', '#mobile-fire', '#weapon-grid-toggle'];
        controls.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.addEventListener('touchmove', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }, { passive: false });
            }
        });

        // Disable pull-to-refresh
        document.body.style.overscrollBehavior = 'none';
    }

    /**
     * Fix viewport for better mobile display
     */
    fixViewport() {
        // Update viewport meta tag for better control
        let viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
        }

        // Ensure full screen usage on mobile
        document.documentElement.style.height = '100%';
        document.body.style.height = '100%';
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.touchAction = 'none';
    }

    /**
     * Enhance touch controls responsiveness
     */
    enhanceTouchControls() {
        // Enhance joystick
        const joystick = document.getElementById('joystick');
        if (joystick) {
            // Make touch area larger
            joystick.style.width = '120px';
            joystick.style.height = '120px';

            // Add visual feedback
            joystick.addEventListener('touchstart', () => {
                joystick.style.transform = 'scale(1.1)';
            });

            joystick.addEventListener('touchend', () => {
                joystick.style.transform = 'scale(1)';
            });
        }

        // Enhance angle dial
        const angleDial = document.getElementById('angle-dial');
        if (angleDial) {
            // Make touch area larger
            angleDial.style.width = '120px';
            angleDial.style.height = '120px';

            // Add haptic feedback if available
            angleDial.addEventListener('touchstart', () => {
                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
            });
        }

        // Enhance fire button
        const fireBtn = document.getElementById('mobile-fire');
        if (fireBtn) {
            // Make button larger on mobile
            fireBtn.style.width = '80px';
            fireBtn.style.height = '80px';
            fireBtn.style.fontSize = '24px';

            // Add visual and haptic feedback
            fireBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                fireBtn.style.transform = 'scale(0.95)';
                fireBtn.style.background = 'linear-gradient(135deg, rgba(255, 100, 100, 0.8), rgba(255, 50, 50, 0.8))';

                if (navigator.vibrate) {
                    navigator.vibrate(20);
                }
            });

            fireBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                fireBtn.style.transform = 'scale(1)';
                fireBtn.style.background = 'linear-gradient(135deg, rgba(255, 77, 77, 0.6), rgba(255, 0, 0, 0.6))';
            });
        }

        // Improve weapon selector
        const weaponToggle = document.getElementById('weapon-grid-toggle');
        if (weaponToggle) {
            weaponToggle.style.fontSize = '20px';
            weaponToggle.style.padding = '12px';
        }
    }

    /**
     * Optimize performance for mobile devices
     */
    optimizePerformance() {
        // Reduce particle effects on mobile
        if (window.game) {
            try {
                // Reduce max particles
                if (game.particleSystem) {
                    game.particleSystem.maxParticles = Math.floor(game.particleSystem.maxParticles * 0.5);
                }

                // Reduce debris
                if (game.debrisSystem) {
                    game.debrisSystem.maxDebris = Math.floor(game.debrisSystem.maxDebris * 0.6);
                }

                // Simplify sky effects
                if (game.skyKnobs?.stars) {
                    game.skyKnobs.stars.count = Math.floor(game.skyKnobs.stars.count * 0.5);
                }
            } catch (e) {
                console.warn('[MobileFixes] Could not optimize game performance:', e);
            }
        }
    }

    /**
     * Fix canvas interaction on mobile
     */
    fixCanvasInteraction() {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) return;

        // Track active touches for proper coordinate calculation
        const activeTouches = new Map();

        canvas.addEventListener('touchstart', (e) => {
            const rect = canvas.getBoundingClientRect();

            for (const touch of e.changedTouches) {
                const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
                const y = (touch.clientY - rect.top) * (canvas.height / rect.height);

                activeTouches.set(touch.identifier, { x, y });

                // Dispatch synthetic mouse event for game compatibility
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    screenX: touch.screenX,
                    screenY: touch.screenY,
                    bubbles: true,
                    cancelable: true
                });

                canvas.dispatchEvent(mouseEvent);
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();

            for (const touch of e.changedTouches) {
                if (activeTouches.has(touch.identifier)) {
                    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
                    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);

                    activeTouches.set(touch.identifier, { x, y });

                    // Dispatch synthetic mouse event
                    const mouseEvent = new MouseEvent('mousemove', {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        screenX: touch.screenX,
                        screenY: touch.screenY,
                        bubbles: true,
                        cancelable: true
                    });

                    canvas.dispatchEvent(mouseEvent);
                }
            }
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            for (const touch of e.changedTouches) {
                activeTouches.delete(touch.identifier);

                // Dispatch synthetic mouse event
                const mouseEvent = new MouseEvent('mouseup', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    screenX: touch.screenX,
                    screenY: touch.screenY,
                    bubbles: true,
                    cancelable: true
                });

                canvas.dispatchEvent(mouseEvent);
            }
        });

        canvas.addEventListener('touchcancel', (e) => {
            for (const touch of e.changedTouches) {
                activeTouches.delete(touch.identifier);
            }
        });
    }

    /**
     * Handle orientation changes
     */
    handleOrientationChanges() {
        const handleOrientationChange = () => {
            // Force canvas resize
            if (window.game) {
                setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));

                    // Adjust control positions based on orientation
                    const isLandscape = window.innerWidth > window.innerHeight;

                    const joystick = document.getElementById('joystick');
                    const angleDial = document.getElementById('angle-dial');
                    const fireBtn = document.getElementById('mobile-fire');

                    if (isLandscape) {
                        // Landscape layout - spread controls more
                        if (joystick) {
                            joystick.style.bottom = '20px';
                            joystick.style.left = '20px';
                        }
                        if (angleDial) {
                            angleDial.style.bottom = '20px';
                            angleDial.style.right = '120px';
                        }
                        if (fireBtn) {
                            fireBtn.style.bottom = '20px';
                            fireBtn.style.right = '20px';
                        }
                    } else {
                        // Portrait layout - stack controls
                        if (joystick) {
                            joystick.style.bottom = '88px';
                            joystick.style.left = '16px';
                        }
                        if (angleDial) {
                            angleDial.style.bottom = '168px';
                            angleDial.style.right = '16px';
                        }
                        if (fireBtn) {
                            fireBtn.style.bottom = '20px';
                            fireBtn.style.right = '16px';
                        }
                    }
                }, 100);
            }
        };

        window.addEventListener('orientationchange', handleOrientationChange);
        window.addEventListener('resize', handleOrientationChange);

        // Initial check
        handleOrientationChange();
    }

    /**
     * Enable fullscreen on mobile (when supported)
     */
    requestFullscreen() {
        const element = document.documentElement;

        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    }
}

// Auto-initialize on load
const mobileFixes = new MobileFixes();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mobileFixes.init());
} else {
    mobileFixes.init();
}

export default mobileFixes;