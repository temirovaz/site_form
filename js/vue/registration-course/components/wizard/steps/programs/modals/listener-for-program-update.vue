<template>
  <modal :name="modalName" class="modal-update-listener" @before-open="beforeOpen" :adaptive="true" height="auto">
    <ValidationObserver ref="form">
      <div class="modal-header">
        <button type="button" data-dismiss="modal" aria-label="Close" class="close" @click="$modal.hide(modalName)"><span aria-hidden="true">×</span></button>
        <h4 class="modal-title">Редактирование слушателя</h4>
      </div>
      <div class="modal-body">
        <template v-for="fields in mappingForm">
          <div class="row">
            <div v-for="field in fields">
              <div :class="field.class" >
                <template v-if="field.name === 'snils'">
                  <FormField :name="field.name" :label="field.label" ref="snils" :rules="field.rules" v-model.trim="listener[field.name]" @input="searchDataOnUserBySNILS"/>
                </template>
                <template v-else-if="field.name === 'email'">
                  <SuggestionEmail  label="Эл. почта" rules="required|email" v-model.trim="listener[field.name]"></SuggestionEmail>
                </template>
                <template v-else>
                  <FormField :isLoading="listener.isLoadedDataFrom1C && isLoading"
                             :max="field.max"
                             :name="field.name"
                             :placeholder="field.placeholder"
                             :disabled="listener.isLoadedDataFrom1C"
                             :label="field.label"
                             :type="listener.isLoadedDataFrom1C ? 'text' : field.type"
                             :rules="listener.isLoadedDataFrom1C ? '' : field.rules"
                             v-model.trim="listener[field.name]"/>
                </template>
              </div>
            </div>
          </div>
        </template>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default btn-sm" @click="updateListenerInProgram">Сохранить</button>
      </div>
    </ValidationObserver>
  </modal>
</template>

<script>

import DaDataSuggestion from "../../../../dadata-suggestion";
import SuggestionEmail from "../../../../suggestion/suggestion-email";
import ListenerModel from "../../../../../model/ListenerModel";
import ProgramService from "../../../../../service/ProgramService";
import NotifyService from "../../../../../service/NotifyService";
import ApiLikeyService from "../../../../../service/api/ApiLikeyService";

export default {
  name: 'listener-for-program-update',
  components: {DaDataSuggestion, SuggestionEmail},
  data: function (){
    return {
      modalName: 'listener-for-program-update',
      program: {},
      listener: {},
      isLoading: false,
      snils: null,
      mappingForm: [
        [
          {name: 'phone', label: 'Телефон', placeholder : "+7(___)___-__-__", class: 'col-md-6' },
          {name: 'email', label: 'Электронная почта', rules: 'email', class: 'col-md-6' },
        ],
        [
          {name: 'snils', label: 'СНИЛС', rules: 'required|digits:11|snils', class: 'col-md-12' },
        ],
        [
          {name: 'surname', label: 'Фамилия', rules: 'required', class: 'col-md-4', autocomplete: true},
          {name: 'name', label: 'Имя', rules: 'required', class: 'col-md-4', autocomplete: true},
          {name: 'patronymic', label: 'Отчество', class: 'col-md-4', autocomplete: true},
        ],
        [
          {name: 'date_of_birth', type: 'date', max: new Date().toJSON().split('T')[0], label: 'Дата рождения', rules: 'required', class: 'col-md-12'},
        ],
        [
          {name: 'passport_series', label: 'Серия', rules: 'required|digits:4', class: 'col-md-3'},
          {name: 'passport_number', label: 'Номер', rules: 'required|digits:6', class: 'col-md-3'},
          {name: 'passport_date_of_issue', type: 'date', max: new Date().toJSON().split('T')[0], label: 'Дата выдачи', rules: 'required', class: 'col-md-3'},
          {name: 'passport_division', label: 'Код подразделения', rules: 'required', class: 'col-md-3'},
        ],
        [
          {name: 'passport_issued', label: 'Выдан', rules: 'required', class: 'col-md-12'},
        ],
        [
          {name: 'passport_place_of_birth', label: 'Место рождения', rules: 'required', class: 'col-md-12'},
        ],
        [
          {name: 'registration', label: 'Регистрация', rules: 'required', class: 'col-md-12'},
        ],
        [
          {name: 'post', label: 'Должность абитуриента', rules: 'required',class: 'col-md-12', autocomplete: true},
        ]
      ],
    }
  },
  methods:{
    beforeOpen: function (event) {
      this.program = event.params.program;
      this.listener = event.params.listener;
      this.snils = event.params.listener.snils;
    },

    async searchDataOnUserBySNILS(snils) {

      const { valid } = await this.$refs.snils[0].$refs.validator.validate();

      //10288136338 '39591544233'  61728845217 08229564686
      if(valid){
        this.isLoading = true;
        ApiLikeyService.getListenerBySnilsFrom1C(snils).then(
            (response) => {
              if(response.data.status === "success" ){
                if(response.data.data){
                  const payload = {...response.data.data, ...{isLoadedDataFrom1C: true, phone: this.listener.phone, email: this.listener.email, snils: snils}};
                  this.listener = ListenerModel.fromObject(payload);
                }else{
                  this.clearProtectedReceivedFrom1C();
                }
              }
            }
        ).finally( () => this.isLoading = false);
      }
    },

    updateListenerInProgram: function (){

      this.$refs.form.validate().then(success => {
        if (!success) {
          return;
        }
        console.log(this.listener);
        ProgramService.updateListenerBySnilsInAllPrograms(this.snils, this.listener);
        this.$modal.hide(this.modalName);
      });
    },

    clearProtectedReceivedFrom1C(){
      if(this.listener.isLoadedDataFrom1C === true){
        this.listener.name = '';
        this.listener.surname = '';
        this.listener.date_of_birth =  '';
        this.listener.patronymic = '';
        this.listener.post = '';
        this.listener.isLoadedDataFrom1C = false;
      }
    }
  }

}
</script>

