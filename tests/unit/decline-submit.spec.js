import {beforeEach, describe, expect, it, vi} from 'vitest';
import {shallowMount} from '@vue/test-utils';

// Шаги визарда тяжёлые (vee-validate, dadata, store) — подменяем пустышками,
// тестируем только ветвление отправки в wizard.vue.
const stub = (name) => ({default: {name, render: (h) => h('div')}});

vi.mock('../../js/vue/registration-course/components/wizard/steps/contacts', () => stub('stub-contacts'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/payment-form', () => stub('stub-payment'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/programs', () => stub('stub-programs'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/bank', () => stub('stub-bank'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/summary', () => stub('stub-summary'));

const {mockSendForm, mockSendDecline, mockSendNotifyError} = vi.hoisted(() => ({
    mockSendForm: vi.fn(async () => ({})),
    mockSendDecline: vi.fn(async () => ({})),
    mockSendNotifyError: vi.fn(),
}));

vi.mock('../../js/vue/registration-course/service/api/ApiLikeyService', () => ({
    default: {
        sendFormForSaveTo1C: mockSendForm,
        sendDeclineRequestTo1C: mockSendDecline,
    },
}));

vi.mock('../../js/vue/registration-course/plugins/toast', () => ({
    sendNotifyError: mockSendNotifyError,
}));

const {default: Wizard} = await import('../../js/vue/registration-course/components/wizard.vue');

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

function mountWizard({canSubmitAsDecline = false} = {}) {
    return shallowMount(Wizard, {
        mocks: {$store: {state: {canSubmitAsDecline, form: {payment: {}, contact: {}}}}},
    });
}

describe('wizard.vue — отправка «за меня заполнит менеджер»', () => {
    beforeEach(() => {
        mockSendForm.mockClear();
        mockSendDecline.mockClear();
        mockSendNotifyError.mockReset();
    });

    it('на первом шаге показывает «Отправить» вместо «Далее», когда отказ готов к отправке', () => {
        const wrapper = mountWizard({canSubmitAsDecline: true});

        expect(wrapper.vm.isFirstStep).toBe(true);
        expect(wrapper.vm.isLastStep).toBe(false);
        expect(wrapper.vm.isSubmitStep).toBe(true);
    });

    it('на первом шаге без отказа оставляет обычный переход по шагам', () => {
        const wrapper = mountWizard({canSubmitAsDecline: false});

        expect(wrapper.vm.isSubmitStep).toBe(false);
    });

    it('на последнем шаге показывает «Отправить» независимо от флага отказа', () => {
        const wrapper = mountWizard({canSubmitAsDecline: false});
        wrapper.vm.currentStep = wrapper.vm.steps.length - 1;

        expect(wrapper.vm.isLastStep).toBe(true);
        expect(wrapper.vm.isSubmitStep).toBe(true);
        expect(wrapper.vm.isDeclineSubmit).toBe(false);
    });

    it('в режиме отказа шлёт урезанную заявку, а не весь state.form', async () => {
        const wrapper = mountWizard({canSubmitAsDecline: true});

        wrapper.vm.saveForm();
        wrapper.vm.proceedFinish({status: true});
        await flushPromises();

        expect(mockSendDecline).toHaveBeenCalledTimes(1);
        expect(mockSendForm).not.toHaveBeenCalled();
    });

    it('обычным путём шлёт полную заявку', async () => {
        const wrapper = mountWizard({canSubmitAsDecline: false});
        wrapper.vm.currentStep = wrapper.vm.steps.length - 1;

        wrapper.vm.saveForm();
        wrapper.vm.proceedFinish({status: true});
        await flushPromises();

        expect(mockSendForm).toHaveBeenCalledTimes(1);
        expect(mockSendDecline).not.toHaveBeenCalled();
    });

    it('не отправляет отказ дважды, если «Отправить» нажали повторно до ответа 1С', async () => {
        let resolveSend;
        mockSendDecline.mockImplementation(() => new Promise((resolve) => {
            resolveSend = resolve;
        }));

        const wrapper = mountWizard({canSubmitAsDecline: true});

        wrapper.vm.saveForm();
        wrapper.vm.proceedFinish({status: true});
        expect(mockSendDecline).toHaveBeenCalledTimes(1);

        wrapper.vm.saveForm();
        wrapper.vm.proceedFinish({status: true});
        expect(mockSendDecline).toHaveBeenCalledTimes(1);

        resolveSend({});
        await flushPromises();
        expect(wrapper.vm.isFinish).toBe(true);
    });

    it('на экране благодарности обещает письмо при наличии почты и звонок, если оставлен только телефон', async () => {
        const withEmail = mountWizard();
        withEmail.vm.$store.state.form.contact = {email: 'test@example.com', phone: '+79991234567'};
        expect(withEmail.vm.contactEmail).toBe('test@example.com');

        const phoneOnly = mountWizard();
        phoneOnly.vm.$store.state.form.contact = {email: '', phone: '+79991234567'};
        expect(phoneOnly.vm.contactEmail).toBe('');
        expect(phoneOnly.vm.contactPhone).toBe('+79991234567');
    });
});
