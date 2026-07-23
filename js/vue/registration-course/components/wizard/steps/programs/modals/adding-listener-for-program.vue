<template>
  <modal :name="modalName" class="modal-adding-listener" :adaptive="true" height="auto" @before-open="beforeOpen">
    <ValidationObserver ref="form">
      <div class="modal-header">
        <button type="button" data-dismiss="modal" aria-label="Close" class="close" @click="$modal.hide(modalName)"><span aria-hidden="true">×</span></button>
        <h4 class="modal-title">Добавление слушателя</h4>
      </div>
      <div class="modal-body">
        <template v-for="fields in rows">
          <div class="row">
            <div v-for="field in fields">
              <div :class="field.class" >
                <template v-if="field.name === 'snils'">
                  <FormField :name="field.name" :label="field.label" ref="snils" :rules="field.rules" v-model="field.value" @input="searchDataOnUserBySNILS"/>
                </template>
                <template v-else-if="field.name === 'email'">
                  <SuggestionEmail  label="Эл. почта" rules="required|email" v-model.trim="field.value"></SuggestionEmail>
                </template>
                <template v-else-if="field.name === 'passport_division'">
                  <DaDataSuggestion mode="FMS_UNIT" :label="field.label"
                             :disabled="!field.canEditValue && isAutoloadFrom1C"
                             :rules="isAutoloadFrom1C && !field.canEditValue ? '' : field.rules"
                             v-model.trim="field.value" @dadata-select-suggestion="onDivisionSelected"/>
                </template>
                <template v-else>
                  <FormField :isLoading="field.autocomplete && isLoading"
                             :max="field.max"
                             :name="field.name"
                             :placeholder="field.placeholder"
                             :disabled="!field.canEditValue && isAutoloadFrom1C"
                             :label="field.label"
                             :type="isAutoloadFrom1C ? 'text' : field.type"
                             :rules="isAutoloadFrom1C && !field.canEditValue  ? '' : field.rules"
                             v-model.trim="field.value"/>
                </template>
              </div>
            </div>
          </div>
        </template>

      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default btn-sm" @click="addListenerInProgram">Добавить слушателя</button>
      </div>
    </ValidationObserver>
  </modal>
</template>

<script>

import DaDataSuggestion from "../../../../dadata-suggestion";
import SuggestionEmail from "../../../../suggestion/suggestion-email";
import ListenerService from "../../../../../service/ListenerService";
import ListenerModel from "../../../../../model/ListenerModel";
import ProgramService from "../../../../../service/ProgramService";
import NotifyService from "../../../../../service/NotifyService";

