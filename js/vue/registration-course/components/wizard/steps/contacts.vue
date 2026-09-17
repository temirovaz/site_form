<template>
  <div>
    <h2>Контактная информация</h2>
    <ValidationObserver ref="form">
      <form>
        <FormField label="Телефон" name="phone" :rules="phoneRules" v-model="phone"  placeholder="+7(___)___-__-__" />
        <SuggestionEmail label="Эл. почта" rules="required|email" v-model="email"></SuggestionEmail>
      </form>
    </ValidationObserver>

    <div class="checkbox-container">
      <input type="checkbox" id="decline-application" v-model="declineApplication">
      <label for="decline-application">Не хочу оформлять заявку — свяжитесь со мной и заполните её за меня</label>
    </div>
    <div v-if="declineApplication" class="decline-hint">
      Укажите эл. почту — на неё придёт подтверждение заявки. Телефон по желанию, остальное менеджер заполнит вместе с вами.
    </div>

    <!-- Чек-бокс политики обработки персональных данных -->
    <div class="checkbox-container">
      <input type="checkbox" id="privacy-policy" v-model="privacyPolicyAccepted">
      <label for="privacy-policy">
        Я согласен с <a href="https://likey.su/include/licenses_detail.php" target="_blank">политикой обработки персональных данных</a>
      </label>
    </div>
    <div v-if="showPrivacyPolicyError" class="error-message">
      Необходимо принять политику
    </div>

    <div class="row" v-if="isDeclineSubmit">
      <div class="col-md-12">
        <FormField name="comment" label="Комментарий" v-model.trim="comment" tag="textarea"/>
      </div>
    </div>
  </div>
</template>

<script>
import DaDataSuggestion from "../../dadata-suggestion";
import SuggestionEmail from "../../../components/suggestion/suggestion-email";
import RegistrationCourseFormService from "../../../service/RegistrationCourseFormService";

export default {
  name: 'wizard-step-contacts',
  components: {DaDataSuggestion, SuggestionEmail},
  props: ['clickedNext', 'clickedFinish'],
  data: function () {
    return {
      phone: '',
      email: '',
      comment: '',
      declineApplication: false,
      privacyPolicyAccepted: false,
      showPrivacyPolicyError: false,
    }
  },
  computed: {
    // Заявку отправляем прямо с этого шага, когда человек отказался заполнять её
    // сам и оставил почту — заполнять остальные шаги за него будет менеджер.
    isDeclineSubmit(){
      return this.declineApplication && Boolean(this.email?.trim());
    },
    // Почта обязательна всегда: без неё заявке некуда уйти — подтверждение и
    // дальнейшая переписка идут по почте. При отказе от заполнения необязательным
    // становится только телефон.
    phoneRules(){
      return this.declineApplication ? '' : 'required';
    }
  },
  watch: {
    isDeclineSubmit: {
      immediate: true,
      handler(value){
        this.$store.commit('setDeclineApplication', value);
      }
    },
    clickedNext: function(status) {
      if(status === true){
        this.validateStep().then(success => this.$emit('can-continue', {status: success}));
      }
    },
    clickedFinish: function(status) {
      if(status === true){
        this.validateStep().then(success => {
          if(success){
            RegistrationCourseFormService.saveCommentInSummaryStep(this.comment);
          }
          this.$emit('can-finish', {status: success});
        });
      }
    }
  },
  methods: {
    validateStep(){
      this.showPrivacyPolicyError = false;

      return this.$refs.form.validate().then(success => {
        if(!this.privacyPolicyAccepted){
          this.showPrivacyPolicyError = true;
          return false;
        }
        if(!success) return false;

        this.$store.commit('saveDataFormForStep', {contact : {email: this.email, phone: this.phone}})
        return true;
      });
    }
  },
  beforeDestroy() {
    this.$store.commit('setDeclineApplication', false);
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
.decline-hint {
  margin-top: 5px;
  color: #777;
  font-size: 0.9em;
}
</style>
