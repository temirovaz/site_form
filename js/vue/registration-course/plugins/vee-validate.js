import Vue from 'vue'
import { ValidationObserver, ValidationProvider, extend, localize, withValidation } from 'vee-validate';

import * as rules from 'vee-validate/dist/rules';
import ru from "vee-validate/dist/locale/ru.json";
import {checkSnilsOnlyChecksum, checkINN} from 'ru-validation-codes'

Object.keys(rules).forEach(rule => {
    extend(rule, rules[rule]);
});
ru.messages.required = 'Поле "{_field_}" обязательно для заполнения';

localize('ru', ru);


extend('snils', value => {
    if(checkSnilsOnlyChecksum(value)){
        return true
    }
    return 'Поле "СНИЛС" должно быть действительным СНИЛС номером';
});
extend('inn', value => {
    if(checkINN(value)){
        return true
    }
    return 'Поле "ИНН" должно быть действительным ИНН номером';
});



Vue.component('ValidationProvider', ValidationProvider);
Vue.component('ValidationObserver', ValidationObserver);
Vue.component('withValidation', withValidation);



