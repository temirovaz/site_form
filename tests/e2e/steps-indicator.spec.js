import {expect, test} from '@playwright/test';

// Индикатор шагов: показывает, где человек находится, кликабелен по
// достигнутым шагам в обе стороны, на мобильном сворачивается в одну строку.
//
// Данные синтетические (см. likey-pdn): example.com и несуществующий номер.

const PHONE = '9991234567';
const PHONE_IN_FORM = '+7 (999)-123-45-67';
const EMAIL = 'ivanov@example.com';
const SNILS = '92703662611';
const ORG_INN = '2311128737';

const emailInput = (page) => page.locator('form input[type="text"], form input:not([type])').nth(1);
const indicator = (page) => page.locator('.steps-indicator');
const indicatorItem = (page, title) =>
    indicator(page).locator('.steps-indicator__list li', {hasText: title}).locator('button');

// На мобильном список шагов свёрнут — раскрываем плашку перед кликом.
const expandIndicatorIfCollapsed = async (page) => {
    const collapsed = indicator(page).locator('.steps-indicator__current');
    if (await collapsed.isVisible()) await collapsed.tap();
};

// Шаг 1: контакты → шаг 2: плательщик (юрлицо через подсказку DaData).
async function reachPaymentStep(page) {
    await page.goto('/');
    await expect(page.locator('.wizard')).toBeVisible();

    // fill, а не посимвольный ввод: маска vue-the-mask переформатирует поле
    // на каждый символ, и при быстрой печати цифры иногда переставляются.
    await page.getByPlaceholder('+7(___)___-__-__').fill(PHONE);
    await page.locator('#privacy-policy').check();
    await emailInput(page).fill(EMAIL);
    await page.getByRole('heading', {name: 'Контактная информация'}).click();
    await page.getByRole('button', {name: 'Далее'}).click();
    await expect(page.getByRole('heading', {name: 'Плательщик'})).toBeVisible();
}

// Шаг 3: банк (мок подсказок пуст — заполняем вручную).
async function reachBankStep(page) {
    await reachPaymentStep(page);

    await page.locator('label[for="radio-1"]').click();
    // Подсказки DaData реагируют только на реальный ввод с клавиатуры — fill не подходит.
    await page.getByPlaceholder('Введите название в свободной форме, адрес, ИНН или ОГРН').pressSequentially(ORG_INN);
    await page.locator('.dadata-suggestions-item').click();
    await page.locator('#listeners-consent-legal').check();
    await page.getByRole('button', {name: 'Далее'}).click();
    await expect(page.getByRole('heading', {name: 'Банковские реквизиты'})).toBeVisible();
}

