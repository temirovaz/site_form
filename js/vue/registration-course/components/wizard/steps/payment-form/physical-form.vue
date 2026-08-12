<template>
  <div>
    <div class="payer-form-group">
      <div class="payer-form-group__note"><h3>Ваши паспортные данные</h3></div>
      <ValidationObserver ref="form" >
        <div class="">
          <div ref="test"></div>
            <template v-for="fields in rows">
              <div class="row">
                <div v-for="field in fields">
                  <div :class="field.class" >
                    <template v-if="field.name === 'snils'">
                      <FormField :name="field.name" :label="field.label" ref="snils" :rules="field.rules" v-model="field.value" @input="searchDataOnUserBySNILS"/>
                    </template>
                    <template v-else-if="field.name === 'passport_division'">
                      <DaDataSuggestion mode="FMS_UNIT" :label="field.label" :rules="fieldsIsDisable && !!field.value ? '' : field.rules" :disabled="fieldsIsDisable && !!field.value" v-model.trim="field.value" @dadata-select-suggestion="onDivisionSelected"/>
                    </template>
                    <template v-else>
                        <FormField :isLoading="isLoading"
                                 :max="field.max"
                                 :type="fieldsIsDisable && !!field.value ? 'text' : field.type"
                                 :name="field.label"
                                 :disabled="fieldsIsDisable && !!field.value"
                                 :label="field.label"
                                 :rules="fieldsIsDisable && !!field.value ? '' : field.rules"
                                 v-model.trim="field.value"/>
                    </template>
                  </div>
                </div>
              </div>
            </template>
            <template v-for="index in [12]">
              <FormInput :type="fields[index].type" v-model.trim="fields[index].value" :name="fields[index].name"/>
            </template>
        </div>
      </ValidationObserver>
    </div>
  </div>
</template>

<script>
import FormInput from "../../../form/form-input";
import DaDataSuggestion from "../../../dadata-suggestion";
export default {
  name: 'wizard-physical-form',
  components: {FormInput, DaDataSuggestion},
  props: ['clickedNext'],
  data: function () {
    return {
      fieldsIsDisable: true,
      isLoading: false,
      fields: [  
        {name: 'snils', label: 'СНИЛС', rules: 'required|digits:11|snils', class: 'col-md-12', value: ''},
        {name: 'surname', label: 'Фамилия', rules: 'required', class: 'col-md-4'},
        {name: 'name', label: 'Имя', rules: 'required', class: 'col-md-4'},
        {name: 'patronymic', label: 'Отчество', rules: 'required', class: 'col-md-4'},
        {name: 'passport_series', label: 'Серия', rules: 'required|digits:4', class: 'col-md-3'},
        {name: 'passport_number', label: 'Номер', rules: 'required|digits:6', class: 'col-md-3'},
        {name: 'passport_date_of_issue', type: 'date', max: new Date().toJSON().split('T')[0], label: 'Дата выдачи', rules: 'required', class: 'col-md-3'},
        {name: 'passport_division', label: 'Код подразделения', rules: 'required', class: 'col-md-3'},
        {name: 'passport_issued', label: 'Выдан', rules: 'required', class: 'col-md-12', value: ''},
        {name: 'passport_place_of_birth', label: 'Место рождения', rules: 'required', class: 'col-md-12'},
        {name: 'registration', label: 'Регистрация', rules: 'required', class: 'col-md-12'},
        {name: 'address', label: 'Почтовый адрес', rules: 'required', class: 'col-md-12'},
        {name: 'physical_id', type: 'hidden',  value: '', class: 'col-md-12'},
      ],
    }
  },
  methods: {
     async searchDataOnUserBySNILS(value) {

        const { valid } = await this.$refs.snils[0].$refs.validator.validate();

        if(this.fieldsIsDisable === true){
          this.clearFormFields();
        }

        //10288136338 '39591544233' '39591544233'
        if (valid) {
          this.isLoading = true;
          this.$api.likey.post('/GetData/3_00',{'document' : value, 'type' : 'student'}).then(
              (response) => {
                this.isLoading = false;
                if(response.data.status === "success" ){
                  if(response.data.data){ //DRY
                    this.fieldsIsDisable = true;
                    this.fields = this.fields.map((field) => {
                      field.value = field.value || response.data.data[field.name] || '';
                        return field;
                    });
                  }else{
                   this.clearFormFields();
                   this.fieldsIsDisable = false;
                  }
                }
              }
          );
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
    }
  },
  computed: {
    rows() {
      return [
        [0],
        [1, 2, 3,],
        [4, 5, 6, 7],
        [8], [9], [10], [11],
      ].map(row => row.map(i => this.fields[i]))
    },
    rowsForHiddenField() {
      return [
        [11],
        [12],
      ].map(row => row.map(i => this.fields[i]))
    },
  },

  watch: {
    clickedNext:function(status) {
      if(status === true){
        this.$refs.form.validate().then(success => {
          let payload = {}
          this.fields.forEach( (field) => {
            payload[field.name] = field.value;
          });
          this.$store.commit('saveDataFormForStep', {payment : {type: 'physical', ... payload}});

          this.$emit('can-continue', {status: success});

        });
      }

    }
  },
}
</script>