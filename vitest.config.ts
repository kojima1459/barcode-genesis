import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        include: ['client/src/**/*.test.ts', 'client/tests/**/*.vitest.ts'],
        exclude: ['client/e2e/**', 'node_modules/**', 'functions/**'],
        globals: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'client', 'src'),
        },
    },
});