test.describe('индикатор шагов', () => {
    test('показывается на всех шагах, недостигнутые шаги задизейблены', async ({page}) => {
        await page.goto('/');
        await expect(page.locator('.wizard')).toBeVisible();

        await expect(indicator(page)).toBeVisible();
        await expect(indicatorItem(page, 'Контакты')).toBeEnabled();
        await expect(indicatorItem(page, 'Плательщик')).toBeDisabled();
        await expect(indicatorItem(page, 'Отправка')).toBeDisabled();

        await reachPaymentStep(page);

        await expect(indicator(page)).toBeVisible();
        await expect(indicatorItem(page, 'Контакты')).toBeEnabled();
        await expect(indicatorItem(page, 'Банк')).toBeDisabled();
    });

    test('клик по достигнутому шагу возвращает без потери введённых данных', async ({page}) => {
        await reachBankStep(page);
        await page.getByPlaceholder('БИК').fill('044525225');

        // Назад на «Контакты» кликом по индикатору.
        await expandIndicatorIfCollapsed(page);
        await indicatorItem(page, 'Контакты').click();
        await expect(page.getByRole('heading', {name: 'Контактная информация'})).toBeVisible();
        await expect(page.getByPlaceholder('+7(___)___-__-__')).toHaveValue(PHONE_IN_FORM);

        // И вперёд по уже достигнутому «Банк» — он заполнен и кликабелен.
        await expandIndicatorIfCollapsed(page);
        await indicatorItem(page, 'Банк').click();
        await expect(page.getByRole('heading', {name: 'Банковские реквизиты'})).toBeVisible();
        await expect(page.getByPlaceholder('БИК')).toHaveValue('044525225');
    });

    test('для физлица шаг «Банк» исчезает из шкалы', async ({page}) => {
        await reachPaymentStep(page);

        // radio-3 — «Физическое лицо»: input скрыт стилизацией, кликаем label.
        // Тип плательщика попадает в стор только на «Далее» (сохраняет дочерняя
        // форма), поэтому шкала пересчитается после перехода.
        await page.locator('label[for="radio-3"]').click();
        // СНИЛС из мока: подтягивает слушателя из «1С» и заполняет почти всё.
        await page.getByPlaceholder('СНИЛС').fill(SNILS);
        await expect(page.getByPlaceholder('Фамилия')).toHaveValue('Иванов');
        // Почтовый адрес из 1С не приходит — заполняем вручную.
        await page.getByPlaceholder('Почтовый адрес').fill('г Москва, ул Тестовая, д 1');
        await page.getByRole('button', {name: 'Далее'}).click();

        await expect(page.getByRole('heading', {name: /добавьте программы обучения/})).toBeVisible();
        await expect(indicatorItem(page, 'Банк')).toHaveCount(0);
        await expect(indicator(page).locator('.steps-indicator__list li')).toHaveCount(4);
        await expect(indicatorItem(page, 'Программы')).toHaveCount(1);
    });

    test('смена типа плательщика на физлицо не открывает недостигнутые шаги', async ({page}) => {
        // Сценарий из ревью: юрлицо дошло до «Банка», вернулось на
        // «Плательщик», переключилось на физлицо. Список шагов сжался, и
        // «Программы» не должны стать кликабельными: форма физлица пуста,
        // шаг «Плательщик» невалиден, а кликабельность строится от валидности
        // цепочки — иначе клик прыгал бы вперёд в обход валидации физлица.
        await reachBankStep(page);

        await page.getByRole('button', {name: 'Назад'}).click();
        await expect(page.getByRole('heading', {name: 'Плательщик'})).toBeVisible();
        await page.locator('label[for="radio-3"]').click();

        // Физлицо невалидно — «Далее» не пускает, и шкала пересчитана на 4 шага.
        await page.getByRole('button', {name: 'Далее'}).click();
        await expect(page.getByRole('heading', {name: 'Плательщик'})).toBeVisible();

        await expandIndicatorIfCollapsed(page);
        await expect(indicatorItem(page, 'Банк')).toHaveCount(0);
        await expect(indicatorItem(page, 'Программы')).toBeDisabled();

        // И клик по «Программам» никуда не ведёт.
        await indicatorItem(page, 'Программы').click({force: true});
        await expect(page.getByRole('heading', {name: 'Плательщик'})).toBeVisible();
    });

    test('стёртые обязательные поля блокируют все следующие шаги', async ({page}) => {
        // Прошли «Контакты» и «Плательщик», вернулись на «Контакты» и стёрли
        // телефон: шаг перестаёт быть валидным, и всё за ним закрывается,
        // хотя до этого было «зелёным».
        await reachBankStep(page);

        await expandIndicatorIfCollapsed(page);
        await indicatorItem(page, 'Контакты').click();
        await expect(page.getByRole('heading', {name: 'Контактная информация'})).toBeVisible();

        // Пока поля на месте — «Плательщик» и «Банк» доступны.
        await expandIndicatorIfCollapsed(page);
        await expect(indicatorItem(page, 'Плательщик')).toBeEnabled();
        await expect(indicatorItem(page, 'Банк')).toBeEnabled();

        await page.getByPlaceholder('+7(___)___-__-__').fill('');

        // Стёрли обязательное поле — дальше по шкале не пройти.
        await expect(indicatorItem(page, 'Плательщик')).toBeDisabled();
        await expect(indicatorItem(page, 'Банк')).toBeDisabled();
        await indicatorItem(page, 'Банк').click({force: true});
        await expect(page.getByRole('heading', {name: 'Контактная информация'})).toBeVisible();

        // Заполнили обратно — цепочка восстановилась.
        await page.getByPlaceholder('+7(___)___-__-__').fill(PHONE);
        await expect(indicatorItem(page, 'Банк')).toBeEnabled();
    });

    test('после перезагрузки подсветка восстанавливается по мере повторной выдачи согласий', async ({page}) => {
        // Черновик сохраняет данные, но не согласия (см. plugins/draft.js):
        // после reload форма открывается с «Контактов», и шаги зеленеют заново,
        // как только человек повторно ставит галочки — а не потому что
        // «когда-то доходил».
        await reachBankStep(page);
        await page.getByPlaceholder('БИК').fill('044525225');

        await page.reload();
        await expect(page.locator('.wizard')).toBeVisible();
        await expect(page.getByRole('heading', {name: 'Контактная информация'})).toBeVisible();

        // Контакты восстановлены, но политика не дана — дальше пройти нельзя.
        await expect(page.getByPlaceholder('+7(___)___-__-__')).toHaveValue(PHONE_IN_FORM);
        await expandIndicatorIfCollapsed(page);
        await expect(indicatorItem(page, 'Плательщик')).toBeDisabled();

        // Поставили политику — «Плательщик» открылся, переходим кликом по шкале.
        await page.locator('#privacy-policy').check();
        await expect(indicatorItem(page, 'Плательщик')).toBeEnabled();
        await indicatorItem(page, 'Плательщик').click();
        await expect(page.getByRole('heading', {name: 'Плательщик'})).toBeVisible();

        // Согласие слушателей тоже даётся заново — до него «Банк» закрыт.
        await expandIndicatorIfCollapsed(page);
        await expect(indicatorItem(page, 'Банк')).toBeDisabled();
        await page.locator('#listeners-consent-legal').check();
        await expect(indicatorItem(page, 'Банк')).toBeEnabled();

        // «Банк» открылся и его данные на месте — восстановлены из черновика.
        await indicatorItem(page, 'Банк').click();
        await expect(page.getByRole('heading', {name: 'Банковские реквизиты'})).toBeVisible();
        await expect(page.getByPlaceholder('БИК')).toHaveValue('044525225');
    });

    test('шаги заполнены только кликами по шкале — в заявку уходят актуальные данные', async ({page}) => {
        // Блокер из ревью PR #26: переход по шкале не запускает обработчик
        // «Далее», поэтому данные шага обязаны попадать в стор при живой
        // валидности. Здесь вся форма заполняется без единого «Далее», а в
        // середине меняется уже «подтверждённое» поле — payload проверяем
        // из консольного лога мока (запрос никуда не уходит).
        const payloads = [];
        page.on('console', async (msg) => {
            if (!msg.text().includes('отправка заявки в 1С')) return;
            for (const arg of msg.args().slice(1)) {
                try { payloads.push(await arg.jsonValue()); } catch { payloads.push(null); }
            }
        });

        await page.goto('/');
        await expect(page.locator('.wizard')).toBeVisible();

        // «Контакты» — и сразу уходим кликом по шкале, без «Далее».
        await page.getByPlaceholder('+7(___)___-__-__').fill(PHONE);
        await page.locator('#privacy-policy').check();
        await emailInput(page).fill(EMAIL);
        await page.getByRole('heading', {name: 'Контактная информация'}).click();

        await expandIndicatorIfCollapsed(page);
        await indicatorItem(page, 'Плательщик').click();
        await expect(page.getByRole('heading', {name: 'Плательщик'})).toBeVisible();

        // Юрлицо через подсказку DaData (мок: ИНН 2311128737).
        await page.locator('label[for="radio-1"]').click();
        await page.getByPlaceholder('Введите название в свободной форме, адрес, ИНН или ОГРН').pressSequentially(ORG_INN);
        await page.locator('.dadata-suggestions-item').click();
        await page.locator('#listeners-consent-legal').check();

        await expandIndicatorIfCollapsed(page);
        await indicatorItem(page, 'Банк').click();
        await expect(page.getByRole('heading', {name: 'Банковские реквизиты'})).toBeVisible();

        await page.getByPlaceholder('Наименование банка').fill('ПАО Тестбанк');
        await page.getByPlaceholder('БИК').fill('044525225');
        await page.getByPlaceholder('Корреспондентский счет').fill('30101810400000000225');
        await page.getByPlaceholder('Адрес банка').fill('г Москва, ул Вавилова, д 19');
        await page.getByPlaceholder('Расчетный счет').fill('40702810400000000001');

        await expandIndicatorIfCollapsed(page);
        await indicatorItem(page, 'Программы').click();
        await expect(page.getByRole('heading', {name: /добавьте программы обучения/})).toBeVisible();

        // Программа из мока и слушатель по СНИЛС 92703662611.
        await page.getByRole('button', {name: 'Добавить программу'}).click();
        await page.getByRole('textbox', {name: 'Поиск программ'}).pressSequentially('а');
        await page.getByRole('button', {name: 'Выбрать'}).first().click();
        await page.getByRole('dialog').getByRole('button', {name: 'Close'}).click();

        await page.getByRole('button', {name: 'Добавить слушателя'}).click();
        await page.getByRole('dialog').getByPlaceholder('+7(___)___-__-__').fill(PHONE);
        await page.getByPlaceholder('СНИЛС').fill(SNILS);
        await expect(page.getByPlaceholder('Фамилия')).toHaveValue('Иванов');
        await page.getByRole('dialog').locator('input[type="text"], input:not([type])').nth(1).fill(EMAIL);
        await page.getByRole('dialog').locator('input[type="date"]').first().fill('1990-05-15');
        // Дропдаун подсказок почты перекрывает нижние поля — снимаем фокус.
        await page.getByRole('dialog').locator('h4').click();
        await page.getByRole('dialog').getByRole('button', {name: 'Добавить слушателя'}).click();
        await expect(page.getByText('Иванов Иван Иванович')).toBeVisible();

        // Меняем уже «подтверждённое» поле и уходим вперёд кликом по шкале —
        // в заявке должна уйти новая почта, а не та, что была на «Далее».
        const EMAIL_EDITED = 'ivanov.new@example.com';
        await expandIndicatorIfCollapsed(page);
        await indicatorItem(page, 'Контакты').click();
        await expect(page.getByRole('heading', {name: 'Контактная информация'})).toBeVisible();
        await emailInput(page).fill(EMAIL_EDITED);
        await page.getByRole('heading', {name: 'Контактная информация'}).click();

        await expandIndicatorIfCollapsed(page);
        await indicatorItem(page, 'Отправка').click();
        await expect(page.locator('.summary-step')).toContainText(EMAIL_EDITED);

        await page.getByRole('button', {name: 'Отправить'}).click();
        await expect(page.getByText('Спасибо. Ваша заявка принята')).toBeVisible();

        await expect.poll(() => payloads.length, {timeout: 7_000}).toBe(1);
        const {data} = payloads[0];
        expect(data.contact.email).toBe(EMAIL_EDITED);
        expect(data.contact.phone).toBe(PHONE_IN_FORM);
        expect(data.payment.inn).toBe(ORG_INN);
        expect(data.bank.bic).toBe('044525225');
    });

    test('на мобильном индикатор свёрнут в одну строку и раскрывается по тапу', async ({page, isMobile}) => {
        test.skip(!isMobile, 'только для мобильного проекта');

        await page.goto('/');
        await expect(page.locator('.wizard')).toBeVisible();

        const collapsed = indicator(page).locator('.steps-indicator__current');
        await expect(collapsed).toBeVisible();
        await expect(collapsed).toContainText('Шаг 1 из 5');
        await expect(indicator(page).locator('.steps-indicator__list')).toBeHidden();

        await collapsed.tap();
        await expect(indicator(page).locator('.steps-indicator__list')).toBeVisible();
    });

    test('на десктопе список шагов виден сразу, свёрнутой плашки нет', async ({page, isMobile}) => {
        test.skip(isMobile, 'только для десктопного проекта');

        await page.goto('/');
        await expect(page.locator('.wizard')).toBeVisible();

        await expect(indicator(page).locator('.steps-indicator__current')).toBeHidden();
        await expect(indicator(page).locator('.steps-indicator__list')).toBeVisible();
    });
});
