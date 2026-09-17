import Vue from 'vue'
import Vuex from 'vuex'
import { getField, updateField } from 'vuex-map-fields';
import {api} from './api';
import programs from "../components/wizard/steps/programs";

Vue.use(Vuex);

import ProgramModel from "../model/ProgramModel";

const store = new Vuex.Store({
    state: {
        programs: [],
        // Слушатели, добавленные хотя бы раз за эту сессию заполнения заявки —
        // не зависит от того, в какой программе они сейчас числятся. Нужно, чтобы
        // после удаления слушателя из всех программ его можно было выбрать снова
        // через «Добавить слушателя», а не вводить те же данные заново.
        knownListeners: [],
        form: {
            "contact": {
            },
            "payment": {
                "type": null,
            },
            "bank": {}
        },
    },
    actions: {
        loadPrograms(context){
            if(!context.state.programs.length){
                return api.likey.post('/GetData/3_00',{'type' : 'programs'},{headers : {}}).then(
                    (response) => {
                        const programs = [];
                        [...response.data.data].forEach((program) => {
                            ProgramModel.fromObject(program)
                            programs.push(ProgramModel.fromObject(program))
                        })
                        store.commit('storePrograms', programs);
                    }
                );
            }
        },
    },
    mutations: {
        saveDataFormForStep(state, payload){
            state.form = {...state.form, ...payload}
        },
        storePrograms (state, payload){
            state.programs = payload;
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


export default store;

