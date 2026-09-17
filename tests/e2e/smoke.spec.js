import {expect, test} from '@playwright/test';

// Смоук локального стенда: визард поднимается, первый шаг отрисован, консоль чистая.
// Сценарные e2e-тесты добавляются рядом отдельными файлами.

test('визард монтируется и не сыплет ошибками в консоль', async ({page}) => {
    const errors = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));

    await page.goto('/');

    await expect(page.locator('.wizard')).toBeVisible();

    // Стили шаблона Bitrix тянутся с внешнего сайта — сетевые ошибки по ним не считаем.
    const appErrors = errors.filter((text) => !/Failed to load resource/i.test(text));
    expect(appErrors, `ошибки в консоли:\n${appErrors.join('\n')}`).toEqual([]);
});

test('первый шаг — контактная информация', async ({page}) => {
    await page.goto('/');

    await expect(page.getByRole('heading', {name: 'Контактная информация'})).toBeVisible();
    await expect(page.getByText('Телефон')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Далее'})).toBeVisible();
    // На первом шаге кнопки «Назад» быть не должно
    await expect(page.getByRole('button', {name: 'Назад'})).toHaveCount(0);
});

test('без согласия на обработку данных дальше не пускает', async ({page}) => {
    await page.goto('/');

    await page.getByRole('button', {name: 'Далее'}).click();

    await expect(page.getByRole('heading', {name: 'Контактная информация'})).toBeVisible();
});
