/**
 * Memory Manager - Centralized resource cleanup and memory management
 * Prevents memory leaks by tracking and cleaning up all resources
 */

export class MemoryManager {
    constructor() {
        this.eventListeners = new Map();
        this.timers = new Set();
        this.intervals = new Set();
        this.pixiResources = new Set();
        this.howlResources = new Set();
        this.animationFrames = new Set();
        this.observers = new Set();
        this.disposed = false;
    }

    /**
     * Track an event listener for cleanup
     */
    addEventListener(target, event, handler, options) {
        if (this.disposed) return;

        target.addEventListener(event, handler, options);

        const key = `${target.constructor.name}_${event}`;
        if (!this.eventListeners.has(key)) {
            this.eventListeners.set(key, []);
        }

        this.eventListeners.get(key).push({
            target,
            event,
            handler,
            options
        });
    }

    /**
     * Track a setTimeout for cleanup
     */
    setTimeout(callback, delay) {
        if (this.disposed) return null;

        const timer = setTimeout(() => {
            this.timers.delete(timer);
            callback();
        }, delay);

        this.timers.add(timer);
        return timer;
    }

    /**
     * Track a setInterval for cleanup
     */
    setInterval(callback, interval) {
        if (this.disposed) return null;

        const intervalId = setInterval(callback, interval);
        this.intervals.add(intervalId);
        return intervalId;
    }

    /**
     * Clear a specific timer
     */
    clearTimeout(timer) {
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(timer);
        }
    }

    /**
     * Clear a specific interval
     */
    clearInterval(intervalId) {
        if (intervalId) {
            clearInterval(intervalId);
            this.intervals.delete(intervalId);
        }
    }

    /**
     * Track a Pixi.js resource
     */
    addPixiResource(resource) {
        if (this.disposed) return;
        this.pixiResources.add(resource);
    }

    /**
     * Track a Howler resource
     */
    addHowlResource(howl) {
        if (this.disposed) return;
        this.howlResources.add(howl);
    }

    /**
     * Track an animation frame request
     */
    requestAnimationFrame(callback) {
        if (this.disposed) return null;

        const frame = requestAnimationFrame(() => {
            this.animationFrames.delete(frame);
            callback();
        });

        this.animationFrames.add(frame);
        return frame;
    }

    /**
     * Cancel a specific animation frame
     */
    cancelAnimationFrame(frame) {
        if (frame) {
            cancelAnimationFrame(frame);
            this.animationFrames.delete(frame);
        }
    }

    /**
     * Track an observer (MutationObserver, IntersectionObserver, etc.)
     */
    addObserver(observer) {
        if (this.disposed) return;
        this.observers.add(observer);
    }

    /**
     * Clean up all tracked resources
     */
    dispose() {
        if (this.disposed) return;
        this.disposed = true;

        console.log('[MemoryManager] Starting cleanup...');

        // Remove all event listeners
        let listenerCount = 0;
        for (const [key, listeners] of this.eventListeners.entries()) {
            for (const { target, event, handler, options } of listeners) {
                try {
                    target.removeEventListener(event, handler, options);
                    listenerCount++;
                } catch (e) {
                    console.warn(`Failed to remove listener ${key}:`, e);
                }
            }
        }
        this.eventListeners.clear();

        // Clear all timers
        let timerCount = 0;
        for (const timer of this.timers) {
            clearTimeout(timer);
            timerCount++;
        }
        this.timers.clear();

        // Clear all intervals
        let intervalCount = 0;
        for (const interval of this.intervals) {
            clearInterval(interval);
            intervalCount++;
        }
        this.intervals.clear();

        // Cancel all animation frames
        let frameCount = 0;
        for (const frame of this.animationFrames) {
            cancelAnimationFrame(frame);
            frameCount++;
        }
        this.animationFrames.clear();

        // Disconnect all observers
        let observerCount = 0;
        for (const observer of this.observers) {
            try {
                observer.disconnect();
                observerCount++;
            } catch (e) {
                console.warn('Failed to disconnect observer:', e);
            }
        }
        this.observers.clear();

        // Destroy Pixi resources
        let pixiCount = 0;
        for (const resource of this.pixiResources) {
            try {
                if (resource.destroy) {
                    resource.destroy(true);
                } else if (resource.dispose) {
                    resource.dispose();
                }
                pixiCount++;
            } catch (e) {
                console.warn('Failed to destroy Pixi resource:', e);
            }
        }
        this.pixiResources.clear();

        // Unload Howler resources
        let howlCount = 0;
        for (const howl of this.howlResources) {
            try {
                howl.unload();
                howlCount++;
            } catch (e) {
                console.warn('Failed to unload Howl resource:', e);
            }
        }
        this.howlResources.clear();

        console.log(`[MemoryManager] Cleanup complete:
            - ${listenerCount} event listeners removed
            - ${timerCount} timers cleared
            - ${intervalCount} intervals cleared
            - ${frameCount} animation frames canceled
            - ${observerCount} observers disconnected
            - ${pixiCount} Pixi resources destroyed
            - ${howlCount} Howl resources unloaded`);
    }

    /**
     * Get memory usage statistics
     */
    getStats() {
        return {
            eventListeners: Array.from(this.eventListeners.values()).reduce((sum, arr) => sum + arr.length, 0),
            timers: this.timers.size,
            intervals: this.intervals.size,
            animationFrames: this.animationFrames.size,
            observers: this.observers.size,
            pixiResources: this.pixiResources.size,
            howlResources: this.howlResources.size,
            disposed: this.disposed
        };
    }
}

// Global memory manager instance
let globalMemoryManager = null;

/**
 * Get or create the global memory manager
 */
export function getMemoryManager() {
    if (!globalMemoryManager) {
        globalMemoryManager = new MemoryManager();

        // Attach cleanup to window unload
        window.addEventListener('beforeunload', () => {
            globalMemoryManager.dispose();
        });

        // Also clean up on page hide (mobile browsers)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && globalMemoryManager) {
                const stats = globalMemoryManager.getStats();
                console.log('[MemoryManager] Page hidden, current stats:', stats);
            }
        });
    }

    return globalMemoryManager;
}

/**
 * Reset the memory manager (useful for game restarts)
 */
export function resetMemoryManager() {
    if (globalMemoryManager) {
        globalMemoryManager.dispose();
        globalMemoryManager = null;
    }
    return getMemoryManager();
}

export default { MemoryManager, getMemoryManager, resetMemoryManager };