import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    esbuild: {
        jsx: 'automatic',
        jsxImportSource: 'react',
    },
    test: {
        include: ['client/src/**/*.test.ts', 'client/src/**/*.test.tsx', 'client/tests/**/*.vitest.ts'],
        exclude: ['client/e2e/**', 'node_modules/**', 'functions/**'],
        globals: true,
        environment: 'jsdom',
        setupFiles: ['client/src/__tests__/setup.ts'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'client', 'src'),
        },
    },
});
