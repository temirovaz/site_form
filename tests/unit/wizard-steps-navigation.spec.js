import {beforeEach, describe, expect, it, vi} from 'vitest';
import {shallowMount} from '@vue/test-utils';
import Vue from 'vue';

// Шаги визарда тяжёлые (vee-validate, dadata, store) — подменяем их на
// пустышки, тестируем только логику переходов по индикатору шагов.
// Имена — как у настоящих шагов: фильтр шага «Банк» для физлица ищет
// компонент по имени 'wizard-step-bank', а «Отправка» ('wizard-save-form')
// считается валидной всегда — данных она не требует.
const stub = (name) => ({default: {name, render: (h) => h('div')}});

vi.mock('../../js/vue/registration-course/components/wizard/steps/contacts', () => stub('wizard-step-contacts'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/payment-form', () => stub('wizard-step-payment'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/programs', () => stub('wizard-step-programs'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/bank', () => stub('wizard-step-bank'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/summary', () => stub('wizard-save-form'));

vi.mock('../../js/vue/registration-course/service/api/ApiLikeyService', () => ({
    default: {sendFormForSaveTo1C: vi.fn(), sendDeclineRequestTo1C: vi.fn()},
}));
vi.mock('../../js/vue/registration-course/plugins/toast', () => ({
    sendNotifyError: vi.fn(),
}));

const {default: Wizard} = await import('../../js/vue/registration-course/components/wizard.vue');

// Стор реактивный, как в бою; stepValidity — то, что шаги сообщают о себе
// (см. wizard/step-validity.js). type объявлен заранее: в Vue 2 новые
// свойства не реактивны.
const makeStore = (stepValidity = {}) => Vue.observable({
    state: {
        form: {payment: {type: null}, contact: {}},
        stepValidity: {...stepValidity},
    },
});

const mountWizard = (stepValidity) => shallowMount(Wizard, {
    mocks: {$store: makeStore(stepValidity)},
});

// Проход вперёд штатным способом: «Далее» + успешный can-continue шага.
// Блокировку навигации (700 мс после каждого перехода) в тестах снимаем
// вручную — она проверяется отдельным сценарием ниже.
const proceed = async (wrapper) => {
    wrapper.vm.navigationLocked = false;
    wrapper.vm.pendingAction = null;
    wrapper.vm.nextStep();
    wrapper.vm.proceedNext({status: true});
    await wrapper.vm.$nextTick();
};

// Снимает блокировку навигации, чтобы прямой вызов методов перехода работал.
const unlock = (wrapper) => {
    wrapper.vm.navigationLocked = false;
    wrapper.vm.pendingAction = null;
};

// Все шаги, кроме «Отправки» (она валидна всегда), — валидны.
const ALL_VALID = {
    'wizard-step-contacts': true,
    'wizard-step-payment': true,
    'wizard-step-bank': true,
    'wizard-step-programs': true,
};

describe('wizard.vue — переходы по индикатору шагов', () => {
    beforeEach(() => {
        vi.useRealTimers();
    });

    it('stepsValidity читает валидность из стора; «Отправка» валидна всегда', () => {
        const wrapper = mountWizard({'wizard-step-contacts': true});

        expect(wrapper.vm.stepsValidity).toEqual([true, false, false, false, true]);
    });

    it('goToStep пускает на любой шаг с валидной цепочкой предыдущих — и назад, и вперёд', async () => {
        const wrapper = mountWizard(ALL_VALID);
        await proceed(wrapper);
        await proceed(wrapper);

        unlock(wrapper);
        wrapper.vm.goToStep(0);
        expect(wrapper.vm.currentStep).toBe(0);

        // Вперёд на ещё не посещённый «Отправка» — тоже можно: вся цепочка
        // перед ним валидна, валидацию это не обходит.
        unlock(wrapper);
        wrapper.vm.goToStep(4);
        expect(wrapper.vm.currentStep).toBe(4);
    });

    it('goToStep не пускает, если какой-то предыдущий шаг невалиден', async () => {
        // «Плательщик» не заполнен: дальше него клик не ведёт, даже если сам
        // целевой шаг валиден (например, «Банк» заполняли раньше).
        const wrapper = mountWizard({
            'wizard-step-contacts': true,
            'wizard-step-bank': true,
            'wizard-step-programs': true,
        });

        unlock(wrapper);
        wrapper.vm.goToStep(2);
        expect(wrapper.vm.currentStep).toBe(0);

        unlock(wrapper);
        wrapper.vm.goToStep(1); // сам «Плательщик» — можно, перед ним всё валидно
        expect(wrapper.vm.currentStep).toBe(1);
    });

    it('стёртый ранний шаг сразу блокирует все последующие (сценарий из задачи)', async () => {
        // Было всё заполнено, человек вернулся на «Контакты» и стёр поля:
        // валидность шага упала — «Банк», «Программы» и «Отправка» недоступны.
        const store = makeStore({...ALL_VALID});
        const wrapper = shallowMount(Wizard, {mocks: {$store: store}});

        unlock(wrapper);
        wrapper.vm.goToStep(4);
        expect(wrapper.vm.currentStep).toBe(4);

        store.state.stepValidity['wizard-step-contacts'] = false;
        await wrapper.vm.$nextTick();

        unlock(wrapper);
        wrapper.vm.goToStep(1);
        expect(wrapper.vm.currentStep).toBe(4);
    });

    it('goToStep на текущий шаг и за пределы списка игнорируется', async () => {
        const wrapper = mountWizard(ALL_VALID);
        await proceed(wrapper);

        unlock(wrapper);
        wrapper.vm.goToStep(1);
        expect(wrapper.vm.currentStep).toBe(1);
        expect(wrapper.vm.navigationLocked).toBe(false);

        wrapper.vm.goToStep(99);
        wrapper.vm.goToStep(-1);
        expect(wrapper.vm.currentStep).toBe(1);
    });

    it('goToStep блокирует навигацию, как обычный переход', async () => {
        const wrapper = mountWizard(ALL_VALID);
        await proceed(wrapper);
        unlock(wrapper);

        wrapper.vm.goToStep(0);

        expect(wrapper.vm.navigationLocked).toBe(true);
    });

    it('клик во время блокировки навигации откладывается в pendingAction', async () => {
        const wrapper = mountWizard(ALL_VALID);
        await proceed(wrapper);
        // navigationLocked стоит после перехода вперёд
        expect(wrapper.vm.navigationLocked).toBe(true);

        wrapper.vm.goToStep(0);

        expect(wrapper.vm.currentStep).toBe(1);
        expect(wrapper.vm.pendingAction).toBeTypeOf('function');
    });

    it('во время отправки заявки уходить по индикатору нельзя', async () => {
        const wrapper = mountWizard(ALL_VALID);
        await proceed(wrapper);
        unlock(wrapper);
        wrapper.vm.submitInProgress = true;

        wrapper.vm.goToStep(0);

        expect(wrapper.vm.currentStep).toBe(1);
    });

    it('индикатор получает steps с названиями и скрывается на экране «Спасибо»', async () => {
        const wrapper = mountWizard();

        const indicator = () => wrapper.find('steps-indicator-stub');
        expect(indicator().exists()).toBe(true);
        expect(wrapper.vm.steps.map((step) => step.title))
            .toEqual(['Контакты', 'Плательщик', 'Банк', 'Программы', 'Отправка']);

        await wrapper.setData({isFinish: true});
        expect(indicator().exists()).toBe(false);
    });

    it('для физлица шаг «Банк» исчезает из шкалы', () => {
        const store = makeStore();
        store.state.form.payment.type = 'physical';
        const wrapper = shallowMount(Wizard, {mocks: {$store: store}});

        expect(wrapper.vm.steps.map((step) => step.title))
            .toEqual(['Контакты', 'Плательщик', 'Программы', 'Отправка']);
    });

    it('смена типа плательщика не открывает обход валидации (сценарий ревью)', async () => {
        // Сценарий из ревью PR #22: юрлицо дошло до «Банка», вернулось на
        // «Плательщик» и переключилось на физлицо. Состав шагов сжался
        // («Банк» выпал), но обхода нет уже по построению: доступность
        // считается от текущей валидности, а «Плательщик» при смене типа
        // невалиден, пока не заполнена новая подформа.
        const store = makeStore({
            'wizard-step-contacts': true,
            'wizard-step-payment': true,
            'wizard-step-bank': true,
        });
        const wrapper = shallowMount(Wizard, {mocks: {$store: store}});

        await proceed(wrapper); // «Плательщик»
        await proceed(wrapper); // «Банк»
        unlock(wrapper);
        wrapper.vm.backClicked(); // назад на «Плательщик»
        await wrapper.vm.$nextTick();
        expect(wrapper.vm.currentStep).toBe(1);

        // Переключение на физлицо: состав сжался, подформа сообщила
        // невалидность (поля пустые) — «Программы» недоступны.
        store.state.form.payment.type = 'physical';
        store.state.stepValidity['wizard-step-payment'] = false;
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.steps).toHaveLength(4);
        unlock(wrapper);
        wrapper.vm.goToStep(2); // «Программы» по новому составу
        expect(wrapper.vm.currentStep).toBe(1);

        // Заполнил форму физлица — цепочка восстановилась, можно дальше.
        store.state.stepValidity['wizard-step-payment'] = true;
        await wrapper.vm.$nextTick();
        unlock(wrapper);
        wrapper.vm.goToStep(2);
        expect(wrapper.vm.currentStep).toBe(2);
    });
});
