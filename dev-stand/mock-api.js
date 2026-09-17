// Локальная заглушка API для стенда: 1С и DaData не вызываются.
// Копируется в js/vue/registration-course/plugins/api.js командой: npm run stand:init
// Боевой api.js вне git и содержит реальные креды — этот файл его НЕ заменяет на серверах.


const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mockPrograms = [
    {id: 1, prefix: 'PROG-01', name: 'Охрана труда для руководителей и специалистов', hours: 40},
    {id: 2, prefix: 'PROG-02', name: 'Пожарно-технический минимум', hours: 16},
    {id: 3, prefix: 'PROG-03', name: 'Оказание первой помощи пострадавшим', hours: 24},
    {id: 4, prefix: 'PROG-04', name: 'Промышленная безопасность (А.1)', hours: 72},
];

const mockStudentsBySnils = {
    '92703662611': {
        surname: 'Иванов', name: 'Иван', patronymic: 'Иванович',
        date_of_birth: '2000-05-15', phone: '+7 (912) 345-67-89', email: 'ivanov@example.com',
        passport_series: '4510', passport_number: '123456',
        passport_date_of_issue: '2015-06-01', passport_division: '770-001',
        passport_issued: 'ОТДЕЛОМ УФМС РОССИИ ПО Г. МОСКВЕ', passport_place_of_birth: 'г. Москва',
        registration: 'г. Москва, ул. Тестовая, д. 1', post: 'Инженер',
    },
};

const mockEmailSuggestions = (query) => {
    const [local] = query.split('@');
    return ['gmail.com', 'yandex.ru', 'mail.ru'].map((domain) => ({
        value: `${local}@${domain}`,
        data: {},
    }));
};

const mockPartySuggestion = (type) => ({
    value: type === 'LEGAL' ? 'ООО "КУТРИТ"' : 'ИП Тестов Тест Тестович',
    data: {
        inn: '2311128737',
        kpp: type === 'LEGAL' ? '231101001' : undefined,
        ogrn: '1152311000123',
        name: {
            short: type === 'LEGAL' ? 'Q-ТРИТ' : 'ИП Тестов Т.Т.',
            short_with_opf: type === 'LEGAL' ? 'ООО "КУТРИТ"' : 'ИП Тестов Т.Т.',
            full_with_opf: type === 'LEGAL'
                ? 'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ "КУТРИТ"'
                : 'ИНДИВИДУАЛЬНЫЙ ПРЕДПРИНИМАТЕЛЬ ТЕСТОВ ТЕСТ ТЕСТОВИЧ',
            full: 'Манухин Игорь Леонидович',
        },
        management: {name: 'Манухин Игорь Леонидович', post: 'ДИРЕКТОР'},
        address: {value: 'г Москва, ул Тверская, д 1', data: {postal_code: '123456'}},
    },
});

const mockFmsUnit = () => ({
    value: '770-001',
    data: {code: '770-001', name: 'ОТДЕЛОМ УФМС РОССИИ ПО Г. МОСКВЕ'},
});

const mockBank = () => ({
    value: 'ПАО СБЕРБАНК',
    unrestricted_value: 'ПАО СБЕРБАНК',
    data: {
        bic: '044525225',
        address: {value: 'г Москва, ул Вавилова, д 19'},
    },
});

async function likeyPost(url, payload) {
    await delay(300);

    if (url === '/GetData/3_00' && payload?.type === 'programs') {
        return {data: {status: 'success', data: mockPrograms}};
    }

    if (url === '/GetData/3_00' && payload?.type === 'student') {
        const student = mockStudentsBySnils[payload.document?.trim()];
        return {data: {status: 'success', data: student || null}};
    }

    if (url === '/CreateData/3_00') {
        console.log('[mock] отправка заявки в 1С:', payload);
        return {data: {status: 'success'}};
    }

    return {data: {status: 'success', data: null}};
}

async function dadataPost(url, payload) {
    await delay(200);
    const query = payload?.query || '';

    if (url === '/suggest/email') {
        return {data: {suggestions: query.includes('@') ? mockEmailSuggestions(query) : []}};
    }
    if (url === '/suggest/party') {
        return {data: {suggestions: query ? [mockPartySuggestion(payload.type)] : []}};
    }
    if (url === '/suggest/fms_unit') {
        return {data: {suggestions: query ? [mockFmsUnit()] : []}};
    }
    if (url === '/suggest/bank') {
        return {data: {suggestions: query ? [mockBank()] : []}};
    }

    return {data: {suggestions: []}};
}

export const api = {
    likey: {post: likeyPost},
    dadata: {post: dadataPost},
};
