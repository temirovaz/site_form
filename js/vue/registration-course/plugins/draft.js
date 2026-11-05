// Черновик заявки в sessionStorage: введённые данные не должны теряться при
// случайной перезагрузке страницы. Осознанно НЕ localStorage: черновик живёт,
// пока открыта вкладка, и умирает вместе с ней — персональные данные не
// задерживаются на устройстве после того, как человек закрыл страницу.
// Открытие формы в новой вкладке всегда начинается с чистого листа.
// До отправки заявки черновик можно сбросить вручную: удалить ключ
// site_form_draft_v1 в DevTools → Application → Session Storage и обновить
// страницу. После успешной отправки wizard.vue вызывает disableDraft().
//
// Хранилище одно на всю форму (ключ site_form_draft_v1), внутри — секции:
//   store            — снапшот Vuex (form, knownListeners, canSubmitAsDecline),
//                      пишется из store.subscribe (см. plugins/store.js);
//   programSelection — выбранные программы и их слушатели. Сами программы не
//                      кешируются: при открытии шага список заново грузится из
//                      1С, а выбор накатывается поверх него по id;
//   секции шагов     — локальные данные компонентов (contacts, paymentForm,
//                      payerLegal, payerIp, payerPhysical, bank, summary), которые
//                      могли ещё не доехать до стора: шаг, не подтверждённый
//                      кнопкой «Далее».
//
// Номер текущего шага НЕ сохраняется: после перезагрузки форма всегда
// открывается с первого шага (данные шагов восстановлены), а чекбоксы согласий
// не сохраняются вовсе — человек даёт их заново, проходя шаги по порядку.
// Иначе возврат на шаг 3+ с пустыми согласиями позволил бы отправить заявку,
// минуя проверку согласий (они проверяются только на своём шаге).
//
// sessionStorage может быть недоступен (приватный режим, квота) — все обращения
// молча деградируют: форма просто работает как раньше, без черновика.

const STORAGE_KEY = 'site_form_draft_v1';
const WRITE_DELAY = 300;

let cache = null;
let writeTimer = null;
// После успешной отправки заявки запись в черновик выключается — см. disableDraft.
let draftEnabled = true;

function storageAvailable() {
    try {
        return typeof sessionStorage !== 'undefined';
    } catch (e) {
        return false;
    }
}

function readCache() {
    if (cache) return cache;
    cache = {};
    if (storageAvailable()) {
        try {
            cache = JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
        } catch (e) {
            // Битый или чужой JSON под нашим ключом — начинаем с пустого черновика.
        }
    }
    return cache;
}

// Немедленная запись буфера. Вызывается из beforeunload (последние ~300 мс перед
// перезагрузкой иначе не попали бы в отложенную запись) и из тестов.
export function flushDraft() {
    clearTimeout(writeTimer);
    writeTimer = null;
    if (!draftEnabled || !storageAvailable()) return;
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(readCache()));
    } catch (e) {
        // Квота исчерпана — черновик не сохранился, форма работает дальше.
    }
}

export function saveDraftSection(name, data) {
    if (!draftEnabled) return;
    const all = readCache();
    all[name] = data;
    all.savedAt = Date.now();
    clearTimeout(writeTimer);
    writeTimer = setTimeout(flushDraft, WRITE_DELAY);
}

export function loadDraftSection(name) {
    return readCache()[name];
}

export function clearDraft() {
    clearTimeout(writeTimer);
    writeTimer = null;
    cache = {};
    if (storageAvailable()) {
        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            // См. комментарий в storageAvailable.
        }
    }
}

// После успешной отправки заявки (wizard.vue): черновик очищается и запись
// выключается до конца жизни страницы. Без выключения коммиты при
// размонтировании шагов (например, deactivated у contacts.vue) тут же создали
// бы черновик заново — и после перезагрузки форма открылась бы со старыми
// данными уже отправленной заявки.
export function disableDraft() {
    draftEnabled = false;
    clearDraft();
}

if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flushDraft);
}

// Миксин для шагов визарда: восстанавливает перечисленные поля data() из секции
// черновика при создании компонента и сохраняет их при каждом изменении.
// Массивы описаний полей ({name, value, ...} в формах плательщика и банка)
// целиком не подменяются — там лежат label/rules/class, которые могут поменяться
// в коде между визитами. Из черновика переносятся только value и filledFrom1C,
// сопоставление по имени поля.
export function draftMixin(section, keys) {
    const isFieldList = (value) => Array.isArray(value) && value.length > 0
        && value.every((item) => item && typeof item === 'object' && 'name' in item);

    return {
        created() {
            const saved = loadDraftSection(section);
            if (!saved) return;
            keys.forEach((key) => {
                if (!(key in saved)) return;
                if (isFieldList(this[key]) && Array.isArray(saved[key])) {
                    this[key] = this[key].map((field) => {
                        const savedField = saved[key].find((item) => item.name === field.name);
                        if (!savedField) return field;
                        const restored = {...field, value: savedField.value};
                        if ('filledFrom1C' in field) restored.filledFrom1C = !!savedField.filledFrom1C;
                        return restored;
                    });
                } else {
                    this[key] = saved[key];
                }
            });
        },
        mounted() {
            const save = () => {
                const snapshot = {};
                keys.forEach((key) => {
                    const value = this[key];
                    snapshot[key] = isFieldList(value)
                        ? value.map((field) => ({name: field.name, value: field.value, filledFrom1C: field.filledFrom1C}))
                        : value;
                });
                saveDraftSection(section, snapshot);
            };
            keys.forEach((key) => this.$watch(key, save, {deep: true}));
        },
    };
}
