import {beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import Vue from 'vue';
import {clearDraft} from '../../js/vue/registration-course/plugins/draft';

// Тяжёлые зависимости шага контактов подменяем: тестируем только правила
// телефона в validateStep. SuggestionEmail — пустышка: почта здесь не
// предмет теста, значение задаём напрямую в data.
const stub = (name) => ({default: {name, props: ['label', 'rules', 'value'], render: (h) => h('div')}});

vi.mock('../../js/vue/registration-course/components/suggestion/suggestion-email', () => stub('stub-email'));
vi.mock('../../js/vue/registration-course/components/dadata-suggestion', () => stub('stub-dadata'));
vi.mock('../../js/vue/registration-course/service/RegistrationCourseFormService', () => ({
    default: {saveCommentInSummaryStep: vi.fn()},
}));
vi.mock('../../js/vue/registration-course/plugins/api', () => ({
    api: {likey: {post: vi.fn()}, dadata: {post: vi.fn()}},
}));

// Регистрирует настоящие ValidationObserver/ValidationProvider и правила,
// включая новое phone — иначе тест проверял бы не ту валидацию, что в бою.
await import('../../js/vue/registration-course/plugins/vee-validate');

// FormField регистрируется глобально в index.js приложения — повторяем это
// здесь, иначе в шаблоне он остаётся неизвестным элементом и провайдер
// валидации телефона просто не существует.
const {default: FormField} = await import('../../js/vue/registration-course/components/form-field.vue');
Vue.component('FormField', FormField);

const {default: ContactsStep} = await import(
    '../../js/vue/registration-course/components/wizard/steps/contacts.vue'
);

const COMPLETE_PHONE = '+7 (999)-123-45-67';
const PARTIAL_PHONE = '+7 (925) 1';

const mountStep = () => {
    const $store = {commit: vi.fn()};
    const wrapper = mount(ContactsStep, {mocks: {$store}});
    return {wrapper, $store};
};

// Провайдер vee-validate узнаёт значение из нативных input-событий, поэтому
// телефон вводим как пользователь, а не через setData.
const typePhone = async (wrapper, value) => {
    const input = wrapper.find('input.form-control');
    await input.setValue(value);
    await input.trigger('input');
};

describe('contacts.vue — валидация телефона', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Шаг контактов теперь несёт draftMixin: он восстанавливает поля из
        // черновика при монтировании. Чтобы тесты валидации не зависели от
        // черновика, оставленного предыдущим тестом, сбрасываем его целиком.
        clearDraft();
    });

    it('не пускает дальше с частично введённым номером', async () => {
        const {wrapper} = mountStep();
        await typePhone(wrapper, PARTIAL_PHONE);
        await wrapper.setData({privacyPolicyAccepted: true});

        const success = await wrapper.vm.validateStep();

        expect(success).toBe(false);
        expect(wrapper.text()).toContain('полный номер телефона');
    });

    it('пускает с полным номером и сохраняет контакты в стор', async () => {
        const {wrapper, $store} = mountStep();
        await typePhone(wrapper, COMPLETE_PHONE);
        await wrapper.setData({privacyPolicyAccepted: true});

        const success = await wrapper.vm.validateStep();

        expect(success).toBe(true);
        expect($store.commit).toHaveBeenCalledWith('saveDataFormForStep', {
            contact: {email: '', phone: COMPLETE_PHONE},
        });
    });

    it('в режиме отказа неполный телефон не проходит, даже когда он единственный контакт', async () => {
        const {wrapper} = mountStep();
        await wrapper.setData({declineApplication: true, privacyPolicyAccepted: true});
        await typePhone(wrapper, PARTIAL_PHONE);

        const success = await wrapper.vm.validateStep();

        expect(success).toBe(false);
    });

    it('в режиме отказа пустой телефон допустим, если оставлена почта', async () => {
        const {wrapper, $store} = mountStep();
        await wrapper.setData({
            email: 'ivanov@example.com',
            declineApplication: true,
            privacyPolicyAccepted: true,
        });

        const success = await wrapper.vm.validateStep();

        expect(success).toBe(true);
        expect($store.commit).toHaveBeenCalledWith('saveDataFormForStep', {
            contact: {email: 'ivanov@example.com', phone: ''},
        });
    });
});
