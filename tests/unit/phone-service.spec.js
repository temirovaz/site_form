import {describe, expect, it} from 'vitest';
import {
    formatPastedPhone,
    formatPhone,
    isCompletePhone,
    normalizePhoneDigits,
} from '../../js/vue/registration-course/service/PhoneService';

// Нормализация телефона: вставка из буфера с «мусором» и проверка полноты
// номера (маска поля сама по себе пропускает неполный ввод).

describe('normalizePhoneDigits', () => {
    it('оставляет только цифры из «грязной» строки', () => {
        expect(normalizePhoneDigits('+7 (999) 123-45-67')).toBe('79991234567');
        expect(normalizePhoneDigits('8 999 123 45 67')).toBe('79991234567');
        expect(normalizePhoneDigits('тел: 8(999)123-45-67, раб.')).toBe('89991234567'.replace('8', '7'));
    });

    it('заменяет ведущую восьмёрку на семёрку', () => {
        expect(normalizePhoneDigits('89991234567')).toBe('79991234567');
    });

    it('дополняет семёркой 10 цифр без кода страны', () => {
        expect(normalizePhoneDigits('9991234567')).toBe('79991234567');
    });

    it('не трогает номер, который уже в виде 7XXXXXXXXXX', () => {
        expect(normalizePhoneDigits('79991234567')).toBe('79991234567');
    });

    it('возвращает как есть слишком короткий и слишком длинный ввод', () => {
        // Обрезать молча нельзя: «8 999 123-45-67 доб. 5» превратился бы
        // в чужой номер. Такое честно не проходит валидацию.
        expect(normalizePhoneDigits('999')).toBe('999');
        expect(normalizePhoneDigits('899912345675')).toBe('899912345675');
    });

    it('переживает пустое и нестроковое значение', () => {
        expect(normalizePhoneDigits('')).toBe('');
        expect(normalizePhoneDigits(null)).toBe('');
        expect(normalizePhoneDigits(undefined)).toBe('');
    });
});

describe('isCompletePhone', () => {
    it('принимает полный номер в любом виде', () => {
        expect(isCompletePhone('+7 (999)-123-45-67')).toBe(true);
        expect(isCompletePhone('89991234567')).toBe(true);
        expect(isCompletePhone('9991234567')).toBe(true);
    });

    it('отклоняет частично заполненную маску', () => {
        // Регресс: раньше required пропускал такое в 1С.
        expect(isCompletePhone('+7 (925) 1')).toBe(false);
        expect(isCompletePhone('+7 (999)-123-45')).toBe(false);
    });

    it('отклоняет пустое значение и чужой код страны', () => {
        expect(isCompletePhone('')).toBe(false);
        expect(isCompletePhone('19991234567')).toBe(false);
    });
});

describe('formatPhone', () => {
    it('раскладывает цифры по маске отображения', () => {
        expect(formatPhone('79991234567')).toBe('+7 (999)-123-45-67');
        expect(formatPhone('8 (999) 123-45-67')).toBe('+7 (999)-123-45-67');
        expect(formatPhone('9991234567')).toBe('+7 (999)-123-45-67');
    });

    it('форматирует неполный номер по мере ввода', () => {
        expect(formatPhone('999')).toBe('+7 (999');
        expect(formatPhone('99912')).toBe('+7 (999)-12');
        expect(formatPhone('9991234')).toBe('+7 (999)-123-4');
    });

    it('возвращает пустую строку, когда цифр нет', () => {
        expect(formatPhone('')).toBe('');
        expect(formatPhone('абв')).toBe('');
    });

    it('не строит номер из ввода длиннее 11 цифр', () => {
        // Усекать молча нельзя: «8 999 123-45-67 доб. 5» иначе превратился бы
        // в чужой номер +7 (899)-912-34-56, который проходит валидацию.
        expect(formatPhone('899912345675')).toBe('');
        expect(formatPhone('8999123456789991234567')).toBe('');
    });
});

describe('formatPastedPhone — текст из буфера обмена', () => {
    it('чистит номер, скопированный с оформлением и текстом вокруг', () => {
        expect(formatPastedPhone('8 (999) 123-45-67')).toBe('+7 (999)-123-45-67');
        expect(formatPastedPhone('Тел: +7 999 123-45-67')).toBe('+7 (999)-123-45-67');
        expect(formatPastedPhone('89991234567\n')).toBe('+7 (999)-123-45-67');
    });

    it('возвращает null для явно не телефона — вставку обработает маска', () => {
        expect(formatPastedPhone('')).toBeNull();
        expect(formatPastedPhone('привет')).toBeNull();
        expect(formatPastedPhone('12345')).toBeNull();
    });

    it('возвращает null для ввода длиннее 11 цифр — это не один номер', () => {
        // Блокер из ревью: «8 (999) 123-45-67 доб. 5» и два номера подряд
        // нельзя молча усекать — получался бы чужой, но валидный номер.
        expect(formatPastedPhone('8 (999) 123-45-67 доб. 5')).toBeNull();
        expect(formatPastedPhone('89991234567 89991234567')).toBeNull();
        expect(formatPastedPhone('899912345675')).toBeNull();
    });
});
