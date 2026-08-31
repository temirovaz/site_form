import {defineConfig} from 'vite';
import {createVuePlugin} from 'vite-plugin-vue2';
import path from 'node:path';

// Локальный стенд формы заявки. Боевая сборка (webpack) живёт уровнем выше на серверах
// и этим конфигом не затрагивается.
export default defineConfig({
    plugins: [createVuePlugin()],
    resolve: {
        alias: {
            // На боевом сайте разметка формы лежит в шаблоне Bitrix и компилируется Vue
            // в рантайме, поэтому стенду нужна полная сборка Vue с компилятором шаблонов.
            vue: 'vue/dist/vue.esm.js',
        },
        // .scss нужен: entries/application.js импортирует "../scss/main" без расширения
        extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.vue', '.scss'],
    },
    server: {
        port: 5173,
    },
    css: {
        preprocessorOptions: {
            scss: {
                // foundation-sites сыплет deprecation-предупреждениями Dart Sass — глушим их,
                // чтобы в выводе были видны только свои проблемы
                quietDeps: true,
                silenceDeprecations: ['import', 'global-builtin', 'legacy-js-api', 'if-function'],
                importer: [
                    (url) => (url.startsWith('~') ? {file: url.slice(1)} : null),
                    (url) => (url === 'normalize.css'
                        ? {file: path.resolve('node_modules/normalize.css/normalize.css')}
                        : null),
                ],
                includePaths: ['node_modules'],
            },
        },
    },
});
