<template>
  <div>
    <h2>Контактная информация</h2>
    <ValidationObserver ref="form">
      <form>
        <FormField label="Телефон" name="phone" rules="required" v-model="phone"  placeholder="+7(___)___-__-__" />
        <SuggestionEmail label="Эл. почта" rules="required|email" v-model="email"></SuggestionEmail>
        <div class="checkbox-container">
          <input type="checkbox" id="privacy-policy" v-model="privacyPolicyAccepted" checked>
          <label for="privacy-policy">
            Я согласен с <a href="https://likey.su/include/licenses_detail.php" target="_blank">политикой обработки персональных данных</a>
          </label>
        </div>
        <div v-if="showPrivacyPolicyError" class="error-message">
          Необходимо принять политику
        </div>
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
      privacyPolicyAccepted: true,
      showPrivacyPolicyError: false,
    }
  },
  watch: {
    clickedNext: function(status) {
      if(status === true){
        this.showPrivacyPolicyError = false;
        this.$refs.form.validate().then(success => {
          if (success && this.privacyPolicyAccepted) {
            this.$store.commit('saveDataFormForStep', {contact : {email: this.email, phone: this.phone}})
            this.$emit('can-continue', {status: true})
          } else if (!this.privacyPolicyAccepted) {
            this.showPrivacyPolicyError = true;
            this.$emit('can-continue', {status: false})
          } else {
            this.$emit('can-continue', {status: false})
          }
        });
      }
    }
  }
}
</script>

<style scoped>
.checkbox-container {
  margin-top: 15px;
}
.error-message {
  color: red;
  margin-top: 5px;
}
</style>