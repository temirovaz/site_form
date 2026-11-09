<template>
  <div>
    <h2>Банковские реквизиты</h2>
    <ValidationObserver ref="form">
<!--      <DaData :fields="fields" placeholder="Поиск банковских реквизитов по названию банка, БИК, SWIFT или ИНН"
              @dadata-select-suggestion="daDataSelectSuggestion" type="bank" :post="{}"></DaData>-->
      <DaDataSuggestion
          mode="BANK"
          label="Введите название в свободной форме, адрес, ИНН или ОГРН" @dadata-select-suggestion="daDataSelectSuggestion">
      </DaDataSuggestion>

      <template v-for="fields in rows">
        <div class="row">
          <div v-for="field in fields">
            <div :class="field.class" >
              <FormField :max="field.max" :type="field.type"
                         :name="field.label"  :label="field.label" :rules="field.rules" v-model="field.value"/>
            </div>
          </div>
        </div>
      </template>
    </ValidationObserver>
  </div>
</template>

<script>
import DaDataSuggestion from "../../dadata-suggestion";
import {draftMixin} from "../../../plugins/draft";
import stepValidity from "../step-validity";

export default {
  name: 'wizard-step-bank',
  components: { DaDataSuggestion },
  // Черновик: банковские реквизиты переживают перезагрузку (см. plugins/draft.js).
  mixins: [draftMixin('bank', ['fields']), stepValidity],
  props: ['clickedNext'],
  data: function () {
    return {
      fields: [
        {name: 'name_short', label: 'Наименование банка', rules: 'required', class: 'col-md-12'},
        {name: 'bic', label: 'БИК', class: 'col-md-4',  rules: 'required',},
        {name: 'correspondent_account', label: 'Корреспондентский счет', rules: 'required', class: 'col-md-8'},
        {name: 'address_value', label: 'Адрес банка', rules: 'required', class: 'col-md-12'},
        {name: 'account', label: 'Расчетный счет', rules: 'required|digits:20' , class: 'col-md-12'},
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
    },
    reportValidity(){
      this.validateFormSilently().then((formValid) => {
        this.reportStepValidity('wizard-step-bank', formValid);
      });
    },
  },
  computed: {
    rows() {
      return [  [0], [1, 2], [3], [4] ].map(row => row.map(i => this.fields[i]))
    },
  },
  watch: {
    // Любое изменение реквизитов пересчитывает валидность шага для индикатора.
    fields: {deep: true, handler: 'reportValidity'},
    clickedNext: function(status) {
      if(status === true){
        this.$refs.form.validate().then(success => {
          let payload = {}
          this.fields.forEach( (field) => {
            payload[field.name] = field.value;
          });
          this.$store.commit('saveDataFormForStep', {bank: {...payload}});

          this.$emit('can-continue', {status: success})
        });
      }
    }
  },
  mounted() {
    this.reportValidity();
  },

}
</script>
