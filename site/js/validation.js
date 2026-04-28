/**
 * Input Validation and Sanitization Utilities
 * Provides XSS protection and input validation for user-provided data
 */

/**
 * Sanitize a string to prevent XSS attacks
 * Removes HTML tags and dangerous characters
 */
export function sanitizeText(input, maxLength = 100) {
    if (typeof input !== 'string') {
        return '';
    }

    // Trim whitespace
    let sanitized = input.trim();

    // Limit length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    // Remove HTML tags and dangerous characters
    // Create a temporary div to use browser's built-in HTML entity encoding
    const div = document.createElement('div');
    div.textContent = sanitized;
    sanitized = div.innerHTML;

    // Additional safety: remove any remaining script-like patterns
    sanitized = sanitized
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');

    return sanitized;
}

/**
 * Validate and sanitize a player name
 * Returns a safe name or a default if invalid
 */
export function validatePlayerName(name, defaultName = 'Player') {
    if (!name || typeof name !== 'string') {
        return defaultName;
    }

    // Sanitize first
    let safeName = sanitizeText(name, 20);

    // Remove leading/trailing whitespace
    safeName = safeName.trim();

    // Must have at least 1 character
    if (safeName.length === 0) {
        return defaultName;
    }

    // Only allow alphanumeric, spaces, and common punctuation
    safeName = safeName.replace(/[^a-zA-Z0-9\s\-_\.]/g, '');

    // Collapse multiple spaces
    safeName = safeName.replace(/\s+/g, ' ');

    // Final trim
    safeName = safeName.trim();

    return safeName || defaultName;
}

/**
 * Validate a color string (hex format)
 */
export function validateColor(color, defaultColor = '#00ff00') {
    if (!color || typeof color !== 'string') {
        return defaultColor;
    }

    // Must be a valid hex color
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    if (!hexPattern.test(color)) {
        return defaultColor;
    }

    return color;
}

/**
 * Validate a number within a range
 */
export function validateNumber(value, min, max, defaultValue) {
    const num = Number(value);

    if (!Number.isFinite(num)) {
        return defaultValue;
    }

    return Math.max(min, Math.min(max, num));
}

/**
 * Validate an integer within a range
 */
export function validateInteger(value, min, max, defaultValue) {
    const num = Math.floor(Number(value));

    if (!Number.isFinite(num)) {
        return defaultValue;
    }

    return Math.max(min, Math.min(max, num));
}

/**
 * Validate a boolean value
 */
export function validateBoolean(value, defaultValue = false) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === '1' || lower === 'yes') {
            return true;
        }
        if (lower === 'false' || lower === '0' || lower === 'no') {
            return false;
        }
    }

    if (typeof value === 'number') {
        return value !== 0;
    }

    return defaultValue;
}

/**
 * Validate a string is one of allowed values
 */
export function validateEnum(value, allowedValues, defaultValue) {
    if (!value || typeof value !== 'string') {
        return defaultValue;
    }

    if (allowedValues.includes(value)) {
        return value;
    }

    return defaultValue;
}

/**
 * Safely parse JSON with error handling
 */
export function safeJSONParse(jsonString, defaultValue = null) {
    if (!jsonString || typeof jsonString !== 'string') {
        return defaultValue;
    }

    try {
        const parsed = JSON.parse(jsonString);
        return parsed;
    } catch (error) {
        console.error('[validation] Failed to parse JSON:', error);
        return defaultValue;
    }
}

/**
 * Validate localStorage data before using
 */
export function validateLocalStorage(key, validator = null) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) {
            return null;
        }

        const data = safeJSONParse(raw);
        if (!data) {
            return null;
        }

        // Apply custom validator if provided
        if (validator && typeof validator === 'function') {
            return validator(data);
        }

        return data;
    } catch (error) {
        console.error(`[validation] Failed to read from localStorage key "${key}":`, error);
        return null;
    }
}

/**
 * Safely write to localStorage with error handling
 */
export function safeLocalStorageSet(key, value) {
    try {
        const jsonString = JSON.stringify(value);
        localStorage.setItem(key, jsonString);
        return true;
    } catch (error) {
        console.error(`[validation] Failed to write to localStorage key "${key}":`, error);

        // Check if it's a quota exceeded error
        if (error.name === 'QuotaExceededError') {
            console.warn('[validation] localStorage quota exceeded. Consider clearing old data.');
        }

        return false;
    }
}

/**
 * Validate tank configuration object
 */
export function validateTankConfig(config) {
    if (!config || typeof config !== 'object') {
        return null;
    }

    return {
        x: validateNumber(config.x, 0, 10000, 0),
        y: validateNumber(config.y, 0, 10000, 0),
        color: validateColor(config.color, '#00ff00'),
        name: validatePlayerName(config.name, 'Player'),
        isAI: validateBoolean(config.isAI, false),
        aiSkill: validateEnum(config.aiSkill, ['easy', 'medium', 'hard'], 'medium'),
        style: validateEnum(config.style, ['classic', 'heavy', 'sleek'], 'classic'),
        health: validateNumber(config.health, 0, 1000, 100),
        maxHealth: validateNumber(config.maxHealth, 1, 1000, 100),
        fuel: validateNumber(config.fuel, 0, 999999, 200),
        maxFuel: validateNumber(config.maxFuel, 1, 999999, 200)
    };
}
