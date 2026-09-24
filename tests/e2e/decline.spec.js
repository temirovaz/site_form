import {expect, test} from '@playwright/test';

// Заявка-отказ («Не хочу оформлять заявку — свяжитесь со мной»): человек оставляет
// один контакт из двух, а 1С требует оба заполненными. Недостающий контакт форма
// закрывает заглушкой, но заглушка не должна ни затирать настоящий контакт, ни
// попадать в store — экран благодарности читает form.contact и иначе пообещал бы
// письмо на noreply@likey.su.
//
// Данные синтетические (см. likey-pdn): example.com и несуществующий номер.

const PHONE = '+79991234567';
const PHONE_IN_FORM = '+7 (999)-123-45-67';
const EMAIL = 'ivanov@example.com';
const PHONE_PLACEHOLDER = '+70000000000';
const EMAIL_PLACEHOLDER = 'noreply@likey.su';

// Комментарий: системные куски рядом, текст клиента подписан и идёт последним.
const DECLINE_COMMENT = 'Заявка создана на сайте. Клиент отказался заполнять данные.';
const PHONE_ONLY_NOTE = 'Связь только по телефону — почта в заявке заглушка.';
const EMAIL_ONLY_NOTE = 'Связь только по эл. почте — телефон в заявке заглушка.';

// Заглушка стенда логирует payload в консоль (`[mock] отправка заявки в 1С`),
// вторым аргументом — сам объект. Забираем его оттуда, а не из сети: запрос
// никуда не уходит, мок вызывается напрямую.
function collectSentPayloads(page) {
    const payloads = [];
    page.on('console', async (msg) => {
        if (!msg.text().includes('отправка заявки в 1С')) return;
        for (const arg of msg.args().slice(1)) {
            try {
                payloads.push(await arg.jsonValue());
            } catch {
                payloads.push(null);
            }
        }
    });
    return payloads;
}

async function fillDeclineStep(page, {phone, email, comment}) {
    await page.goto('/');
    await expect(page.locator('.wizard')).toBeVisible();

    await page.locator('#privacy-policy').check();
    await page.locator('#decline-application').check();

    if (phone) await page.getByPlaceholder('+7(___)___-__-__').fill(phone);
    if (email) await page.locator('form input[type="text"], form input:not([type])').nth(1).fill(email);
    if (comment) await page.locator('textarea').fill(comment);
}

// Payload вытаскивается из консоли асинхронно (jsonValue()), поэтому к моменту
// появления экрана благодарности он может быть ещё не разобран — ждём его явно,
// а не проверяем длину массива сразу после клика.
async function waitForPayload(payloads) {
    await expect.poll(() => payloads.length, {timeout: 7_000}).toBe(1);
    return payloads[0];
}

async function submitDecline(page) {
    const submit = page.getByRole('button', {name: 'Отправить'});
    await expect(submit).toBeVisible();
    // Один клик, без повторного: регресс «кнопка требует двойного клика».
    await submit.click();
    await expect(page.getByText('Спасибо. Ваша заявка принята')).toBeVisible();
}

test.describe('заявка-отказ: заглушки контактов', () => {
    test('оставлен только телефон — почта уходит заглушкой, телефон настоящий', async ({page}) => {
        const payloads = collectSentPayloads(page);

        await fillDeclineStep(page, {phone: PHONE, comment: 'Перезвоните после 18:00'});
        await submitDecline(page);

        const {data} = await waitForPayload(payloads);
        expect(data.contact.phone).toBe(PHONE_IN_FORM);
        expect(data.contact.email).toBe(EMAIL_PLACEHOLDER);
        expect(data.payment.telephone).toBe(PHONE_IN_FORM);
        expect(data.payment.email).toBe(EMAIL_PLACEHOLDER);
        expect(data.comment)
            .toBe(`${DECLINE_COMMENT} ${PHONE_ONLY_NOTE} Комментарий клиента: Перезвоните после 18:00`);

        // Заглушка не должна протечь на экран благодарности.
        const thanks = page.locator('.wizard-finish-step');
        await expect(thanks).toContainText(PHONE_IN_FORM);
        await expect(thanks).not.toContainText(EMAIL_PLACEHOLDER);
    });

    test('оставлена только почта — телефон уходит заглушкой, почта настоящая', async ({page}) => {
        const payloads = collectSentPayloads(page);

        await fillDeclineStep(page, {email: EMAIL, comment: 'Напишите на почту'});
        await submitDecline(page);

        const {data} = await waitForPayload(payloads);
        expect(data.contact.email).toBe(EMAIL);
        expect(data.contact.phone).toBe(PHONE_PLACEHOLDER);
        expect(data.payment.email).toBe(EMAIL);
        expect(data.payment.telephone).toBe(PHONE_PLACEHOLDER);
        expect(data.comment)
            .toBe(`${DECLINE_COMMENT} ${EMAIL_ONLY_NOTE} Комментарий клиента: Напишите на почту`);

        const thanks = page.locator('.wizard-finish-step');
        await expect(thanks).toContainText(EMAIL);
        await expect(thanks).not.toContainText(PHONE_PLACEHOLDER);
    });

    test('оставлены оба контакта — заглушек и пометки о канале нет', async ({page}) => {
        const payloads = collectSentPayloads(page);

        await fillDeclineStep(page, {phone: PHONE, email: EMAIL, comment: 'Любой канал'});
        await submitDecline(page);

        const {data} = await waitForPayload(payloads);
        expect(data.contact).toEqual({phone: PHONE_IN_FORM, email: EMAIL});
        expect(data.payment.telephone).toBe(PHONE_IN_FORM);
        expect(data.payment.email).toBe(EMAIL);
        expect(data.comment).toBe(`${DECLINE_COMMENT} Комментарий клиента: Любой канал`);
        expect(data.comment).not.toContain('заглушка');
    });

    test('без контактов отправить отказ нельзя', async ({page}) => {
        await page.goto('/');
        await page.locator('#privacy-policy').check();
        await page.locator('#decline-application').check();

        // Кнопка отправки появляется только когда есть хотя бы один контакт.
        await expect(page.getByRole('button', {name: 'Отправить'})).toHaveCount(0);
        await expect(page.getByRole('button', {name: 'Далее'})).toBeVisible();

        await page.getByRole('button', {name: 'Далее'}).click();
        await expect(page.getByText('Укажите телефон или эл. почту')).toBeVisible();
    });
});
