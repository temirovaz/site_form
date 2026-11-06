import {expect, test} from '@playwright/test';

// Валидация телефона на первом шаге: неполный номер не должен проходить,
// а вставка «грязного» номера из буфера — раскладываться по маске.
//
// Данные синтетические (см. likey-pdn): example.com и несуществующий номер.

const phoneInput = (page) => page.getByPlaceholder('+7(___)___-__-__');

test.describe('валидация телефона', () => {
    test('неполный номер не пускает дальше и показывает ошибку', async ({page}) => {
        await page.goto('/');
        await expect(page.locator('.wizard')).toBeVisible();

        await page.locator('#privacy-policy').check();
        await phoneInput(page).pressSequentially('9251');
        await page.getByRole('button', {name: 'Далее'}).click();

        await expect(page.getByText('полный номер телефона')).toBeVisible();
        // Остаёмся на первом шаге.
        await expect(page.getByRole('heading', {name: 'Контактная информация'})).toBeVisible();
    });

    test('вставка номера с восьмёркой и мусором раскладывается по маске', async ({page}) => {
        await page.goto('/');
        await expect(page.locator('.wizard')).toBeVisible();

        // Имитируем вставку из буфера: люди копируют телефон со скобками,
        // пробелами, восьмёркой и текстом вокруг.
        await phoneInput(page).evaluate((input) => {
            const data = new DataTransfer();
            data.setData('text/plain', 'Тел: 8 (999) 123-45-67, рабочий');
            input.dispatchEvent(new ClipboardEvent('paste', {
                clipboardData: data,
                bubbles: true,
                cancelable: true,
            }));
        });

        await expect(phoneInput(page)).toHaveValue('+7 (999)-123-45-67');

        // Полный номер проходит валидацию — переходим на шаг плательщика.
        // Почта обязательна в обычном режиме; её дропдаун подсказок перекрывает
        // кнопку «Далее» — закрываем его кликом по заголовку.
        await page.locator('#privacy-policy').check();
        await page.locator('form input[type="text"], form input:not([type])').nth(1).fill('ivanov@example.com');
        await page.getByRole('heading', {name: 'Контактная информация'}).click();
        await page.getByRole('button', {name: 'Далее'}).click();
        await expect(page.getByRole('heading', {name: 'Плательщик'})).toBeVisible();
    });
});
