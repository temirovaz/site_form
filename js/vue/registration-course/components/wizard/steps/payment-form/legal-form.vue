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
      fields: [
        {name: 'inn', label: 'ИНН', value: '', class: 'col-md-8', rules: 'required|inn'},
        {name: 'kpp', label: 'КПП', value: '', class: 'col-md-4', rules: 'required'},
        {name: 'name_short', label: 'Сокращенное наименование', value: '', class: 'col-md-12', rules: 'required'},
        {name: 'name_full_with_opf', tag: 'textarea', label: 'Полное наименование', value: '', class: 'col-md-12', rules: 'required'},
        {name: 'basis', label: 'Основание', value: '', class: 'col-md-12'},
        {name: 'management_name', label: 'Руководитель', value: '', class: 'col-md-8', rules: 'required'},
        {name: 'management_post', label: 'Должность руководителя', value: '', class: 'col-md-4', rules: 'required'},
        {name: 'legal_address', label: 'Юридический адрес', value: '', class: 'col-md-12', rules: 'required'}, // Новое поле
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
  },
  computed: {
    rows() {
      return [
        [0, 1], [2], [3],
        [4],
        [5, 6],
      ].map(row => row.map(i => this.fields[i]))
    },
  },
  watch: {
    clickedNext: function(status) {
      if(status === true){
        this.$refs.form.validate().then(success => {
          let payload = {}
          this.fields.forEach( (field) => {
            payload[field.name] = field.value;
          });
          this.$store.commit('saveDataFormForStep', {payment : {type: 'legal', ... payload}})
          this.$emit('can-continue', {status: success});

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
</style>