import store from "./../plugins/store";

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
          console.log(program);
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
        return this.updateProgram(programModel);
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