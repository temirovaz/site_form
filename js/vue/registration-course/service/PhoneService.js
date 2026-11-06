// Работа с телефонными номерами формы: нормализация «грязного» ввода
// (вставка из буфера с пробелами, скобками, восьмёркой вместо +7) и
// проверка полноты номера. Маска поля хранит значение в виде
// «+7 (999)-123-45-67», поэтому везде ниже работаем с чистыми цифрами.

// +7 и 10 цифр национального номера
const PHONE_DIGITS = 11;

// Оставляет только цифры и приводит номер к виду 7XXXXXXXXXX:
// - «8 (999) 123-45-67» и «+7 999 123-45-67» дают одно и то же;
// - 10 цифр без кода страны дополняются семёркой;
// - всё остальное (слишком короткое/длинное, чужой код страны) возвращается
//   как есть — такой номер честно не пройдёт валидацию, а не будет молча
//   обрезан до чужого.
export function normalizePhoneDigits(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 10) return '7' + digits;
    if (digits.length === PHONE_DIGITS && digits[0] === '8') return '7' + digits.slice(1);
    return digits;
}

// Номер полный: 11 цифр и начинается с 7. Неполный ввод по маске
// («+7 (925) 1__-__-__») сюда не проходит — это и есть предмет проверки.
export function isCompletePhone(value) {
    const digits = normalizePhoneDigits(value);
    return digits.length === PHONE_DIGITS && digits[0] === '7';
}

// Раскладывает цифры по маске отображения формы:
// 79991234567 → «+7 (999)-123-45-67». Неполный номер форматируется по мере
// ввода — этим пользуется вставка из буфера в поле телефона.
export function formatPhone(value) {
    const digits = normalizePhoneDigits(value);
    const national = digits[0] === '7' ? digits.slice(1, PHONE_DIGITS) : digits.slice(0, 10);
    if (!national) return '';

    let result = '+7 (' + national.slice(0, 3);
    if (national.length > 3) result += ')-' + national.slice(3, 6);
    if (national.length > 6) result += '-' + national.slice(6, 8);
    if (national.length > 8) result += '-' + national.slice(8, 10);
    return result;
}

// Текст из буфера обмена, пригодный для подстановки в поле телефона:
// возвращает отформатированный номер либо null, если вставлять нечего
// (пусто или явно не телефон) — тогда поле обрабатывает вставку как раньше.
export function formatPastedPhone(text) {
    const digits = normalizePhoneDigits(text);
    if (digits.length < 10) return null;
    return formatPhone(digits);
}
