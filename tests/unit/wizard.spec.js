import {beforeEach, describe, expect, it, vi} from 'vitest';
import {shallowMount} from '@vue/test-utils';

// Шаги визарда тяжёлые (vee-validate, dadata, store) — подменяем их на пустышки,
// чтобы тестировать только логику wizard.vue вокруг отправки заявки в 1С.
const stub = (name) => ({default: {name, render: (h) => h('div')}});

vi.mock('../../js/vue/registration-course/components/wizard/steps/contacts', () => stub('stub-contacts'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/payment-form', () => stub('stub-payment'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/programs', () => stub('stub-programs'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/bank', () => stub('stub-bank'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/summary', () => stub('stub-summary'));

const {mockSendFormForSaveTo1C, mockSendNotifyError} = vi.hoisted(() => ({
    mockSendFormForSaveTo1C: vi.fn(),
    mockSendNotifyError: vi.fn(),
}));

vi.mock('../../js/vue/registration-course/service/api/ApiLikeyService', () => ({
    default: {sendFormForSaveTo1C: mockSendFormForSaveTo1C},
}));

vi.mock('../../js/vue/registration-course/plugins/toast', () => ({
    sendNotifyError: mockSendNotifyError,
}));

const {default: Wizard} = await import('../../js/vue/registration-course/components/wizard.vue');

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

function mountWizard() {
    return shallowMount(Wizard, {
        mocks: {$store: {state: {form: {payment: {}, contact: {}}}}},
    });
}

describe('wizard.vue — отправка заявки («Отправить»)', () => {
    beforeEach(() => {
        mockSendFormForSaveTo1C.mockReset();
        mockSendNotifyError.mockReset();
    });

    it('не отправляет заявку в 1С повторно, если «Отправить» нажали второй раз до ответа первого запроса', async () => {
        let resolveSend;
        mockSendFormForSaveTo1C.mockImplementation(() => new Promise((resolve) => {
            resolveSend = resolve;
        }));

        const wrapper = mountWizard();

        // Первый клик — реальный путь: saveForm() ставит clickedFinish, а
        // summary.vue в ответ эмитит can-finish, что вызывает proceedFinish.
        wrapper.vm.saveForm();
        wrapper.vm.proceedFinish({status: true});

        expect(mockSendFormForSaveTo1C).toHaveBeenCalledTimes(1);
        expect(wrapper.vm.submitInProgress).toBe(true);

        // Второй, «нетерпеливый» клик — первый запрос ещё не ответил.
        wrapper.vm.saveForm();
        wrapper.vm.proceedFinish({status: true});

        expect(mockSendFormForSaveTo1C).toHaveBeenCalledTimes(1);

        resolveSend({data: {status: 'success'}});
        await flushPromises();

        expect(wrapper.vm.isFinish).toBe(true);
        expect(wrapper.vm.submitInProgress).toBe(false);
    });

    it('снимает блокировку и показывает уведомление, если 1С ответила ошибкой', async () => {
        let rejectSend;
        mockSendFormForSaveTo1C.mockImplementation(() => new Promise((resolve, reject) => {
            rejectSend = reject;
        }));

        const wrapper = mountWizard();

        wrapper.vm.saveForm();
        wrapper.vm.proceedFinish({status: true});

        expect(wrapper.vm.submitInProgress).toBe(true);

        rejectSend(new Error('network error'));
        await flushPromises();

        expect(wrapper.vm.submitInProgress).toBe(false);
        expect(wrapper.vm.isFinish).toBe(false);
        expect(mockSendNotifyError).toHaveBeenCalledTimes(1);

        // После ошибки кнопка должна снова быть доступна для повторной отправки.
        mockSendFormForSaveTo1C.mockResolvedValueOnce({data: {status: 'success'}});
        wrapper.vm.saveForm();
        wrapper.vm.proceedFinish({status: true});
        await flushPromises();

        expect(mockSendFormForSaveTo1C).toHaveBeenCalledTimes(2);
        expect(wrapper.vm.isFinish).toBe(true);
    });

    it('disabled кнопки «Отправить» связан с submitInProgress', async () => {
        let resolveSend;
        mockSendFormForSaveTo1C.mockImplementation(() => new Promise((resolve) => {
            resolveSend = resolve;
        }));

        const wrapper = mountWizard();
        // Последний шаг визарда — summary, чтобы отрендерилась кнопка «Отправить».
        wrapper.setData({currentStep: wrapper.vm.steps.length - 1});
        await wrapper.vm.$nextTick();

        const findSubmitButton = () => wrapper.findAll('button').filter((btn) => btn.text() === 'Отправить').at(0);

        expect(findSubmitButton().attributes('disabled')).toBeFalsy();

        wrapper.vm.saveForm();
        wrapper.vm.proceedFinish({status: true});
        await wrapper.vm.$nextTick();

        expect(findSubmitButton().attributes('disabled')).toBeTruthy();

        resolveSend({data: {status: 'success'}});
        await flushPromises();
    });

    it('блокирует «Назад» на время отправки заявки, чтобы нельзя было уйти со страницы', async () => {
        let resolveSend;
        mockSendFormForSaveTo1C.mockImplementation(() => new Promise((resolve) => {
            resolveSend = resolve;
        }));

        const wrapper = mountWizard();
        wrapper.setData({currentStep: wrapper.vm.steps.length - 1});
        await wrapper.vm.$nextTick();

        const findBackButton = () => wrapper.findAll('button').filter((btn) => btn.text() === 'Назад').at(0);

        expect(findBackButton().attributes('disabled')).toBeFalsy();

        wrapper.vm.saveForm();
        wrapper.vm.proceedFinish({status: true});
        await wrapper.vm.$nextTick();

        // Кнопка визуально задизейблена...
        expect(findBackButton().attributes('disabled')).toBeTruthy();
        // ...и клик по ней (в обход disabled, напрямую через обработчик) тоже
        // не должен переключать шаг, пока ответ 1С не пришёл.
        const stepBefore = wrapper.vm.currentStep;
        wrapper.vm.backClicked();
        expect(wrapper.vm.currentStep).toBe(stepBefore);

        // Успешный ответ 1С переводит визард на экран «Спасибо» (isFinish),
        // футер с кнопками исчезает целиком — проверять disabled после этого
        // уже нечего. Просто даём промису доиграть, чтобы не оставлять «повисший»
        // resolve в следующем тесте.
        resolveSend({data: {status: 'success'}});
        await flushPromises();
    });

    it('снимает блокировку с «Назад» после ошибки, а не только после успеха', async () => {
        let rejectSend;
        mockSendFormForSaveTo1C.mockImplementation(() => new Promise((resolve, reject) => {
            rejectSend = reject;
        }));

        const wrapper = mountWizard();
        wrapper.setData({currentStep: wrapper.vm.steps.length - 1});
        await wrapper.vm.$nextTick();

        const findBackButton = () => wrapper.findAll('button').filter((btn) => btn.text() === 'Назад').at(0);

        wrapper.vm.saveForm();
        wrapper.vm.proceedFinish({status: true});
        await wrapper.vm.$nextTick();

        expect(findBackButton().attributes('disabled')).toBeTruthy();

        rejectSend(new Error('network error'));
        await flushPromises();
        await wrapper.vm.$nextTick();

        expect(findBackButton().attributes('disabled')).toBeFalsy();
    });
});