export default {
  name: 'adding-listener-for-program',
  components: {DaDataSuggestion, SuggestionEmail},
  data: function (){
    return {
      program: {},
      modalName: 'adding-listener-for-program',
      fieldsIsDisable: false,
      isAutoloadFrom1C: false,
      isLoading: false,
      fields: [
        {name: 'phone', label: 'Телефон', placeholder : "+7(___)___-__-__", class: 'col-md-6', value: '+7 (123)-12-31-231', autocomplete: false, canEditValue: false},
        {name: 'email', label: 'Электронная почта', rules: 'email', class: 'col-md-6', value: '123@GMAIL.СOM', autocomplete: false, canEditValue: false},
        {name: 'snils', label: 'СНИЛС', rules: 'required|digits:11|snils', class: 'col-md-12', value: '92703662611', autocomplete: false, canEditValue: false},
        {name: 'surname', label: 'Фамилия', rules: 'required', class: 'col-md-4', value: 'g', autocomplete: true, canEditValue: false},
        {name: 'name', label: 'Имя', rules: 'required', class: 'col-md-4', value: 'G', autocomplete: true, canEditValue: false},
        {name: 'patronymic', label: 'Отчество', class: 'col-md-4', value: 'G', autocomplete: true, canEditValue: false},
        {name: 'passport_date_of_birth', type: 'date', max: new Date().toJSON().split('T')[0], label: 'Дата рождения',
          rules: 'required',class: 'col-md-12', value: '12.12.2000', autocomplete: true, canEditValue: false},
        {name: 'passport_series', label: 'Серия', rules: 'required|digits:4', class: 'col-md-3', value: '', autocomplete: true, canEditValue: false},
        {name: 'passport_number', label: 'Номер', rules: 'required|digits:6', class: 'col-md-3', value: '', autocomplete: true, canEditValue: false},
        {name: 'passport_date_of_issue', type: 'date', max: new Date().toJSON().split('T')[0], label: 'Дата выдачи', rules: 'required', class: 'col-md-3', value: '', autocomplete: true, canEditValue: false},
        {name: 'passport_division', label: 'Код подразделения', rules: 'required', class: 'col-md-3', value: '', autocomplete: true, canEditValue: false},
        {name: 'passport_issued', label: 'Выдан', rules: 'required', class: 'col-md-12', value: '', autocomplete: true, canEditValue: false},
        {name: 'passport_place_of_birth', label: 'Место рождения', rules: 'required', class: 'col-md-12', value: '', autocomplete: true, canEditValue: false},
        {name: 'registration', label: 'Регистрация', rules: 'required', class: 'col-md-12', value: '', autocomplete: true, canEditValue: false},
        {name: 'post', label: 'Должность абитуриента', rules: 'required',class: 'col-md-12', value: '23', autocomplete: true, canEditValue: true},

      ],

    }
  },
  computed: {
    rows() {
      return [
        [0, 1], [2], [3, 4, 5], [6], [7, 8, 9, 10], [11], [12], [13], [14]
      ].map(row => row.map(i => this.fields[i]))
    },
  },

  methods:{
    beforeOpen: function (event) {
      this.clearFieldsForm();
      this.program = event.params.program;
    },

    async searchDataOnUserBySNILS(value) {

      const { valid } = await this.$refs.snils[0].$refs.validator.validate();

      if(this.fieldsIsDisable === true){
        this.clearFormFields();
      }

      //10288136338 '39591544233' '39591544233' 61728845217
      if (valid) {
        this.isLoading = true;
        this.$api.likey.post('/GetData/3_00',{'document' : value, 'type' : 'student'}).then(
            (response) => {

              if(response.data.status === "success" ){
                if(response.data.data){ //DRY
                  this.fieldsIsDisable = true;
                  this.isAutoloadFrom1C = true;
                  this.fields = this.fields.map((field) => {
                    if(field.autocomplete){
                      field.value = response.data.data[field.name];
                    }

                    return field;
                  });
                }else{
                  this.isAutoloadFrom1C = false;
                  this.fieldsIsDisable = false;
                }
              }
            }
        ).catch( (error) => {
          this.fieldsIsDisable = false;
          this.isAutoloadFrom1C = false;
          this.clearFormFields();
        }).finally( () => {
          this.isLoading = false;
        });
      }
    },

    clearFormFields(){
      this.fields = this.fields.map((field) => {
        field.value = field.name === 'snils' ? field.value : '';
        return field;
      });
    },

    onDivisionSelected(suggestion){
      const issuedField = this.fields.find(f => f.name === 'passport_issued');
      if(issuedField && suggestion.fields.passport_issued){
        issuedField.value = suggestion.fields.passport_issued;
      }
    },

    addListenerInProgram: function (){

      this.$refs.form.validate().then(success => {
        if (!success) {
          return;
        }
        let payload = {};
        this.fields.forEach((field) => {
          payload[field.name] = field.type === 'date' && !field.value.includes('*') ? new Date(field.value).toISOString() : field.value;
        });

        const model = ListenerModel.fromObject({...payload, ...{fieldsIsDisable: this.fieldsIsDisable}});
        if(ListenerService.hasListenerInProgram(this.program, model)){
            NotifyService.sendError(`Пользователь с номером ${model.snils } СНИЛ уже добавлен в программу`)
        }else{
          ProgramService.addListenerInProgram(this.program, model);
          this.$modal.hide(this.modalName);

        }


      });
    },

    clearFieldsForm: function () {
      this.fields = this.fields.map((field) => {
        field.value = '';
        return field;
      });
    },
  }

}
</script>