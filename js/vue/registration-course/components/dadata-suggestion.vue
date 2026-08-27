<template>
  <div class="dadata">
    <FormField :label="label" :rules="rules" v-model="localValue" :placeholder="placeholder" :disabled="disabled" mode="passive" @keyup="searchSuggestion"/>
    <div class="dadata-suggestions" v-if="suggestions.length">
      <div class="dadata-suggestions__list">
        <div class="dadata-suggestions-item"
             v-for="suggestion in suggestions" v-html="suggestion.formatString" @click="sendSuggestionToParentComponent(suggestion)"></div>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'DaDataSuggestion',
  props: [ 'value', 'rules', 'label', 'mode', 'placeholder', 'disabled'],
  data: function () {
    return {
      localValue: '',
      suggestions: [],
    }
  },
  methods: {
    searchSuggestion: async function (event) {
      const querySearch = event.target.value;
      if(!querySearch || this.disabled) return;

      if (this.mode === 'email') {
          const response = await this.$api.dadata.post('/suggest/email', {query: querySearch});
          this.searchSuggestions();
          if(response?.data?.suggestions.length){
            response.data.suggestions.forEach((suggestion) => {
              const formatString = `${suggestion.value}`.replaceAll(querySearch, `<span>${querySearch}</span>`);
              this.suggestions.push({  ...suggestion.data,  ...{   value: suggestion.value, formatString: formatString }})
            });
        }
      }

      if(['LEGAL', 'INDIVIDUAL'].includes(this.mode)){
          const response =  await this.$api.dadata.post('/suggest/party', {query: querySearch, type: this.mode});
          this.searchSuggestions();
          if(response?.data?.suggestions.length){
            response.data.suggestions.forEach((suggestion) => {

              let formatString = suggestion.value;
              if(this.mode === 'LEGAL'){
                formatString = `${suggestion.value} (ИНН/КПП: ${suggestion.data.inn}/${suggestion.data.kpp}) - ОГРН: ${suggestion.data.ogrn}`.replaceAll(querySearch, `<span>${querySearch}</span>`);
              }
              if(this.mode === 'INDIVIDUAL'){
                formatString = `${suggestion.value} (ИНН: ${suggestion.data.inn}) - ОГРН: ${suggestion.data.ogrn}`.replaceAll(querySearch, `<span>${querySearch}</span>`);
              }
              this.suggestions.push( { ...suggestion.data, ...{
                  formatString: formatString,
                  name_short: suggestion.data.name.short || suggestion.data.name.short_with_opf  || '',
                  name_full_with_opf: suggestion.data.name.full_with_opf || '',
                  management_name: suggestion.data.management?.name || suggestion.data.name.full || '',
                  management_post: suggestion.data.management?.post || (this.mode === 'INDIVIDUAL' ? 'Директор' : ''),
                  // Добавляем данные об адресе и индексе
                  address_value: suggestion.data.address?.value || '',
                  postal_code: suggestion.data.address?.data?.postal_code || '',
              }})
            })
          }
      }

      if(this.mode === 'FMS_UNIT'){
        const response = await this.$api.dadata.post('/suggest/fms_unit', {query: querySearch});
        this.searchSuggestions();
        if(response?.data?.suggestions.length){
          response.data.suggestions.forEach((suggestion) => {

            const formatString = `${suggestion.data.code} — ${suggestion.data.name}`.replaceAll(querySearch, `<span>${querySearch}</span>`);

            this.suggestions.push({ ...suggestion.data, ...{
                formatString: formatString,
                value: suggestion.value,
                passport_division: suggestion.data.code,
                passport_issued: suggestion.data.name,
              }})
          })
        }
      }

      if(this.mode === 'BANK'){
        const response =  await this.$api.dadata.post('/suggest/bank', {query: querySearch});
        this.searchSuggestions();
        if(response?.data?.suggestions.length){
          response.data.suggestions.forEach((suggestion) => {

            const formatString = `${suggestion.value  } (БИК: ${suggestion.data.bic}) | ${suggestion.data.address.value}`.replaceAll(querySearch, `<span>${querySearch}</span>`);

            this.suggestions.push( { ...suggestion.data, ...{
                formatString: formatString,
                value: suggestion.unrestricted_value,
                address_value: suggestion.data.address.value,
                name_short: suggestion.unrestricted_value,
              }})
          })
        }
      }
    },

    searchSuggestions: function (){
      this.suggestions = [];
    },
    sendSuggestionToParentComponent: function(suggestion) {
      this.searchSuggestions();

      if (this.mode === 'email') {
          this.localValue = suggestion.value;
      }
      if (this.mode === 'FMS_UNIT') {
          this.localValue = suggestion.passport_division;
      }
      if(['INDIVIDUAL', 'LEGAL', 'BANK', 'FMS_UNIT'].includes(this.mode)){
        this.$emit('dadata-select-suggestion', {fields: suggestion})
      }
    },
  },
  watch: {
    localValue(value, olf) {
      this.$emit("input", value);
    },
    value(value) {
      if (value !== this.localValue) {
        this.localValue = value;
      }
    }
  },
  created() {
    if (this.value) {
      this.localValue = this.value;
    }
  },
}
</script>
