import store from "../../plugins/store";
import {api} from "../../plugins/api";
import programService from '../ProgramService';
import ListenerModel from "../../model/ListenerModel";

export default class ApiLikeyService {

    static async sendFormForSaveTo1C(){
        let programs = programService.getSelectedProgram();

        programs = programs.map((program) => {
            program.listeners = program.listeners?.map((listener) => {
                listener.id = Math.floor(Math.random()*0xffffffff);
                return listener;
            });
             return program;
        });
        let dataForm = store.state.form
        if(dataForm.payment?.basis !== undefined){
            dataForm.payment.footing = dataForm.payment.basis;
            delete  dataForm.payment.basis
        }
        
       return api.likey.post('/CreateData/3_00', {
            type : 'application',
            algorithm: 2,
            programs: programs,
            data: store.state.form
        })
    }

    static async getListenerBySnilsFrom1C(snils){
        return api.likey.post('/GetData/3_00',{'document' : snils.trim(), 'type' : 'student'});
    }
}