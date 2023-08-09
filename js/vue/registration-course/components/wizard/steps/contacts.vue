<template>
  <div>
    <h2>Контактная информация</h2>
    <ValidationObserver ref="form">
      <form>
        <FormField label="Телефон" name="phone" rules="required" v-model="phone"  placeholder="+7(___)___-__-__" />
        <SuggestionEmail label="Эл. почта" rules="required|email" v-model="email"></SuggestionEmail>
      </form>
    </ValidationObserver>
  </div>

</template>

<script>


import DaDataSuggestion from "../../dadata-suggestion";
import SuggestionEmail from "../../../components/suggestion/suggestion-email";

export default {
  name: 'wizard-step-contacts',
  components: {DaDataSuggestion, SuggestionEmail},
  props: ['clickedNext'],
  data: function () {
    return {
      phone: '',
      email: '',
    }
  },
  watch: {

    clickedNext: function(status) {
      if(status === true){
        this.$refs.form.validate().then(success => {
          this.$store.commit('saveDataFormForStep', {contact : {email: this.email, phone: this.phone}})
          this.$emit('can-continue', {status: success})
        });
      }
    }
  }

}
</script>
