import {beforeEach, describe, expect, it, vi} from 'vitest';
import {shallowMount} from '@vue/test-utils';
import Vue from 'vue';

// Шаги визарда тяжёлые (vee-validate, dadata, store) — подменяем их на
// пустышки, тестируем только логику переходов по индикатору шагов.
// Имена — как у настоящих шагов: фильтр шага «Банк» для физлица ищет
// компонент по имени 'wizard-step-bank'.
const stub = (name) => ({default: {name, render: (h) => h('div')}});

vi.mock('../../js/vue/registration-course/components/wizard/steps/contacts', () => stub('wizard-step-contacts'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/payment-form', () => stub('wizard-step-payment'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/programs', () => stub('wizard-step-programs'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/bank', () => stub('wizard-step-bank'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/summary', () => stub('wizard-step-summary'));

vi.mock('../../js/vue/registration-course/service/api/ApiLikeyService', () => ({
    default: {sendFormForSaveTo1C: vi.fn(), sendDeclineRequestTo1C: vi.fn()},
}));
vi.mock('../../js/vue/registration-course/plugins/toast', () => ({
    sendNotifyError: vi.fn(),
}));

const {default: Wizard} = await import('../../js/vue/registration-course/components/wizard.vue');

const mountWizard = () => shallowMount(Wizard, {
    mocks: {$store: {state: {form: {payment: {}, contact: {}}}}},
});

// Проход вперёд штатным способом: «Далее» + успешный can-continue шага.
// Блокировку навигации (700 мс после каждого перехода) в тестах снимаем
// вручную — она проверяется отдельным сценарием ниже. Вотчер maxReachedStep
// срабатывает на следующем тике — ждём его.
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

describe('wizard.vue — переходы по индикатору шагов', () => {
    beforeEach(() => {
        vi.useRealTimers();
    });

    it('maxReachedStep растёт по мере прохождения и не уменьшается при шаге назад', async () => {
        const wrapper = mountWizard();

        await proceed(wrapper);
        await proceed(wrapper);
        expect(wrapper.vm.currentStep).toBe(2);
        expect(wrapper.vm.maxReachedStep).toBe(2);

        unlock(wrapper);
        wrapper.vm.backClicked();
        await wrapper.vm.$nextTick();
        expect(wrapper.vm.currentStep).toBe(1);
        expect(wrapper.vm.maxReachedStep).toBe(2);
    });

    it('goToStep возвращает на любой достигнутый шаг — и назад, и вперёд', async () => {
        const wrapper = mountWizard();
        await proceed(wrapper);
        await proceed(wrapper);
        await proceed(wrapper);

        unlock(wrapper);
        wrapper.vm.goToStep(0);
        expect(wrapper.vm.currentStep).toBe(0);

        // Вперёд по уже достигнутым — тоже можно: человек их заполнил.
        unlock(wrapper);
        wrapper.vm.goToStep(3);
        expect(wrapper.vm.currentStep).toBe(3);
    });

    it('goToStep не пускает дальше maxReachedStep: валидация живёт на «Далее»', async () => {
        const wrapper = mountWizard();
        await proceed(wrapper);

        unlock(wrapper);
        wrapper.vm.goToStep(2);
        expect(wrapper.vm.currentStep).toBe(1);
    });

    it('goToStep на текущий шаг и за пределы списка игнорируется', async () => {
        const wrapper = mountWizard();
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
        const wrapper = mountWizard();
        await proceed(wrapper);
        unlock(wrapper);

        wrapper.vm.goToStep(0);

        expect(wrapper.vm.navigationLocked).toBe(true);
    });

    it('клик во время блокировки навигации откладывается в pendingAction', async () => {
        const wrapper = mountWizard();
        await proceed(wrapper);
        // navigationLocked стоит после перехода вперёд
        expect(wrapper.vm.navigationLocked).toBe(true);

        wrapper.vm.goToStep(0);

        expect(wrapper.vm.currentStep).toBe(1);
        expect(wrapper.vm.pendingAction).toBeTypeOf('function');
    });

    it('во время отправки заявки уходить по индикатору нельзя', async () => {
        const wrapper = mountWizard();
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
        const wrapper = shallowMount(Wizard, {
            mocks: {$store: {state: {form: {payment: {type: 'physical'}, contact: {}}}}},
        });

        expect(wrapper.vm.steps.map((step) => step.title))
            .toEqual(['Контакты', 'Плательщик', 'Программы', 'Отправка']);
    });

    it('смена типа плательщика обрезает maxReachedStep: старый индекс не открывает обход валидации', async () => {
        // Сценарий из ревью PR #22: юрлицо дошло до «Банка», вернулось на
        // «Плательщик» и переключилось на физлицо. Список шагов сжался
        // («Банк» выпал), и старый maxReachedStep=2 стал указывать на
        // «Программы», которые человек не проходил, — клик по шкале прыгал
        // бы вперёд в обход валидации физлица. Стор реактивный, как в бою;
        // type объявлен заранее: в Vue 2 новые свойства не реактивны.
        const store = Vue.observable({state: {form: {payment: {type: null}, contact: {}}}});
        const wrapper = shallowMount(Wizard, {mocks: {$store: store}});

        await proceed(wrapper); // «Плательщик»
        await proceed(wrapper); // «Банк», maxReachedStep = 2
        unlock(wrapper);
        wrapper.vm.backClicked(); // назад на «Плательщик»
        await wrapper.vm.$nextTick();
        expect(wrapper.vm.currentStep).toBe(1);
        expect(wrapper.vm.maxReachedStep).toBe(2);

        // physical-form коммитит тип в стор даже при невалидной форме
        store.state.form.payment.type = 'physical';
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.steps).toHaveLength(4);
        expect(wrapper.vm.maxReachedStep).toBe(1);

        // «Программы» (новый индекс 2) недоступны: клик не срабатывает.
        unlock(wrapper);
        wrapper.vm.goToStep(2);
        expect(wrapper.vm.currentStep).toBe(1);
    });

    it('обратная смена физлицо → юрлицо тоже не открывает недостигнутые шаги', async () => {
        const store = Vue.observable({state: {form: {payment: {type: 'physical'}, contact: {}}}});
        const wrapper = shallowMount(Wizard, {mocks: {$store: store}});

        await proceed(wrapper); // «Плательщик»
        await proceed(wrapper); // «Программы» (у физлица нет «Банка»), maxReached = 2

        store.state.form.payment.type = 'legal';
        await wrapper.vm.$nextTick();

        expect(wrapper.vm.steps).toHaveLength(5);
        // Текущий шаг — индекс 2, но теперь это «Банк»: состав изменился,
        // достигнутость обрезана до текущего.
        expect(wrapper.vm.maxReachedStep).toBeLessThanOrEqual(wrapper.vm.currentStep);
    });
});
