import store from "./../plugins/store";
import ListenerModel from "../model/ListenerModel";

export default class ProgramService {

    static addListenerInProgram(program, listenerModel){
        program.listeners = program.listeners || [];
        program.listeners.push(listenerModel.toStore());
        this.updateProgram(program);

    }

    static updateListenerBySnilsInAllPrograms(snils, listenerModel){
      this.getSelectedProgram().forEach((program) => {
          program.listeners = program.listeners?.map((listener) => {
                if(listener.snils === snils){
                    return listenerModel;
                }
                return listener;
            });
          this.updateProgram(program);
        })

    }

    static removeListenerWithProgram(program, listenerModel){
        program.listeners = program?.listeners?.filter((listener) => {
            return listener.snils !== listenerModel.snils;
        });
        this.updateProgram('updateProgram', program);
    }

    static selectProgram(programModel){
        programModel.selected = true;
        this.updateProgram(programModel);

        if(store.state.form.payment.type === 'physical'){
            const listener = ListenerModel.fromObject({...store.state.form.contact, ...store.state.form.payment});
            if(!programModel.listeners?.some((item) => item.snils === listener.snils)){
                this.addListenerInProgram(programModel, listener);
            }
        }

        return programModel;
    }

    static unSelectProgram(programModel){
        programModel.selected = false;
        return this.updateProgram(programModel);
    }

    static getSelectedProgram(){
        return store.getters.getSelectedPrograms || [];
    }

    static updateProgram(program){
        store.commit('updateProgram', program);
        return program;
    }
}