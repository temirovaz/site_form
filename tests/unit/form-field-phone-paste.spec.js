import {describe, expect, it, vi} from 'vitest';
import {shallowMount} from '@vue/test-utils';
import Vue from 'vue';

// Перехват вставки телефона в FormField: «грязный» номер из буфера
// раскладывается по маске, явно не телефон отдаётся нативной вставке.

// FormField оборачивает поле в глобальный ValidationProvider — подменяем его
// прозрачной обёрткой, валидация здесь не предмет теста.
Vue.component('ValidationProvider', {
    name: 'ValidationProvider',
    render(h) {
        return h('div', this.$scopedSlots.default?.({errors: []}) ?? this.$slots.default);
    },
});

const {default: FormField} = await import('../../js/vue/registration-course/components/form-field.vue');

const pasteEvent = (text) => ({
    clipboardData: {getData: () => text},
    preventDefault: vi.fn(),
});

const mountField = () => shallowMount(FormField, {propsData: {name: 'phone', label: 'Телефон'}});

describe('form-field.vue — вставка телефона из буфера', () => {
    it('раскладывает по маске номер с восьмёркой, скобками и пробелами', async () => {
        const wrapper = mountField();
        const event = pasteEvent('8 (999) 123-45-67');

        wrapper.vm.onPhonePaste(event);
        // input эмитится из вотчера localValue — ждём тик.
        await wrapper.vm.$nextTick();

        expect(event.preventDefault).toHaveBeenCalled();
        expect(wrapper.vm.localValue).toBe('+7 (999)-123-45-67');
        expect(wrapper.emitted('input').at(-1)).toEqual(['+7 (999)-123-45-67']);
    });

    it('чистит номер, скопированный вместе с текстом вокруг', () => {
        const wrapper = mountField();
        const event = pasteEvent('Тел: +7 999 123-45-67 (рабочий)');

        wrapper.vm.onPhonePaste(event);

        expect(wrapper.vm.localValue).toBe('+7 (999)-123-45-67');
    });

    it('дополняет семёркой 10 цифр без кода страны', () => {
        const wrapper = mountField();
        const event = pasteEvent('9991234567');

        wrapper.vm.onPhonePaste(event);

        expect(wrapper.vm.localValue).toBe('+7 (999)-123-45-67');
    });

    it('не трогает вставку, если в буфере явно не телефон', () => {
        const wrapper = mountField();
        const event = pasteEvent('привет');

        wrapper.vm.onPhonePaste(event);

        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(wrapper.vm.localValue).toBe('');
    });
});
