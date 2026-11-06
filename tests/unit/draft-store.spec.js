import {beforeEach, describe, expect, it, vi} from 'vitest';

// store.js — синглтон, гидрация из черновика происходит в момент импорта,
// поэтому каждый тест импортирует свежий модуль (vi.resetModules) на чистом
// sessionStorage. api.js в стенде замокан (dev-stand/init.mjs, pretest:unit).
const KEY = 'site_form_draft_v1';

const importStore = () => import('../../js/vue/registration-course/plugins/store');
const importDraft = () => import('../../js/vue/registration-course/plugins/draft');

describe('store — черновик заявки', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.resetModules();
    });

    it('при создании поднимает form из черновика', async () => {
        sessionStorage.setItem(KEY, JSON.stringify({
            store: {
                form: {
                    contact: {phone: '+7 (999)-123-45-67', email: 'ivanov@example.com'},
                    payment: {type: 'legal', inn: '2311128737'},
                    bank: {name_short: 'ПАО Тестбанк'},
                },
                knownListeners: [{snils: '92703662611', surname: 'Иванов'}],
                canSubmitAsDecline: false,
            },
        }));

        const {default: store} = await importStore();

        expect(store.state.form.contact.phone).toBe('+7 (999)-123-45-67');
        expect(store.state.form.payment.type).toBe('legal');
        expect(store.state.form.bank.name_short).toBe('ПАО Тестбанк');
        expect(store.state.knownListeners).toHaveLength(1);
    });

    it('без черновика стартует с пустой формой', async () => {
        const {default: store} = await importStore();

        expect(store.state.form.contact).toEqual({});
        expect(store.state.form.payment.type).toBeNull();
        expect(store.state.knownListeners).toEqual([]);
    });

    it('каждый коммит обновляет снапшот стора в черновике', async () => {
        const {default: store} = await importStore();
        const {flushDraft} = await importDraft();

        store.commit('saveDataFormForStep', {contact: {phone: '+7 (999)-123-45-67'}});
        flushDraft();

        const draft = JSON.parse(sessionStorage.getItem(KEY));
        expect(draft.store.form.contact.phone).toBe('+7 (999)-123-45-67');
    });

    it('restoreProgramSelection накатывает выбор и слушателей по id поверх списка из 1С', async () => {
        const {default: store} = await importStore();

        store.commit('storePrograms', [
            {id: 'p1', name: 'Охрана труда'},
            {id: 'p2', name: 'Пожарный минимум'},
        ]);
        store.commit('restoreProgramSelection', [
            {id: 'p2', listeners: [{snils: '92703662611', surname: 'Иванов'}]},
            {id: 'removed-program', listeners: []},
        ]);

        const p1 = store.state.programs.find((p) => p.id === 'p1');
        const p2 = store.state.programs.find((p) => p.id === 'p2');
        expect(p1.selected).toBeFalsy();
        expect(p2.selected).toBe(true);
        expect(p2.listeners).toHaveLength(1);
        // Программа, исчезнувшая из ответа 1С, не воскресает.
        expect(store.state.programs).toHaveLength(2);
    });

    it('выбор программы пишется в секцию programSelection черновика', async () => {
        const {default: store} = await importStore();
        const {flushDraft} = await importDraft();

        store.commit('storePrograms', [{id: 'p1', name: 'Охрана труда'}]);
        store.commit('selectProgramForUser', {id: 'p1', name: 'Охрана труда'});
        flushDraft();

        const draft = JSON.parse(sessionStorage.getItem(KEY));
        expect(draft.programSelection.items).toEqual([{id: 'p1', listeners: []}]);
    });

    // Регресс: при перезагрузке страницы стартовые коммиты (например,
    // setCanSubmitAsDecline из шага контактов) затирали сохранённый выбор
    // программ пустым состоянием ещё до того, как loadPrograms успевал его
    // восстановить, — после перезагрузки программы «отваливались».
    it('коммиты до загрузки списка программ не затирают сохранённый выбор', async () => {
        sessionStorage.setItem(KEY, JSON.stringify({
            programSelection: {items: [{id: 'p1', listeners: [{snils: '92703662611'}]}]},
        }));

        const {default: store} = await importStore();
        const {flushDraft} = await importDraft();

        store.commit('setCanSubmitAsDecline', true);
        store.commit('saveDataFormForStep', {contact: {phone: '+7 (999)-123-45-67'}});
        flushDraft();

        const draft = JSON.parse(sessionStorage.getItem(KEY));
        expect(draft.programSelection.items).toHaveLength(1);
    });

    it('loadPrograms восстанавливает выбор из черновика поверх свежего списка из 1С', async () => {
        sessionStorage.setItem(KEY, JSON.stringify({
            programSelection: {items: [{id: 'p1', listeners: [{snils: '92703662611'}]}]},
        }));
        vi.doMock('../../js/vue/registration-course/plugins/api', () => ({
            api: {
                likey: {
                    post: vi.fn(async () => ({
                        data: {data: [{id: 'p1', name: 'Охрана труда', hours: 40, prefix: 'prog-01'}]},
                    })),
                },
            },
        }));

        const {default: store} = await importStore();
        await store.dispatch('loadPrograms');

        const p1 = store.state.programs.find((p) => p.id === 'p1');
        expect(p1.selected).toBe(true);
        expect(p1.listeners).toHaveLength(1);

        // Черновик при этом не потёрся и содержит тот же выбор.
        const {loadDraftSection} = await importDraft();
        expect(loadDraftSection('programSelection').items).toHaveLength(1);

        vi.doUnmock('../../js/vue/registration-course/plugins/api');
    });
});
