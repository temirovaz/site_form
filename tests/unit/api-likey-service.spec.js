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
