import {describe, expect, it} from 'vitest';
import {mount} from '@vue/test-utils';

const {default: StepsIndicator} = await import(
    '../../js/vue/registration-course/components/wizard/steps-indicator.vue'
);

const STEPS = ['Контакты', 'Плательщик', 'Банк', 'Программы', 'Отправка']
    .map((title) => ({title}));

// validity — текущая валидность шагов (см. wizard/step-validity.js): «зелёный»
// = валиден сейчас, кликабельность = вся цепочка предыдущих шагов валидна.
const mountIndicator = (props = {}) => mount(StepsIndicator, {
    propsData: {steps: STEPS, current: 1, validity: [true, true, false, true, true], ...props},
});

const items = (wrapper) => wrapper.findAll('.steps-indicator__item');

describe('steps-indicator.vue', () => {
    it('подсвечивает текущий шаг синим, валидные — зелёными', () => {
        const wrapper = mountIndicator();
        const li = wrapper.findAll('.steps-indicator__list li');

        expect(li.at(1).classes()).toContain('steps-indicator__step--current');
        // Валидные (не текущие) — зелёные, где бы они ни были относительно текущего
        expect(li.at(0).classes()).toContain('steps-indicator__step--reached');
        expect(li.at(3).classes()).toContain('steps-indicator__step--reached');
        expect(li.at(4).classes()).toContain('steps-indicator__step--reached');
        // Невалидный — без зелёного, даже если когда-то был заполнен
        expect(li.at(2).classes()).not.toContain('steps-indicator__step--reached');
    });

    it('помечает текущий шаг через aria-current', () => {
        const wrapper = mountIndicator();

        expect(items(wrapper).at(1).attributes('aria-current')).toBe('step');
        expect(items(wrapper).at(0).attributes('aria-current')).toBeUndefined();
    });

    it('кликабельны только шаги с валидной цепочкой предыдущих', () => {
        const wrapper = mountIndicator();

        // Шаги 0, 1 и 2: цепочка до них валидна. Сам шаг 2 невалиден, но
        // перейти на него можно — иначе его нельзя было бы исправить.
        expect(items(wrapper).at(0).attributes('disabled')).toBeUndefined();
        expect(items(wrapper).at(1).attributes('disabled')).toBeUndefined();
        expect(items(wrapper).at(2).attributes('disabled')).toBeUndefined();
        // А вот всё за невалидным шагом 2 — недоступно.
        expect(items(wrapper).at(3).attributes('disabled')).toBeDefined();
        expect(items(wrapper).at(4).attributes('disabled')).toBeDefined();
    });

    it('шаг может быть зелёным (заполнен), но недоступным из-за невалидного шага перед ним', () => {
        const wrapper = mountIndicator();
        const li = wrapper.findAll('.steps-indicator__list li');

        // Шаг 3 валиден (зелёный), но перед ним невалидный шаг 2 — переход закрыт
        expect(li.at(3).classes()).toContain('steps-indicator__step--reached');
        expect(li.at(3).classes()).toContain('steps-indicator__step--unreachable');
    });

    it('клик по доступному шагу эмитит go-to с его индексом', async () => {
        const wrapper = mountIndicator();

        await items(wrapper).at(0).trigger('click');

        expect(wrapper.emitted('go-to')).toEqual([[0]]);
    });

    it('клики по недоступному и по текущему шагу ничего не эмитят', async () => {
        const wrapper = mountIndicator();

        await items(wrapper).at(3).trigger('click');
        await items(wrapper).at(1).trigger('click');

        expect(wrapper.emitted('go-to')).toBeUndefined();
    });

    it('клик по шагу сворачивает развёрнутый список', async () => {
        const wrapper = mountIndicator();
        await wrapper.setData({expanded: true});

        await items(wrapper).at(0).trigger('click');

        expect(wrapper.vm.expanded).toBe(false);
    });

    it('свёрнутая плашка показывает «Шаг N из M» и разворачивается по клику', async () => {
        const wrapper = mountIndicator();
        const collapsed = wrapper.find('.steps-indicator__current');

        expect(collapsed.text()).toContain('Шаг 2 из 5');
        expect(wrapper.classes()).not.toContain('steps-indicator--expanded');

        await collapsed.trigger('click');
        expect(wrapper.classes()).toContain('steps-indicator--expanded');
        expect(collapsed.attributes('aria-expanded')).toBe('true');

        await collapsed.trigger('click');
        expect(wrapper.classes()).not.toContain('steps-indicator--expanded');
    });

    it('шкала прогресса соответствует номеру текущего шага', () => {
        const wrapper = mountIndicator({current: 3});

        expect(wrapper.find('.steps-indicator__progress-bar').attributes('style'))
            .toContain('width: 80%');
    });

    it('первый шаг доступен всегда, второй — только если валиден первый', () => {
        const wrapper = mountIndicator({current: 0, validity: [false, false, false, false, false]});

        expect(wrapper.vm.isReachable(0)).toBe(true);
        expect(wrapper.vm.isReachable(1)).toBe(false);
    });

    it('disabled притушает шкалу и блокирует клики (на время отправки заявки)', async () => {
        const wrapper = mountIndicator({disabled: true});

        expect(wrapper.classes()).toContain('steps-indicator--disabled');
        expect(items(wrapper).at(0).attributes('disabled')).toBeDefined();

        await items(wrapper).at(0).trigger('click');
        expect(wrapper.emitted('go-to')).toBeUndefined();
    });

    it('пассивный шаг (обзор перед отправкой) не красится зелёным, хоть и валиден', () => {
        const steps = STEPS.map((step, index) =>
            index === STEPS.length - 1 ? {...step, passive: true} : step);
        const wrapper = mountIndicator({
            steps, current: 1, validity: [true, true, true, true, true],
        });
        const li = wrapper.findAll('.steps-indicator__list li');

        expect(li.at(4).classes()).not.toContain('steps-indicator__step--reached');
        // Но на цепочку доступности пассивность не влияет — перейти можно.
        expect(items(wrapper).at(4).attributes('disabled')).toBeUndefined();
        expect(li.at(0).classes()).toContain('steps-indicator__step--reached');
    });

    it('переживает пустой список шагов без падения', () => {
        const wrapper = mountIndicator({steps: [], current: 0, validity: []});

        expect(wrapper.vm.currentTitle).toBe('');
        expect(wrapper.find('.steps-indicator__progress-bar').attributes('style'))
            .toContain('width: 0%');
        expect(wrapper.text()).toContain('Шаг 1 из 0');
    });
});
