<template>
  <div>
    <div class="payer-form-group__note"><h3>Данные юридического лица</h3></div>
    <ValidationObserver ref="form">
      <div class="row">
        <div class="col-md-12">
          <DaDataSuggestion
              mode="LEGAL" label="Введите название в свободной форме, адрес, ИНН или ОГРН"
             @dadata-select-suggestion="daDataSelectSuggestion">
          </DaDataSuggestion>

        </div>
      </div>
      <template v-for="fields in rows">
        <div class="row">
          <div v-for="field in fields">
            <div :class="field.class" >
                <FormField :name="field.label" :label="field.label" :rules="field.rules" v-model.trim="field.value" :tag="field.tag"/>
            </div>
          </div>
        </div>
      </template>
      
      <!-- Чек-бокс согласия на обработку данных слушателей -->
      <div class="checkbox-container">
        <input type="checkbox" id="listeners-consent-legal" v-model="listenersConsentAccepted">
        <label for="listeners-consent-legal">
          Согласия на обработку субъектов персональных данных (слушателей) получены
        </label>
      </div>
      <div v-if="showListenersConsentError" class="error-message">
        Необходимо подтвердить получение согласий
      </div>
    </ValidationObserver>
  </div>
</template>

<script>

import FormField from "../../../form-field";
import DaDataSuggestion from "../../../dadata-suggestion";

export default {
  name: 'wizard-legal-form',
  components: {DaDataSuggestion, FormField},
  props: ['clickedNext'],
  data: function () {
    return {
      suggestions: [],
      listenersConsentAccepted: false,
      showListenersConsentError: false,
      fields: [
        {name: 'inn', label: 'ИНН', value: '', class: 'col-md-8', rules: 'required|inn'},
        {name: 'kpp', label: 'КПП', value: '', class: 'col-md-4', rules: 'required'},
        {name: 'name_short', label: 'Сокращенное наименование', value: '', class: 'col-md-12', rules: 'required'},
        {name: 'name_full_with_opf', tag: 'textarea', label: 'Полное наименование', value: '', class: 'col-md-12', rules: 'required'},
        {name: 'basis', label: 'Основание', value: '', class: 'col-md-12'},
        {name: 'management_name', label: 'Руководитель', value: '', class: 'col-md-8', rules: 'required'},
        {name: 'management_post', label: 'Должность руководителя', value: '', class: 'col-md-4', rules: 'required'},
        {name: 'address_value', label: 'Юридический адрес', value: '', class: 'col-md-12', rules: 'required'},
        {name: 'actual_address', label: 'Фактический адрес', value: '', class: 'col-md-12', rules: 'required'},
        {name: 'postal_code', label: 'Почтовый индекс', value: '', class: 'col-md-4', rules: 'required'},
      ],
    }
  },
  methods: {
    daDataSelectSuggestion: function (suggestion){
      this.fields = this.fields.map((field) => {
        if(suggestion.fields.hasOwnProperty(field.name)){
          field.value = suggestion.fields[field.name];
        }
        return field;
      });
      
      // Автоматически заполняем фактический адрес и почтовый индекс данными из юридического адреса
      if (suggestion.fields.address_value) {
        const actualAddressField = this.fields.find(field => field.name === 'actual_address');
        if (actualAddressField) {
          actualAddressField.value = suggestion.fields.address_value;
        }
      }
      
      if (suggestion.fields.postal_code) {
        const postalCodeField = this.fields.find(field => field.name === 'postal_code');
        if (postalCodeField) {
          postalCodeField.value = suggestion.fields.postal_code;
        }
      }
    },
  },
  computed: {
    rows() {
      return [
        [0, 1], [2], [3],
        [4],
        [5, 6], [7], [8], [9],
      ].map(row => row.map(i => this.fields[i]))
    },
  },
  watch: {
    clickedNext: function(status) {
      if(status === true){
        this.showListenersConsentError = false;
        this.$refs.form.validate().then(success => {
          if (success && this.listenersConsentAccepted) {
            let payload = {}
            this.fields.forEach( (field) => {
              payload[field.name] = field.value;
            });
            this.$store.commit('saveDataFormForStep', {payment : {type: 'legal', ... payload}})
            this.$emit('can-continue', {status: true});
          } else if (!this.listenersConsentAccepted) {
            this.showListenersConsentError = true;
            this.$emit('can-continue', {status: false});
          } else {
            this.$emit('can-continue', {status: false});
          }
        });
      }
    },

  },


}
</script>
<style>
.form-control[disabled]{
  background-color: #eee;
  opacity: 1;
}

.checkbox-container {
  margin-top: 15px;
}

.error-message {
  color: red;
  margin-top: 5px;
}
</style>