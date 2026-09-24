import store from "../../plugins/store";
import {api} from "../../plugins/api";
import programService from '../ProgramService';
import ListenerModel from "../../model/ListenerModel";

// Заглушки для заявки-отказа: 1С не принимает заявку с пустыми телефоном и
// почтой, а человек в этом режиме оставляет только один контакт из двух.
// Значения намеренно нерабочие и заметные — менеджер должен видеть, что это
// не контакт клиента (настоящий указан в соседнем поле и в комментарии).
const PHONE_PLACEHOLDER = '+70000000000';
const EMAIL_PLACEHOLDER = 'noreply@likey.su';

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
    // То же касается блока contact: заявка с одним только телефоном падала на
    // живой 1С («Не удалось отправить заявку» в интерфейсе), потому что почта
    // уходила пустой строкой — заглушки стояли лишь у организации. Теперь оба
    // поля закрыты в обоих блоках, а какой контакт настоящий, видно из
    // комментария.
    //
    // Наименование дублируется двумя наборами имён полей: full_name/
    // abbreviated_name из API 3.0.docx и name_short/name_full_with_opf, которыми
    // пользуется обычный путь формы. Докс и рабочий поток здесь расходятся, а
    // заявка-отказ теперь создаётся с 200 при любом из них — если наименование
    // не долетит, это не всплывёт ошибкой, только сверкой карточки в 1С руками.
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
        const organizationName = 'Клиент с сайта без данных';
        // Фиксированный текст заказчика: по нему менеджер в 1С отличает заявку,
        // которую клиент не стал заполнять, от обычной. Комментарий самого
        // человека дописывается после него, а не вместо.
        const declineComment = 'Заявка создана на сайте. Клиент отказался заполнять данные.';
        const userComment = form.comment?.trim();

        // При отказе человек оставляет телефон ИЛИ почту, а 1С требует оба поля
        // заполненными и отвергает заявку целиком. Недостающее закрываем теми же
        // заглушками, что и у организации.
        const phone = form.contact?.phone?.trim();
        const email = form.contact?.email?.trim();
        const contactPhone = phone || PHONE_PLACEHOLDER;
        const contactEmail = email || EMAIL_PLACEHOLDER;
        // Менеджеру важно не перепутать заглушку с настоящим контактом: писать на
        // noreply@likey.su бессмысленно, а звонить на +7 000... некуда. Пометка
        // прямо называет заглушку и идёт перед текстом клиента: в хвосте длинного
        // комментария она терялась и читалась как продолжение фразы клиента.
        // Случай «нет ни одного контакта» через интерфейс недостижим
        // (isDeclineSubmit в contacts.vue), но и врать про канал связи в нём
        // нельзя: заглушки там обе.
        let channelNote = '';
        if (phone && !email) {
            channelNote = 'Связь только по телефону — почта в заявке заглушка.';
        } else if (email && !phone) {
            channelNote = 'Связь только по эл. почте — телефон в заявке заглушка.';
        } else if (!phone && !email) {
            channelNote = 'Клиент не оставил ни телефона, ни почты — оба контакта в заявке заглушки.';
        }

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
                    // Телефон и почту человека сюда намеренно не кладём:
                    // абитуриент у всех отказов один и тот же, а СНИЛС для 1С —
                    // ключ поиска студента (см. getListenerBySnilsFrom1C), так
                    // что контакты разных людей перезаписывали бы друг друга на
                    // одной фиктивной карточке. Реальные контакты уходят в
                    // data.contact и в организацию.
                    post: '',
                }]
            }],
            data: {
                contact: {...form.contact, phone: contactPhone, email: contactEmail},
                payment: {
                    type: 'legal',
                    organization_type: 1,
                    inn: '2311128737',
                    kpp: '231101001',
                    full_name: organizationName,
                    abbreviated_name: organizationName,
                    // Те же имена полей, что шлёт обычный путь формы
                    // (см. payment-form/legal-form.vue): какой из двух наборов
                    // читает 1С на algorithm: 2 — неизвестно, а заявка теперь
                    // создаётся с 200 в любом случае, и потерянное наименование
                    // молча стоило бы менеджеру признака «данные не введены».
                    name_short: organizationName,
                    name_full_with_opf: organizationName,
                    telephone: contactPhone,
                    email: contactEmail,
                },
                bank: {},
                // Системные куски рядом, текст клиента отделён и подписан —
                // иначе он читается как продолжение системной фразы.
                // filter(Boolean) убирает лишние пробелы, когда пометки или
                // комментария клиента нет.
                comment: [
                    declineComment,
                    channelNote,
                    userComment ? `Комментарий клиента: ${userComment}` : '',
                ].filter(Boolean).join(' '),
            }
        })
    }

    static async getListenerBySnilsFrom1C(snils){
        return api.likey.post('/GetData/3_00',{'document' : snils.trim(), 'type' : 'student'});
    }
}