#!/usr/bin/env node
/**
 * Ставит локальную заглушку API, если plugins/api.js ещё не создан.
 *
 * plugins/api.js вне git: на серверах он содержит реальные креды 1С и DaData и настраивается
 * вручную. Локально его роль играет dev-stand/mock-api.js.
 *
 * Существующий файл НЕ перезаписывается никогда — чтобы случайный запуск скрипта на сервере
 * не снёс боевую конфигурацию. Чтобы пересоздать заглушку, удали файл вручную.
 */
import {copyFileSync, existsSync, mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'dev-stand', 'mock-api.js');
const target = join(root, 'js', 'vue', 'registration-course', 'plugins', 'api.js');

if (existsSync(target)) {
    console.log('plugins/api.js уже существует — оставляю как есть.');
    process.exit(0);
}

mkdirSync(dirname(target), {recursive: true});
copyFileSync(source, target);
console.log('Создан plugins/api.js из dev-stand/mock-api.js (локальная заглушка, вне git).');
