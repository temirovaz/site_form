import Vue from 'vue'
import Vuex from 'vuex'
import { getField, updateField } from 'vuex-map-fields';
import {api} from './api';

Vue.use(Vuex);



const store_TEST = new Vuex.Store({
   /*state: {
        programs: [],
        form: {
            "contact": {
            },
            "payment": {
                "type": null,
            },
            "bank": {}
        },
    },*/
    state: {
        form: {
            "contact":{
                "email":"13123213@gmail.com",
                "phone":"+7(213)132-12-313"
            },
            /*  "payment":{
                  "type":"physical",
                  "snils": "10288136338",
                  "surname":"Те****",
                  "name":"Те****",
                  "patronymic":"Те****",
                  "passport_series":"2**8",
                  "passport_number":"12**56",
                  "passport_date_of_issue":"05.**.201* 0:00:00",
                  "passport_division":"1**-*05",
                  "passport_issued":"МП **** РОССИИ **** РЕСП. **** В **** РАЙОНЕ",
                  "passport_place_of_birth":"Нижегородская **** Городецкий **** деревня **** (Смольковский **** снт ****",
                  "registration":"Нижегородская обл, Городецкий р-н, деревня Архипиха (Смольковский с/с), снт Подвалье",
                  "post":"Адрес",
                  "id":"000024641"
              },*/
            "payment": {
                "type":"legal",
                "inn":"2311128737",
                "kpp":"231101001",
                "name_short":"Q-ТРИТ",
                "name_full_with_opf":"ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ \"КУТРИТ\"",
                "management_name":"Манухин Игорь Леонидович",
                "management_post":"ДИРЕКТОР"
            },
            /*  "payment":{
                 "type":"ip",
                     "inn":"772674397984",
                     "name_short":"ИП Абдальджавад Анас Г.Ф",
                     "name_full_with_opf":"Индивидуальный предприниматель Абдальджавад Анас Г.Ф",
                     "management_name":"Абдальджавад Анас Г.Ф",
                     "management_post":"Директор"
             },*/
            "bank":{
                "name_short":"«Нацинвестпромбанк» (АО)",
                "bic":"044525413",
                "correspondent_account":"30101810745250000413",
                "address_value":"г Москва, 2-й Неопалимовский пер, д 10",
                "account":"wefwefw"
            }
        },
        programs: [
            {
                "id": "000001016",
                "name": "Применение системы защиты Secret Net Studio. Расширенный курс",
                "hours": 24,
                "prefix": "ОПП-СЗИ-02",
                "listeners": [
                    {
                        "date_of_birth": "06.**.200*",
                        "email": "32423@gmail.com",
                        "name": "Те****",
                        "patronymic": "Те****",
                        "phone": "+7 (222)-222-22-22",
                        "post": "Администратор",
                        "snils": "10288136338",
                        "surname": "Те****",
                        "selected": true,
                        "isLoadedDataFrom1C": true,
                    }
                ],
                "selected": true
            },
            {
                "id": "000001018",
                "name": "Отчеты, инциденты, их анализ и порядок реагирования в Secret Net Studio",
                "hours": 8,
                "prefix": "ОПП-СЗИ-04",
                "listeners": [
                    {
                        "date_of_birth": "06.**.200*",
                        "email": "32423@gmail.com",
                        "name": "Те****",
                        "patronymic": "Те****",
                        "phone": "+7 (222)-222-22-22",
                        "post": "Администратор",
                        "snils": "10288136338",
                        "surname": "Те****",
                        "isLoadedDataFrom1C": true,
                    }
                ],
                "selected": true
            },
            {
                "id": "0000010182",
                "name": "2Отчеты, инциденты, их анализ и порядок реагирования в Secret Net Studio",
                "hours": 8,
                "prefix": "2ОПП-СЗИ-04",
                "selected": false
            }
        ]
    },
    actions: {
        loadPrograms(){
            return api.likey.post('/GetData/3_00',{'type' : 'programs'},{headers : {}}).then(
                (response) => {
                 //   store.commit('storePrograms', response.data.data);
                }
            );
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

            payload.program.listeners = payload.program.listeners.filter((listener, index) => {
                return payload.listener.snils !== listener.snils;
            });

            this.commit('updateProgram', payload);
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
    },
})


export default store_TEST;

