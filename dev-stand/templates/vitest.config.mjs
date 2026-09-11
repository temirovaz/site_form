import {defineConfig} from 'vite';
import {createVuePlugin} from 'vite-plugin-vue2';

export default defineConfig({
    plugins: [createVuePlugin()],
    resolve: {
        // Без .vue резолв импортов вида "./wizard/steps/contacts" (без расширения) падает:
        // тесты, монтирующие настоящие .vue-компоненты, не запускаются вовсе.
        // Список расширений держим в синхроне с vite.config.js.
        extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    },
    test: {
        environment: 'jsdom',
        include: ['tests/unit/**/*.spec.js'],
        globals: true,
        restoreMocks: true,
    },
});
