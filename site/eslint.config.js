import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        globalThis: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        HTMLElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLDialogElement: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        TouchEvent: 'readonly',
        KeyboardEvent: 'readonly',
        Image: 'readonly',
        Audio: 'readonly',
        AudioContext: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        ResizeObserver: 'readonly',
        IntersectionObserver: 'readonly',
        MutationObserver: 'readonly',
        performance: 'readonly',
        fetch: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        location: 'readonly',
        history: 'readonly',
        screen: 'readonly',
        devicePixelRatio: 'readonly',
        innerWidth: 'readonly',
        innerHeight: 'readonly',
        getComputedStyle: 'readonly',
        matchMedia: 'readonly',
        queueMicrotask: 'readonly',
        structuredClone: 'readonly',
        __BUILD_VERSION__: 'readonly',
        __BUILD_HASH__: 'readonly',
        __BUILD_DATE__: 'readonly',
        module: 'readonly',
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-empty': 'off',
      'no-undef': 'off',
      'no-useless-escape': 'warn',
    }
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'scripts/**']
  }
];
