import {beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';

// Модуль черновика держит кеш в замыкании, поэтому каждый тест работает со
// «свежим» модулем (vi.resetModules), а sessionStorage чистим вручную.
const KEY = 'site_form_draft_v1';

const importDraft = () => import('../../js/vue/registration-course/plugins/draft');

describe('plugins/draft.js — черновик заявки', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.resetModules();
    });

    it('сохраняет секцию и возвращает её после «перезагрузки» (новый инстанс модуля)', async () => {
        const draft = await importDraft();
        draft.saveDraftSection('contacts', {phone: '+7 (999)-123-45-67', email: 'ivanov@example.com'});
        draft.flushDraft();

        vi.resetModules();
        const draftAfterReload = await importDraft();
        expect(draftAfterReload.loadDraftSection('contacts'))
            .toEqual({phone: '+7 (999)-123-45-67', email: 'ivanov@example.com'});
    });

    it('секции независимы: запись одной не затирает другую', async () => {
        const draft = await importDraft();
        draft.saveDraftSection('contacts', {phone: '123'});
        draft.saveDraftSection('bank', {fields: []});
        draft.flushDraft();

        expect(draft.loadDraftSection('contacts')).toEqual({phone: '123'});
        expect(draft.loadDraftSection('bank')).toEqual({fields: []});
    });

    it('clearDraft удаляет черновик из sessionStorage и из кеша', async () => {
        const draft = await importDraft();
        draft.saveDraftSection('contacts', {phone: '123'});
        draft.flushDraft();

        draft.clearDraft();

        expect(sessionStorage.getItem(KEY)).toBeNull();
        expect(draft.loadDraftSection('contacts')).toBeUndefined();
    });

    it('запись отложенная: до flushDraft в sessionStorage пусто', async () => {
        const draft = await importDraft();
        draft.saveDraftSection('contacts', {phone: '123'});

        expect(sessionStorage.getItem(KEY)).toBeNull();

        draft.flushDraft();
        expect(sessionStorage.getItem(KEY)).not.toBeNull();
    });

    it('молча деградирует, если sessionStorage кидает исключение (приватный режим, квота)', async () => {
        const draft = await importDraft();
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });

        expect(() => {
            draft.saveDraftSection('contacts', {phone: '123'});
            draft.flushDraft();
        }).not.toThrow();
    });

    it('битый JSON под ключом черновика не роняет форму', async () => {
        sessionStorage.setItem(KEY, '{битый json');

        const draft = await importDraft();
        expect(draft.loadDraftSection('contacts')).toBeUndefined();
        expect(() => {
            draft.saveDraftSection('contacts', {phone: '123'});
            draft.flushDraft();
        }).not.toThrow();
    });

    // Регресс: после успешной отправки заявки коммиты при размонтировании шагов
    // (deactivated у contacts.vue) создавали черновик заново — после перезагрузки
    // форма открывалась с данными уже отправленной заявки.
    it('disableDraft очищает черновик и выключает запись до конца сессии страницы', async () => {
        const draft = await importDraft();
        draft.saveDraftSection('contacts', {phone: '123'});
        draft.flushDraft();

        draft.disableDraft();
        draft.saveDraftSection('contacts', {phone: '456'});
        draft.flushDraft();

        expect(sessionStorage.getItem(KEY)).toBeNull();
        expect(draft.loadDraftSection('contacts')).toBeUndefined();
    });
});

describe('draftMixin — восстановление полей шага', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.resetModules();
    });

    const buildComponent = (draftMixin, section) => ({
        mixins: [draftMixin(section, ['fields', 'comment'])],
        data() {
            return {
                fields: [
                    {name: 'inn', label: 'ИНН', rules: 'required|inn', value: ''},
                    {name: 'kpp', label: 'КПП', rules: 'required', value: ''},
                ],
                comment: '',
            };
        },
        render: (h) => h('div'),
    });

    it('восстанавливает value полей по имени, не трогая label/rules', async () => {
        const draft = await importDraft();
        draft.saveDraftSection('step', {
            fields: [{name: 'inn', value: '2311128737'}],
            comment: 'позвонить после 18:00',
        });
        draft.flushDraft();

        const wrapper = mount(buildComponent(draft.draftMixin, 'step'));

        expect(wrapper.vm.fields[0].value).toBe('2311128737');
        expect(wrapper.vm.fields[0].label).toBe('ИНН');
        expect(wrapper.vm.fields[0].rules).toBe('required|inn');
        // Поля, которых нет в черновике, остаются пустыми.
        expect(wrapper.vm.fields[1].value).toBe('');
        expect(wrapper.vm.comment).toBe('позвонить после 18:00');
    });

    it('сохраняет изменения полей в черновик', async () => {
        const draft = await importDraft();
        const wrapper = mount(buildComponent(draft.draftMixin, 'step'));

        wrapper.vm.comment = 'новый комментарий';
        wrapper.vm.fields[0].value = '2311128737';
        await wrapper.vm.$nextTick();

        const saved = draft.loadDraftSection('step');
        expect(saved.comment).toBe('новый комментарий');
        // Массив полей сохраняется в компактном виде: только name/value/filledFrom1C.
        expect(saved.fields).toEqual([
            {name: 'inn', value: '2311128737', filledFrom1C: undefined},
            {name: 'kpp', value: '', filledFrom1C: undefined},
        ]);
    });

    it('без сохранённой секции оставляет значения по умолчанию', async () => {
        const draft = await importDraft();
        const wrapper = mount(buildComponent(draft.draftMixin, 'step'));

        expect(wrapper.vm.fields[0].value).toBe('');
        expect(wrapper.vm.comment).toBe('');
    });
});
