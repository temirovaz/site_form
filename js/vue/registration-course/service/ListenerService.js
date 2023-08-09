import programService from './ProgramService';

export default class ListenerService {
    static getUniqBySnilsListeners () {
        const listeners = [];
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