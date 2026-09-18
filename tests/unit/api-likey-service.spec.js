import {beforeEach, describe, expect, it, vi} from 'vitest';

// Store, api и ProgramService подменяем: тестируем именно логику подготовки payload для 1С.
const {mockStore, mockLikeyPost, mockGetSelectedProgram} = vi.hoisted(() => ({
    mockStore: {state: {form: {}}},
    mockLikeyPost: vi.fn(async () => ({data: {status: 'success'}})),
    mockGetSelectedProgram: vi.fn(() => []),
}));

vi.mock('../../js/vue/registration-course/plugins/store', () => ({default: mockStore}));
vi.mock('../../js/vue/registration-course/plugins/api', () => ({
    api: {likey: {post: mockLikeyPost}, dadata: {post: vi.fn()}},
}));
vi.mock('../../js/vue/registration-course/service/ProgramService', () => ({
    default: {getSelectedProgram: mockGetSelectedProgram},
}));

const {default: ApiLikeyService} = await import(
    '../../js/vue/registration-course/service/api/ApiLikeyService'
);

const payloadOfLastCall = () => mockLikeyPost.mock.calls.at(-1)[1];

describe('ApiLikeyService.sendFormForSaveTo1C', () => {
    beforeEach(() => {
        mockLikeyPost.mockClear();
        mockGetSelectedProgram.mockReturnValue([]);
        mockStore.state.form = {
            contact: {phone: '+79123456789', email: 'test@example.com'},
            payment: {
                type: 'legal',
                inn: '2311128737',
                kpp: '231101001',
                basis: 'Устав',
                address_value: 'г Москва, ул Тверская, д 1',
                actual_address: 'г Москва, ул Тверская, д 2',
                postal_code: '123456',
            },
            bank: {},
        };
    });

    it('отправляет заявку в /CreateData/3_00 с типом application', async () => {
        await ApiLikeyService.sendFormForSaveTo1C();

        expect(mockLikeyPost).toHaveBeenCalledTimes(1);
        expect(mockLikeyPost.mock.calls[0][0]).toBe('/CreateData/3_00');
        expect(payloadOfLastCall()).toMatchObject({type: 'application', algorithm: 2});
    });

    it('маппит поля адресов и основание в имена, которые ждёт 1С', async () => {
        await ApiLikeyService.sendFormForSaveTo1C();

        const {payment} = payloadOfLastCall().data;

        expect(payment.postal_address).toBe('г Москва, ул Тверская, д 2');
        expect(payment.postal_index).toBe('123456');
        expect(payment.legal_address).toBe('г Москва, ул Тверская, д 1');
        expect(payment.footing).toBe('Устав');
    });

    it('убирает из payload исходные имена полей, которых 1С не знает', async () => {
        await ApiLikeyService.sendFormForSaveTo1C();

        const {payment} = payloadOfLastCall().data;

        expect(payment).not.toHaveProperty('actual_address');
        expect(payment).not.toHaveProperty('postal_code');
        expect(payment).not.toHaveProperty('basis');
        // address_value остаётся: он используется в других местах формы
        expect(payment.address_value).toBe('г Москва, ул Тверская, д 1');
    });

    it('не теряет смапленные поля при повторной отправке той же формы', async () => {
        // Метод мутирует store.state.form через delete, поэтому вторая отправка идёт
        // по уже изменённому объекту. Проверяем, что данные при этом не пропадают.
        await ApiLikeyService.sendFormForSaveTo1C();
        await ApiLikeyService.sendFormForSaveTo1C();

        const {payment} = payloadOfLastCall().data;

        expect(payment.postal_address).toBe('г Москва, ул Тверская, д 2');
        expect(payment.postal_index).toBe('123456');
        expect(payment.footing).toBe('Устав');
    });

    it('переживает форму без блока payment', async () => {
        mockStore.state.form = {contact: {}, bank: {}};

        await expect(ApiLikeyService.sendFormForSaveTo1C()).resolves.toBeTruthy();
    });
});

describe('ApiLikeyService.getListenerBySnilsFrom1C', () => {
    it('запрашивает слушателя по СНИЛС без лишних пробелов', async () => {
        mockLikeyPost.mockClear();

        await ApiLikeyService.getListenerBySnilsFrom1C('  92703662611  ');

        expect(mockLikeyPost).toHaveBeenCalledWith('/GetData/3_00', {
            document: '92703662611',
            type: 'student',
        });
    });
});

