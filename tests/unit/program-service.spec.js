import {beforeEach, describe, expect, it, vi} from 'vitest';

// store.js импортирует plugins/api (реальные креды 1С, файл вне git, читать нельзя) и,
// отдельно, неиспользуемо — components/wizard/steps/programs.vue (мёртвый импорт).
// Подменяем оба, чтобы гонять настоящий store без реальных кредов и без разворачивания
// тяжёлого дерева .vue-компонента ради одного неиспользуемого импорта.
vi.mock('../../js/vue/registration-course/plugins/api', () => ({
    api: {likey: {post: vi.fn()}, dadata: {post: vi.fn()}},
}));
vi.mock('../../js/vue/registration-course/components/wizard/steps/programs', () => ({default: {}}));

const {default: store} = await import('../../js/vue/registration-course/plugins/store');
const {default: ProgramService} = await import('../../js/vue/registration-course/service/ProgramService');

describe('ProgramService.removeListenerWithProgram', () => {
    beforeEach(() => {
        store.state.programs = [];
        store.state.knownListeners = [];
    });

    it('коммитит в store.commit("updateProgram", ...) объект программы с корректным id, а не строку "updateProgram"', () => {
        const original = {
            id: 42,
            selected: true,
            listeners: [
                {snils: '92703662611'},
                {snils: '11111111111'},
            ],
        };
        store.commit('storePrograms', [original]);

        // Копия объекта программы — как в реальном потоке (программа приходит из
        // props/getSelectedProgram(), а не всегда та же ссылка, что лежит в state).
        // Если removeListenerWithProgram вызовет updateProgram с неверным payload
        // (это и была регрессия: this.updateProgram('updateProgram', program) —
        // store.commit получал строку 'updateProgram', её .id === undefined, и
        // мутация становилась no-op), state.programs останется прежним объектом.
        const programCopy = {...original, listeners: [...original.listeners]};
        const listenerToRemove = {snils: '92703662611'};

        ProgramService.removeListenerWithProgram(programCopy, listenerToRemove);

        const updated = store.state.programs.find((program) => program.id === 42);

        // Регрессия: без фикса here был бы найден исходный `original`
        // (со всеми слушателями), а не programCopy с уже удалённым слушателем.
        expect(updated).toBe(programCopy);
        expect(updated.listeners).toHaveLength(1);
        expect(updated.listeners.some((listener) => listener.snils === '92703662611')).toBe(false);
    });

    it('не трогает слушателей других программ', () => {
        const target = {id: 1, listeners: [{snils: 'aaa'}, {snils: 'bbb'}]};
        const other = {id: 2, listeners: [{snils: 'aaa'}]};
        store.commit('storePrograms', [target, other]);

        const targetCopy = {...target, listeners: [...target.listeners]};
        ProgramService.removeListenerWithProgram(targetCopy, {snils: 'aaa'});

        const untouched = store.state.programs.find((program) => program.id === 2);
        expect(untouched).toBe(other);
        expect(untouched.listeners).toHaveLength(1);
    });
});
