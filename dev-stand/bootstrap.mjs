#!/usr/bin/env node
/**
 * Разворачивает конфиги локального стенда в корень репозитория.
 *
 * package.json, vite.config.mjs, vitest.config.mjs, playwright.config.mjs, index.html —
 * не отслеживаются git в корне (см. .gitignore): корень репозитория физически совпадает
 * с local/templates/aspro-allcorp2/resources/ на серверах, а боевой webpack-конфиг лежит
 * уровнем выше и резолвит модули относительно этого же корня. Трекаемый package.json уже
 * один раз сломал прод-сборку ("type":"module" конфликтовал с резолвом entries/application.js
 * без специфицированных расширений). Поэтому шаблоны хранятся в dev-stand/templates/, а в
 * корень копируются локально этим скриптом.
 *
 * Обычный Node-скрипт, а не npm-скрипт: до его запуска package.json в корне ещё не существует.
 * Запуск: node dev-stand/bootstrap.mjs [--force]
 *
 * Существующие файлы в корне не перезаписываются молча — без --force скрипт лишь
 * предупреждает и пропускает файл.
 */
import {copyFileSync, existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const templatesDir = join(root, 'dev-stand', 'templates');
const force = process.argv.includes('--force');

const files = [
    'package.json',
    'vite.config.mjs',
    'vitest.config.mjs',
    'playwright.config.mjs',
    'index.html',
];

for (const file of files) {
    const source = join(templatesDir, file);
    const target = join(root, file);

    if (existsSync(target) && !force) {
        console.warn(`${file} уже существует в корне — пропускаю (запустите с --force, чтобы перезаписать).`);
        continue;
    }

    copyFileSync(source, target);
    console.log(`${file}: скопирован в корень из dev-stand/templates/.`);
}
