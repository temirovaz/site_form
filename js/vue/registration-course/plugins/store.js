import Vue from 'vue'
import Vuex from 'vuex'
import { getField, updateField } from 'vuex-map-fields';
import {api} from './api';
import {loadDraftSection, saveDraftSection} from './draft';
import programs from "../components/wizard/steps/programs";

Vue.use(Vuex);

import ProgramModel from "../model/ProgramModel";

// Черновик заявки из sessionStorage (см. plugins/draft.js): при перезагрузке
// страницы форма должна вернуться в то состояние, в котором её оставили.
const draftStore = loadDraftSection('store') || {};

const store = new Vuex.Store({
    state: {
        programs: [],
        // Список программ загружен из 1С в этой сессии. До этого момента subscribe
        // НЕ перезаписывает секцию programSelection черновика: иначе стартовые
        // коммиты (например, setCanSubmitAsDecline из шага контактов) затирали бы
        // сохранённый выбор пустым состоянием ещё до того, как loadPrograms
        // успел его восстановить. Не персистится — это состояние сессии.
        programsLoaded: false,
        // Признаки загрузки списка программ: нужны, чтобы шаг «Программы» мог
        // показать состояние загрузки и ошибку с кнопкой «Повторить», а не
        // пустой экран, если запрос к сайту не удался.
        programsLoading: false,
        programsLoadError: false,
        // Слушатели, добавленные хотя бы раз за эту сессию заполнения заявки —
        // не зависит от того, в какой программе они сейчас числятся. Нужно, чтобы
        // после удаления слушателя из всех программ его можно было выбрать снова
        // через «Добавить слушателя», а не вводить те же данные заново.
        knownListeners: draftStore.knownListeners || [],
        // Человек отказался заполнять заявку сам И оставил контакт — то есть
        // заявку уже можно отправить прямо с первого шага. Лежит вне form: это
        // состояние интерфейса (каким показать футер мастера и какой payload
        // собрать), а не поле заявки для 1С.
        canSubmitAsDecline: draftStore.canSubmitAsDecline || false,
        form: {
            "contact": {},
            "payment": {
                "type": null,
            },
            "bank": {},
            ...(draftStore.form || {}),
        },
    },
    actions: {
        loadPrograms(context){
            if(!context.state.programs.length){
                // Выбор из черновика читаем ДО коммита storePrograms: после него
                // subscribe считает список загруженным и перезапишет секцию
                // programSelection свежим (ещё пустым) состоянием.
                const selection = loadDraftSection('programSelection');
                context.commit('setProgramsLoading', true);
                context.commit('setProgramsLoadError', false);
                return api.likey.post('/GetData/3_00',{'type' : 'programs'},{headers : {}}).then(
                    (response) => {
                        const programs = [];
                        [...response.data.data].forEach((program) => {
                            ProgramModel.fromObject(program)
                            programs.push(ProgramModel.fromObject(program))
                        })
                        store.commit('storePrograms', programs);
                        store.commit('setProgramsLoading', false);
                        // Выбор программ и слушателей из черновика накатываем только
                        // после загрузки свежего списка из 1С, а не из кеша — иначе
                        // показали бы устаревшие программы.
                        if(selection?.items?.length){
                            store.commit('restoreProgramSelection', selection.items);
                        }
                    }
                ).catch(() => {
                    store.commit('setProgramsLoadError', true);
                    store.commit('setProgramsLoading', false);
                });
            }
        },
    },
    mutations: {
        saveDataFormForStep(state, payload){
            state.form = {...state.form, ...payload}
        },
        storePrograms (state, payload){
            state.programs = payload;
            state.programsLoaded = true;
        },
        // Выбор программ и их слушатели из черновика (sessionStorage) накатывается
        // поверх свежего списка из 1С по id. Программа, которой уже нет в ответе
        // 1С (снята с набора, переименована с новым id), молча пропускается.
        restoreProgramSelection(state, items){
            const savedById = new Map(items.map((item) => [item.id, item]));
            state.programs = state.programs.map((program) => {
                const saved = savedById.get(program.id);
                return saved
                    ? {...program, selected: true, listeners: saved.listeners || []}
                    : program;
            });
        },
        setProgramsLoading(state, value){
            state.programsLoading = value;
        },
        setProgramsLoadError(state, value){
            state.programsLoadError = value;
        },
        setCanSubmitAsDecline(state, value){
            state.canSubmitAsDecline = value;
        },
        // Комментарий из режима отказа не должен пережить снятие галочки: иначе
        // после неудачной отправки человек снимает галочку, идёт обычным путём, а
        // старый текст незаметно уезжает в 1С (saveCommentInSummaryStep не
        // перезаписывает комментарий пустой строкой).
        clearComment(state){
            const {comment, ...rest} = state.form;
            state.form = rest;
        },
        updateProgram(state, program){
            state.programs = state.programs.map((item) => {
                return item.id === program.id ? program : item;
            })
        },
        updateFormData(state, formData){
            state.form = formData;
        },
        selectProgramForUser(state, program){

            this.commit('updateProgram', {...program, ...{selected: true}});
            if(state.form.payment.type === 'physical'){
                this.commit('addListenerInProgram', {program: program, listener: {...state.form.payment }});
            }
        },
        unSelectedProgramForUser(state, program){
            this.commit('updateProgram', {...program, selected: false, listeners: []});
        },
        removeListenerFromProgram(state, payload){
            if(payload.program?.listeners){
                payload.program.listeners = payload.program?.listeners.filter((listener, index) => {
                    return payload.listener.snils !== listener.snils;
                });
                this.commit('updateProgram', payload);
            }

        },
        registerKnownListener(state, listener){
            const index = state.knownListeners.findIndex((item) => item.snils === listener.snils);
            if(index === -1){
                // Ограничение на случай очень длинной сессии с большим числом разных
                // слушателей — вытесняем самого старого, чтобы список не рос бесконечно.
                if(state.knownListeners.length >= 100){
                    state.knownListeners.shift();
                }
                state.knownListeners.push(listener);
            }else{
                state.knownListeners.splice(index, 1, listener);
            }
        },
        addListenerInProgram(state, payload){

            const program = payload.program;
            const listener = payload.listener;

            if(!listener.hasOwnProperty('id')){
                listener.id = Date.now();
            }

            state.programs = state.programs.map((item) => {
                if(item.id === program.id){
                    if(!item.hasOwnProperty('listeners')){
                        item.listeners = [];
                    }
                    if(!item.listeners?.some((listenerSelected) => listenerSelected.snils === listener.snils))
                        item.listeners.push(listener)
                }
                return item;
            })
        },

    },
    getters: {
        getField,
        getSelectedPrograms: (state) => state.programs.filter((program) => program.selected),
        getFormData: (state) => state.form,
    },
})


// Каждый коммит обновляет черновик заявки в sessionStorage (запись отложенная,
// см. plugins/draft.js). Черновик очищается после успешной отправки заявки
// (wizard.vue → clearDraft).
store.subscribe((mutation, state) => {
    saveDraftSection('store', {
        form: state.form,
        knownListeners: state.knownListeners,
        canSubmitAsDecline: state.canSubmitAsDecline,
    });
    // Выбор программ перезаписываем только когда список программ в этой сессии
    // уже загружен из 1С — см. комментарий у programsLoaded в state.
    if(state.programsLoaded){
        saveDraftSection('programSelection', {
            items: state.programs
                .filter((program) => program.selected)
                .map((program) => ({id: program.id, listeners: program.listeners || []})),
        });
    }
});

export default store;

