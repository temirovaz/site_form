import {expect, test} from '@playwright/test';

// Черновик заявки (sessionStorage): введённые данные должны переживать
// перезагрузку страницы и очищаться после успешной отправки заявки в 1С.
//
// Данные синтетические (см. likey-pdn): example.com и несуществующий номер.

const PHONE = '+79991234567';
const PHONE_IN_FORM = '+7 (999)-123-45-67';
const EMAIL = 'ivanov@example.com';
const DRAFT_KEY = 'site_form_draft_v1';

// Тот же селектор поля почты, что в decline.spec.js: у FormField нет name/id,
// поле находим по порядку в форме (вторым после телефона).
const emailInput = (page) => page.locator('form input[type="text"], form input:not([type])').nth(1);

test.describe('черновик заявки', () => {
    test('контакты и режим отказа переживают перезагрузку, согласие — нет', async ({page}) => {
        await page.goto('/');
        await expect(page.locator('.wizard')).toBeVisible();

        // Почту заполняем последней: её дропдаун подсказок перекрывает чекбоксы.
        await page.getByPlaceholder('+7(___)___-__-__').fill(PHONE);
        await page.locator('#privacy-policy').check();
        await page.locator('#decline-application').check();
        await emailInput(page).fill(EMAIL);

        await page.reload();
        await expect(page.locator('.wizard')).toBeVisible();

        await expect(page.getByPlaceholder('+7(___)___-__-__')).toHaveValue(PHONE_IN_FORM);
        await expect(emailInput(page)).toHaveValue(EMAIL);
        // Согласие на политику в черновик не попадает — даётся заново.
        await expect(page.locator('#privacy-policy')).not.toBeChecked();
        await expect(page.locator('#decline-application')).toBeChecked();
        // Режим отказа восстановился вместе с контактом — заявку можно отправить
        // прямо с первого шага, кнопка «Отправить» на месте.
        await expect(page.getByRole('button', {name: 'Отправить'})).toBeVisible();
    });

    test('после перезагрузки форма открывается с первого шага, согласие не восстановлено', async ({page}) => {
        await page.goto('/');
        await expect(page.locator('.wizard')).toBeVisible();

        // Почту заполняем последней: её дропдаун подсказок перекрывает чекбокс.
        // Перед кликом по «Далее» дропдаун закрываем кликом по заголовку.
        await page.getByPlaceholder('+7(___)___-__-__').fill(PHONE);
        await page.locator('#privacy-policy').check();
        await emailInput(page).fill(EMAIL);
        await page.getByRole('heading', {name: 'Контактная информация'}).click();
        await page.getByRole('button', {name: 'Далее'}).click();
        await expect(page.getByRole('heading', {name: 'Плательщик'})).toBeVisible();

        await page.reload();

        // Всегда первый шаг: иначе согласия, не восстановленные из черновика,
        // можно было бы обойти, вернувшись сразу на поздний шаг.
        await expect(page.getByRole('heading', {name: 'Контактная информация'})).toBeVisible();
        await expect(page.getByRole('heading', {name: 'Плательщик'})).toBeHidden();
        await expect(page.getByPlaceholder('+7(___)___-__-__')).toHaveValue(PHONE_IN_FORM);
        await expect(page.locator('#privacy-policy')).not.toBeChecked();
    });

    test('после отправки заявки черновик очищается и форма начинается с чистого листа', async ({page}) => {
        await page.goto('/');
        await expect(page.locator('.wizard')).toBeVisible();

        await page.locator('#privacy-policy').check();
        await page.locator('#decline-application').check();
        await page.getByPlaceholder('+7(___)___-__-__').fill(PHONE);

        await page.getByRole('button', {name: 'Отправить'}).click();
        await expect(page.getByText('Спасибо. Ваша заявка принята')).toBeVisible();

        expect(await page.evaluate((key) => sessionStorage.getItem(key), DRAFT_KEY)).toBeNull();

        await page.reload();
        await expect(page.locator('.wizard')).toBeVisible();
        await expect(page.getByPlaceholder('+7(___)___-__-__')).toHaveValue('');
        await expect(page.locator('#privacy-policy')).not.toBeChecked();
        await expect(page.getByRole('button', {name: 'Далее'})).toBeVisible();
    });

    // Регресс: после перезагрузки на шаге программ выбранная программа пропадала
    // (стартовые коммиты затирали programSelection в черновике до того, как
    // loadPrograms успевал его восстановить), хотя слушатели сохранялись.
    test('выбранная программа и слушатель переживают перезагрузку на шаге программ', async ({page}) => {
        await page.goto('/');
        await expect(page.locator('.wizard')).toBeVisible();

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

        // Шаг 4: программа из мока и слушатель по СНИЛС 92703662611.
        await expect(page.getByRole('heading', {name: /добавьте программы обучения/})).toBeVisible();
        await page.getByRole('button', {name: 'Добавить программу'}).click();
        await page.getByRole('textbox', {name: 'Поиск программ'}).pressSequentially('а');
        await page.getByRole('button', {name: 'Выбрать'}).first().click();
        await page.getByRole('dialog').getByRole('button', {name: 'Close'}).click();

        await page.getByRole('button', {name: 'Добавить слушателя'}).click();
        await page.getByRole('dialog').getByPlaceholder('+7(___)___-__-__').fill(PHONE);
        await page.getByPlaceholder('СНИЛС').fill('92703662611');
        // Данные слушателя подтягиваются из мока асинхронно.
        await expect(page.getByPlaceholder('Фамилия')).toHaveValue('Иванов');
        await page.getByRole('dialog').locator('input[type="text"], input:not([type])').nth(1).fill(EMAIL);
        await page.getByRole('dialog').locator('input[type="date"]').first().fill('1990-05-15');
        // Дропдаун подсказок почты перекрывает нижние поля — снимаем фокус.
        await page.getByRole('dialog').locator('h4').click();
        await page.getByRole('dialog').getByRole('button', {name: 'Добавить слушателя'}).click();
        await expect(page.getByText('Иванов Иван Иванович')).toBeVisible();

        // Перезагрузка на шаге программ: форма открывается с первого шага, согласия
        // сброшены — проходим шаги заново (данные восстановлены из черновика),
        // ставим согласия, и на шаге программ программа и слушатель на месте.
        await page.reload();

        await expect(page.getByRole('heading', {name: 'Контактная информация'})).toBeVisible();
        await expect(page.locator('#privacy-policy')).not.toBeChecked();
        await page.locator('#privacy-policy').check();
        await page.getByRole('heading', {name: 'Контактная информация'}).click();
        await page.getByRole('button', {name: 'Далее'}).click();

        await expect(page.locator('#listeners-consent-legal')).not.toBeChecked();
        await page.locator('#listeners-consent-legal').check();
        await page.getByRole('button', {name: 'Далее'}).click();

        await expect(page.getByRole('heading', {name: 'Банковские реквизиты'})).toBeVisible();
        await page.getByRole('button', {name: 'Далее'}).click();

        await expect(page.getByRole('heading', {name: /добавьте программы обучения/})).toBeVisible();
        // Программа восстанавливается после асинхронной загрузки списка из 1С.
        await expect(page.getByText('Охрана труда для руководителей и специалистов')).toBeVisible();
        await expect(page.getByText('Иванов Иван Иванович')).toBeVisible();
    });
});
