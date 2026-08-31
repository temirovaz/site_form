import {defineConfig} from 'vite';
import {createVuePlugin} from 'vite-plugin-vue2';

export default defineConfig({
    plugins: [createVuePlugin()],
    test: {
        environment: 'jsdom',
        include: ['tests/unit/**/*.spec.js'],
        globals: true,
        restoreMocks: true,
    },
});