describe('ApiLikeyService.sendDeclineRequestTo1C', () => {
    const DECLINE_COMMENT = 'Заявка создана на сайте. Клиент отказался заполнять данные.';

    beforeEach(() => {
        mockLikeyPost.mockClear();
        mockGetSelectedProgram.mockReturnValue([]);
        mockStore.state.form = {contact: {phone: '+79123456789', email: 'test@example.com'}};
    });

    it('сохраняет форму запроса, ожидаемую 1С', async () => {
        await ApiLikeyService.sendDeclineRequestTo1C();

        expect(mockLikeyPost.mock.calls.at(-1)[0]).toBe('/CreateData/3_00');
        expect(payloadOfLastCall()).toMatchObject({type: 'application', algorithm: 2});
    });

    it('игнорирует плательщика, банк и программы, которые человек успел заполнить', async () => {
        // Сценарий из ревью: заполнил контакты → ушёл вперёд → вернулся →
        // поставил галочку отказа. В сторе уже лежат плательщик и программы —
        // реальные payment/programs должны быть полностью проигнорированы,
        // а не подмешаны к заглушке, иначе менеджер не отличит такую заявку
        // от обычной.
        mockStore.state.form = {
            contact: {phone: '+79123456789', email: 'test@example.com'},
            payment: {type: 'ip', inn: '111111111111', kpp: '999999999', full_name: 'ИП Реальный'},
            bank: {bik: '044525225'},
        };
        mockGetSelectedProgram.mockReturnValue([{id: 1, name: 'Охрана труда', prefix: 'PROG-01'}]);

        await ApiLikeyService.sendDeclineRequestTo1C();

        const payload = payloadOfLastCall();
        expect(payload.data.bank).toEqual({});
        expect(payload.data.payment.inn).toBe('2311128737');
        expect(payload.data.payment.full_name).toBe('Клиент с сайта без данных');
        expect(payload.programs).toHaveLength(1);
        expect(payload.programs[0].name).toBe('Не указано');
    });

    it('шлёт контакты человека как есть', async () => {
        await ApiLikeyService.sendDeclineRequestTo1C();

        expect(payloadOfLastCall().data.contact).toEqual({
            phone: '+79123456789',
            email: 'test@example.com',
        });
    });

    it('заполняет обязательные для 1С поля организации заглушкой', async () => {
        // 1С требует organization_type/inn/kpp/full_name/abbreviated_name/telephone/email
        // (см. API 3.0.docx), иначе отвечает 420 "Invalid input data".
        await ApiLikeyService.sendDeclineRequestTo1C();

        expect(payloadOfLastCall().data.payment).toMatchObject({
            organization_type: 1,
            inn: '2311128737',
            kpp: '231101001',
            full_name: 'Клиент с сайта без данных',
            abbreviated_name: 'Клиент с сайта без данных',
            telephone: '+79123456789',
            email: 'test@example.com',
        });
    });

    it('подставляет телефон и почту организации, если человек оставил только один контакт', async () => {
        // При отказе достаточно одного контакта из двух, а 1С требует у организации
        // оба поля — недостающее закрываем заглушкой, иначе заявка не создастся.
        mockStore.state.form = {contact: {phone: '', email: 'test@example.com'}};

        await ApiLikeyService.sendDeclineRequestTo1C();

        expect(payloadOfLastCall().data.payment).toMatchObject({
            telephone: '+70000000000',
            email: 'test@example.com',
        });
    });

    it('подставляет телефон и почту организации, если контактов нет вовсе', async () => {
        mockStore.state.form = {contact: {}};

        await ApiLikeyService.sendDeclineRequestTo1C();

        expect(payloadOfLastCall().data.payment).toMatchObject({
            telephone: '+70000000000',
            email: 'noreply@company.ru',
        });
    });

    it('шлёт заглушку абитуриента вместо пустых programs — 1С требует applicants непустым', async () => {
        // 1С отвечает 420 "Отсутствуют абитуриенты" на пустой programs (см.
        // API 3.0.docx) — этот тест фиксирует именно то, ради чего заглушка
        // введена, а не только форму запроса в целом.
        await ApiLikeyService.sendDeclineRequestTo1C();

        const [program] = payloadOfLastCall().programs;

        expect(program).toMatchObject({name: 'Не указано', prefix: 'Не указано'});
        expect(program.listeners).toHaveLength(1);
        expect(program.listeners[0]).toMatchObject({
            surname: 'Иванов',
            name: 'Иван',
            patronymic: 'Иванович',
            fio: 'Иванов Иван Иванович',
            snils: '92703662611',
        });
    });

    it('шлёт фиксированный комментарий, если человек ничего не написал', async () => {
        await ApiLikeyService.sendDeclineRequestTo1C();

        expect(payloadOfLastCall().data.comment).toBe(DECLINE_COMMENT);
    });

    it('дописывает комментарий человека после фиксированного текста', async () => {
        mockStore.state.form = {
            contact: {phone: '+79123456789'},
            comment: 'Перезвоните после 18:00',
        };

        await ApiLikeyService.sendDeclineRequestTo1C();

        expect(payloadOfLastCall().data.comment)
            .toBe(`${DECLINE_COMMENT} Перезвоните после 18:00`);
    });

    it('не оставляет хвост из пробелов, если комментарий человека пустой', async () => {
        mockStore.state.form = {contact: {phone: '+79123456789'}, comment: '   '};

        await ApiLikeyService.sendDeclineRequestTo1C();

        expect(payloadOfLastCall().data.comment).toBe(DECLINE_COMMENT);
    });
});
