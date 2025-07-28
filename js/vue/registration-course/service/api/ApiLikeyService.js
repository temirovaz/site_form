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
        
        // Обработка поля basis для 1С
        if(dataForm.payment?.basis !== undefined){
            dataForm.payment.footing = dataForm.payment.basis;
            delete dataForm.payment.basis;
        }
        
        // Маппинг полей адресов для 1С
        if(dataForm.payment) {
            // Маппинг фактического адреса
            if(dataForm.payment.actual_address) {
                dataForm.payment.postal_address = dataForm.payment.actual_address;
                delete dataForm.payment.actual_address;
            }
            
            // Маппинг почтового индекса
            if(dataForm.payment.postal_code) {
                dataForm.payment.postal_index = dataForm.payment.postal_code;
                delete dataForm.payment.postal_code;
            }
            
            // Маппинг юридического адреса
            if(dataForm.payment.address_value) {
                dataForm.payment.legal_address = dataForm.payment.address_value;
                // Не удаляем address_value, так как он может использоваться в других местах
            }
        }
        
       return api.likey.post('/CreateData/3_00', {
            type : 'application',
            algorithm: 2,
            programs: programs,
            data: dataForm
        })
    }

    static async getListenerBySnilsFrom1C(snils){
        return api.likey.post('/GetData/3_00',{'document' : snils.trim(), 'type' : 'student'});
    }
}