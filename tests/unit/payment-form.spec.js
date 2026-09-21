import {describe, expect, it, vi} from 'vitest';
import {shallowMount} from '@vue/test-utils';

// Формы плательщика тяжёлые (vee-validate, dadata, store) — подменяем пустышками,
// тестируем только показ подсказки на самом шаге.
const stub = (name) => ({default: {name, render: (h) => h('div')}});

vi.mock('../../js/vue/registration-course/components/wizard/steps/payment-form/physical-form', () => stub('stub-physical'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/payment-form/ip-form', () => stub('stub-ip'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/payment-form/legal-form', () => stub('stub-legal'));

vi.mock('../../js/vue/registration-course/plugins/toast', () => ({
    sendNotifyError: vi.fn(),
}));

const {default: PaymentForm} = await import(
    '../../js/vue/registration-course/components/wizard/steps/payment-form.vue'
);

// shallowMount рендерит NoteLine как <noteline-stub>, текст подсказки остаётся
// внутри слота — поэтому проверяем и наличие блока, и сам текст.
const NOTE = 'noteline-stub';

describe('payment-form.vue — подсказка на шаге выбора плательщика', () => {
    it('показывает подсказку с текстом про договор, пока тип плательщика не выбран', () => {
        const wrapper = shallowMount(PaymentForm);

        expect(wrapper.vm.component).toBe(null);
        expect(wrapper.find(NOTE).exists()).toBe(true);
        expect(wrapper.find(NOTE).text()).toBe('Выберите от кого будет заключаться договор');
    });

    it('убирает подсказку после выбора типа плательщика', async () => {
        const wrapper = shallowMount(PaymentForm);

        wrapper.vm.payment = 'legal';
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.component).not.toBe(null);
        expect(wrapper.find(NOTE).exists()).toBe(false);
    });

    it('не возвращает подсказку при переключении между типами плательщика', async () => {
        const wrapper = shallowMount(PaymentForm);

        wrapper.vm.payment = 'legal';
        await wrapper.vm.$nextTick();
        wrapper.vm.payment = 'physical';
        await wrapper.vm.$nextTick();

        expect(wrapper.find(NOTE).exists()).toBe(false);
    });
});
