import {beforeEach, describe, expect, it, vi} from 'vitest';
import {shallowMount} from '@vue/test-utils';

// Реальный стор импортирует api, поэтому подменяем сам модуль api: тестируем
// именно реакцию стора и шага «Программы» на отказ запроса, а не сеть.
const {mockLikeyPost} = vi.hoisted(() => ({
    mockLikeyPost: vi.fn(),
}));

vi.mock('../../js/vue/registration-course/plugins/api', () => ({
    api: {likey: {post: mockLikeyPost}, dadata: {post: vi.fn()}},
}));

// Модальные окна тяжёлые и к предмету теста не относятся — пустышки.
const stub = (name) => ({default: {name, render: (h) => h('div')}});

vi.mock('../../js/vue/registration-course/components/wizard/steps/programs/modals/selecting-program-for-listener', () => stub('stub-selecting'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/programs/modals/adding-listener-for-program', () => stub('stub-adding'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/programs/modals/adding-exist-listener-for-program', () => stub('stub-adding-exist'));
vi.mock('../../js/vue/registration-course/components/wizard/steps/programs/modals/listener-for-program-update', () => stub('stub-listener-update'));

vi.mock('../../js/vue/registration-course/plugins/toast', () => ({
    sendNotifyError: vi.fn(),
}));

const {default: store} = await import('../../js/vue/registration-course/plugins/store');
const {default: ProgramsStep} = await import(
    '../../js/vue/registration-course/components/wizard/steps/programs.vue'
);

const PROGRAMS_RESPONSE = {
    data: {
        data: [
            {id: 1, name: 'Охрана труда', prefix: 'PROG-01', hours: 16},
        ],
    },
};

const resetStore = () => store.replaceState({
    programs: [],
    programsLoading: false,
    programsLoadError: false,
    knownListeners: [],
    canSubmitAsDecline: false,
    form: {contact: {}, payment: {type: null}, bank: {}},
});

describe('store.loadPrograms — ошибка загрузки списка программ', () => {
    beforeEach(() => {
        mockLikeyPost.mockReset();
        resetStore();
    });

    it('при отказе запроса выставляет programsLoadError и снимает programsLoading', async () => {
        mockLikeyPost.mockRejectedValue(new Error('Network Error'));

        await store.dispatch('loadPrograms');

        expect(store.state.programsLoadError).toBe(true);
        expect(store.state.programsLoading).toBe(false);
        expect(store.state.programs).toEqual([]);
    });

    it('при успешной загрузке флаги ошибки и загрузки сброшены', async () => {
        mockLikeyPost.mockResolvedValue(PROGRAMS_RESPONSE);

        await store.dispatch('loadPrograms');

        expect(store.state.programsLoadError).toBe(false);
        expect(store.state.programsLoading).toBe(false);
        expect(store.state.programs).toHaveLength(1);
        expect(store.state.programs[0].id).toBe(1);
    });

    it('после ошибки повторный dispatch снова идёт в сеть и забирает список', async () => {
        // Guard `if(!programs.length)` после ошибки должен пропускать повторную
        // загрузку: список пуст, значит попытка честно повторяется.
        mockLikeyPost.mockRejectedValueOnce(new Error('Network Error'));
        await store.dispatch('loadPrograms');
        expect(store.state.programsLoadError).toBe(true);

        mockLikeyPost.mockResolvedValueOnce(PROGRAMS_RESPONSE);
        await store.dispatch('loadPrograms');

        expect(mockLikeyPost).toHaveBeenCalledTimes(2);
        expect(store.state.programsLoadError).toBe(false);
        expect(store.state.programs).toHaveLength(1);
    });

    it('не ходит в сеть повторно, если список уже загружен', async () => {
        mockLikeyPost.mockResolvedValue(PROGRAMS_RESPONSE);

        await store.dispatch('loadPrograms');
        await store.dispatch('loadPrograms');

        expect(mockLikeyPost).toHaveBeenCalledTimes(1);
    });
});

// Шаг «Программы»: стор подменяем плоским моком — тестируем только то, что
// показывает шаблон в каждом состоянии загрузки.
const mountStep = (stateOverrides = {}) => {
    const $store = {
        state: {
            programs: [],
            programsLoading: false,
            programsLoadError: false,
            ...stateOverrides,
        },
        getters: {getSelectedPrograms: []},
        dispatch: vi.fn(),
        commit: vi.fn(),
    };
    const wrapper = shallowMount(ProgramsStep, {
        mocks: {$store, $modal: {show: vi.fn()}},
    });
    return {wrapper, $store};
};

describe('programs.vue — состояния загрузки списка программ', () => {
    it('запрашивает список программ при создании шага', () => {
        const {$store} = mountStep();

        expect($store.dispatch).toHaveBeenCalledWith('loadPrograms');
    });

    it('во время загрузки показывает индикатор и прячет кнопку добавления', () => {
        const {wrapper} = mountStep({programsLoading: true});

        expect(wrapper.text()).toContain('Загружаем список программ');
        expect(wrapper.find('.programs-load-error').exists()).toBe(false);
        expect(wrapper.find('.btn.btn-default').exists()).toBe(false);
    });

    it('при ошибке показывает сообщение и кнопку «Повторить»', () => {
        const {wrapper} = mountStep({programsLoadError: true});

        const error = wrapper.find('.programs-load-error');
        expect(error.exists()).toBe(true);
        expect(error.text()).toContain('Не удалось загрузить список программ');
        expect(wrapper.find('.programs-load-error .btn').exists()).toBe(true);
    });

    it('кнопка «Повторить» заново запрашивает список программ', async () => {
        const {wrapper, $store} = mountStep({programsLoadError: true});
        $store.dispatch.mockClear();

        await wrapper.find('.programs-load-error .btn').trigger('click');

        expect($store.dispatch).toHaveBeenCalledWith('loadPrograms');
    });

    it('в обычном состоянии показывает кнопку «Добавить программу» без ошибки', () => {
        const {wrapper} = mountStep();

        expect(wrapper.find('.programs-load-error').exists()).toBe(false);
        expect(wrapper.find('.btn.btn-default').text()).toBe('Добавить программу');
    });
});
