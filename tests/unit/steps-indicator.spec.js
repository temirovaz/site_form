import {describe, expect, it} from 'vitest';
import {mount} from '@vue/test-utils';

const {default: StepsIndicator} = await import(
    '../../js/vue/registration-course/components/wizard/steps-indicator.vue'
);

const STEPS = ['Контакты', 'Плательщик', 'Банк', 'Программы', 'Отправка']
    .map((title) => ({title}));

const mountIndicator = (props = {}) => mount(StepsIndicator, {
    propsData: {steps: STEPS, current: 1, maxReached: 3, ...props},
});

const items = (wrapper) => wrapper.findAll('.steps-indicator__item');

describe('steps-indicator.vue', () => {
    it('подсвечивает текущий шаг, достигнутые — зелёные, недостигнутые — выгоревшие', () => {
        const wrapper = mountIndicator();
        const li = wrapper.findAll('.steps-indicator__list li');

        expect(li.at(1).classes()).toContain('steps-indicator__step--current');
        // Достигнутые — и до текущего, и после него
        expect(li.at(0).classes()).toContain('steps-indicator__step--reached');
        expect(li.at(2).classes()).toContain('steps-indicator__step--reached');
        expect(li.at(3).classes()).toContain('steps-indicator__step--reached');
        // Недостигнутый (дальше maxReached) — выгоревший
        expect(li.at(4).classes()).toContain('steps-indicator__step--unreachable');
    });

    it('помечает текущий шаг через aria-current', () => {
        const wrapper = mountIndicator();

        expect(items(wrapper).at(1).attributes('aria-current')).toBe('step');
        expect(items(wrapper).at(0).attributes('aria-current')).toBeUndefined();
    });

    it('недостигнутые шаги задизейблены, достигнутые — нет', () => {
        const wrapper = mountIndicator();

        expect(items(wrapper).at(4).attributes('disabled')).toBeDefined();
        expect(items(wrapper).at(0).attributes('disabled')).toBeUndefined();
        expect(items(wrapper).at(3).attributes('disabled')).toBeUndefined();
    });

    it('клик по достигнутому шагу эмитит go-to с его индексом', async () => {
        const wrapper = mountIndicator();

        await items(wrapper).at(3).trigger('click');

        expect(wrapper.emitted('go-to')).toEqual([[3]]);
    });

    it('клики по недостигнутому и по текущему шагу ничего не эмитят', async () => {
        const wrapper = mountIndicator();

        await items(wrapper).at(4).trigger('click');
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

    it('шаги дальше maxReached не считаются достигнутыми', () => {
        const wrapper = mountIndicator({current: 0, maxReached: 0});

        expect(wrapper.vm.isReachable(0)).toBe(true);
        expect(wrapper.vm.isReachable(1)).toBe(false);
    });
});
