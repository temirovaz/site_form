import {expect, test} from '@playwright/test';

// Ошибка загрузки списка программ (шаг «Программы»): если запрос к сайту не
// удался, человек должен увидеть понятное сообщение и кнопку «Повторить»,
// а не пустой экран. Заглушка стенда роняет запрос, пока в localStorage
// стоит флаг mock_fail_programs = '1' (см. dev-stand/mock-api.js).
//
// Данные синтетические (см. likey-pdn): example.com и несуществующий номер.

const PHONE = '+79991234567';
const EMAIL = 'ivanov@example.com';

// Тот же селектор поля почты, что в decline.spec.js: у FormField нет name/id,
// поле находим по порядку в форме (вторым после телефона).
const emailInput = (page) => page.locator('form input[type="text"], form input:not([type])').nth(1);

// Проходим первые три шага мастера до шага «Программы».
// Флаг сбоя ставим только после goto: на about:blank localStorage недоступен.
async function reachProgramsStep(page, {fail = false} = {}) {
    await page.goto('/');
    await expect(page.locator('.wizard')).toBeVisible();
    if (fail) await failPrograms(page);

    // Шаг 1: контакты. Почту заполняем последней: её дропдаун подсказок
    // перекрывает чекбокс согласия и кнопку «Далее» — закрываем его кликом
    // по заголовку.
    await page.getByPlaceholder('+7(___)___-__-__').fill(PHONE);
    await page.locator('#privacy-policy').check();
    await emailInput(page).fill(EMAIL);
    await page.getByRole('heading', {name: 'Контактная информация'}).click();
    await page.getByRole('button', {name: 'Далее'}).click();

    // Шаг 2: плательщик — юрлицо через подсказку DaData (мок: ИНН 2311128737).
    // Сами input[type=radio] скрыты кастомной стилизацией, кликаем по label.
    // Подсказки DaData срабатывают на keyup, поэтому печатаем посимвольно,
    // а не fill().
    await page.locator('label[for="radio-1"]').click();
    await page.getByPlaceholder('Введите название в свободной форме, адрес, ИНН или ОГРН').pressSequentially('2311128737');
    await page.locator('.dadata-suggestions-item').click();
    await page.locator('#listeners-consent-legal').check();
    await page.getByRole('button', {name: 'Далее'}).click();

    // Шаг 3: банк (мок подсказок по банкам пуст — заполняем вручную).
    await expect(page.getByRole('heading', {name: 'Банковские реквизиты'})).toBeVisible();
    await page.getByPlaceholder('Наименование банка').fill('ПАО Тестбанк');
    await page.getByPlaceholder('БИК').fill('044525225');
    await page.getByPlaceholder('Корреспондентский счет').fill('30101810400000000225');
    await page.getByPlaceholder('Адрес банка').fill('г Москва, ул Вавилова, д 19');
    await page.getByPlaceholder('Расчетный счет').fill('40702810400000000001');
    await page.getByRole('button', {name: 'Далее'}).click();
}

const failPrograms = (page) =>
    page.evaluate(() => localStorage.setItem('mock_fail_programs', '1'));
const fixPrograms = (page) =>
    page.evaluate(() => localStorage.removeItem('mock_fail_programs'));

test.describe('ошибка загрузки списка программ', () => {
    test('показывает сообщение об ошибке вместо кнопки «Добавить программу»', async ({page}) => {
        await reachProgramsStep(page, {fail: true});

        await expect(page.getByRole('heading', {name: /добавьте программы обучения/})).toBeVisible();
        await expect(page.getByText('Не удалось загрузить список программ')).toBeVisible();
        await expect(page.getByRole('button', {name: 'Повторить'})).toBeVisible();
        await expect(page.getByRole('button', {name: 'Добавить программу'})).toHaveCount(0);

        await fixPrograms(page);
    });

    test('кнопка «Повторить» перезагружает список после восстановления связи', async ({page}) => {
        await reachProgramsStep(page, {fail: true});
        await expect(page.getByRole('button', {name: 'Повторить'})).toBeVisible();

        // «Связь восстановилась» — снимаем флаг сбоя и просим повторить.
        await fixPrograms(page);
        await page.getByRole('button', {name: 'Повторить'}).click();

        await expect(page.getByRole('button', {name: 'Добавить программу'})).toBeVisible();
        await expect(page.getByText('Не удалось загрузить список программ')).toHaveCount(0);

        // Список реально пришёл: программы можно открыть и выбрать.
        await page.getByRole('button', {name: 'Добавить программу'}).click();
        await page.getByRole('textbox', {name: 'Поиск программ'}).pressSequentially('а');
        await expect(page.getByRole('button', {name: 'Выбрать'}).first()).toBeVisible();
    });
});
