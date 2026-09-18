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

    // Отправка заявки, которую человек не стал заполнять сам: на шаге контактов
    // он отметил «свяжитесь со мной и заполните её за меня». Намеренно шлём не
    // state.form, а собранную здесь заглушку — к этому моменту в сторе могут
    // лежать плательщик и программы, если человек успел уйти вперёд и вернуться.
    // Тогда заявка внешне не отличалась бы от обычной и менеджер не узнал бы,
    // что её нужно оформить за клиента.
    //
    // Пустые programs/payment пробовали как признак «нужно перезвонить», но 1С
    // (см. API 3.0.docx) требует applicants непустым, а у организации —
    // organization_type, inn, kpp, full_name, abbreviated_name, telephone и
    // email. На пустых значениях она отвечает 420 "Invalid input data"
    // («Отсутствуют абитуриенты» + organization_type «Значение не определено»)
    // и заявку не создаёт вообще. Поэтому обязательные поля закрыты заглушками,
    // а признаком «данные не введены» служат комментарий и наименование
    // организации «Клиент с сайта без данных», которые менеджер видит в 1С.
    //
    // organization_type кладём числом явно: в сторе type — строка
    // 'physical'/'legal'/'ip', а 1С ждёт число (1 — юрлицо, 2 — ИП). type
    // рядом оставлен 'legal', чтобы блок организации не противоречил сам себе:
    // ИНН и КПП — реквизиты юрлица.
    //
    // НЕ ПРОВЕРЕНО на живой 1С: program_name/program_prefix «Не указано» —
    // плейсхолдер, а не существующая в базе программа. Это осознанно выбранное
    // временное решение: если 1С ответит новой ошибкой валидации («программа не
    // найдена» и т.п.), плейсхолдер меняется по факту живого теста на
    // dev.likey.su. Там же проверяется, принимает ли 1С заглушки ИНН/КПП/СНИЛС.
    static async sendDeclineRequestTo1C(){
        const form = store.state.form;
        const placeholder = 'Не указано';
        // Фиксированный текст заказчика: по нему менеджер в 1С отличает заявку,
        // которую клиент не стал заполнять, от обычной. Комментарий самого
        // человека дописывается после него, а не вместо.
        const declineComment = 'Заявка создана на сайте. Клиент отказался заполнять данные.';
        const userComment = form.comment?.trim();

        return api.likey.post('/CreateData/3_00', {
            type : 'application',
            algorithm: 2,
            programs: [{
                id: '',
                name: placeholder,
                hours: '',
                prefix: placeholder,
                selected: true,
                listeners: [{
                    // id по API 3.0 в создании объекта не участвует — он нужен
                    // только чтобы 1С могла сослаться на строку в описании ошибок.
                    id: 'decline-applicant',
                    surname: 'Иванов',
                    name: 'Иван',
                    patronymic: 'Иванович',
                    fio: 'Иванов Иван Иванович',
                    snils: '92703662611',
                    phone: form.contact?.phone || '',
                    email: form.contact?.email || '',
                    post: '',
                }]
            }],
            data: {
                contact: {...form.contact},
                payment: {
                    type: 'legal',
                    organization_type: 1,
                    inn: '2311128737',
                    kpp: '231101001',
                    full_name: 'Клиент с сайта без данных',
                    abbreviated_name: 'Клиент с сайта без данных',
                    // При отказе достаточно одного контакта из двух, а 1С требует
                    // у организации оба — недостающее закрываем заглушкой.
                    telephone: form.contact?.phone || '+70000000000',
                    email: form.contact?.email || 'noreply@company.ru',
                },
                bank: {},
                comment: userComment ? `${declineComment} ${userComment}` : declineComment,
            }
        })
    }

    static async getListenerBySnilsFrom1C(snils){
        return api.likey.post('/GetData/3_00',{'document' : snils.trim(), 'type' : 'student'});
    }
}