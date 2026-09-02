import programService from './ProgramService';
import store from './../plugins/store';
import ListenerModel from './../model/ListenerModel';

export default class ListenerService {
    static getUniqBySnilsListeners () {
        const listeners = [];

        // Физлицо-плательщик должно оставаться доступным для выбора слушателем,
        // даже если его удалили из всех программ — иначе после удаления форма
        // заставляет вводить те же данные заново вместо выбора уже известного человека.
        if(store.state.form.payment.type === 'physical' && store.state.form.payment.snils){
            listeners.push(ListenerModel.fromObject({...store.state.form.contact, ...store.state.form.payment}));
        }

        programService.getSelectedProgram().forEach((program) => {
            program?.listeners?.forEach(listener => {
                if(!listeners.some(item => item.snils === listener.snils))
                    listeners.push(listener);
            })
        });
        return listeners;

    }

    static hasListenerInProgram(program, listener){
       return program?.listeners?.some(item => item.snils === listener.snils)
    }
}