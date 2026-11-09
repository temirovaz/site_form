<template>
  <div>
    <h2>Плательщик</h2>
    <div class="radio-button">
      <div class="radio-button-item">
        <input id="radio-1" type="radio" name="payment" value="legal" v-model="payment">
        <label for="radio-1">Юридическое лицо</label>
      </div>
      <div class="radio-button-item">
        <input id="radio-2" type="radio" name="payment" value="ip" v-model="payment">
        <label for="radio-2" >Индивидуальный предприниматель</label>
      </div>
      <div class="radio-button-item">
        <input id="radio-3" type="radio" name="payment" value="physical" v-model="payment">
        <label for="radio-3">Физическое лицо</label>
      </div>
    </div>

    <NoteLine v-if="!component">Выберите от кого будет заключаться договор</NoteLine>

    <template v-if="component">
      <keep-alive>
        <component v-bind:is="component" :clickedNext="clickedNext" @can-continue="canContinue" @validity-change="onChildValidity"></component>
      </keep-alive>
    </template>
  </div>

</template>

<script>


import physicalForm from './payment-form/physical-form';
import IPForm from './payment-form/ip-form';
import legalForm from './payment-form/legal-form';
import NoteLine from '../../note-line';
import {sendNotifyError} from '../../../plugins/toast';
import {draftMixin} from '../../../plugins/draft';
import stepValidity from '../step-validity';

export default {
  name: 'wizard-step-payment',
  components: {
    physicalForm,
    IPForm,
    legalForm,
    NoteLine
  },
  // Черновик: выбранный тип плательщика переживает перезагрузку (по нему
  // восстанавливается и нужная подформа — см. watch.payment).
  mixins: [draftMixin('paymentForm', ['payment']), stepValidity],
  props: ['clickedNext'],
  data: function () {
    return {
      payment: '',
      component: null,
      components: { ip: IPForm, physical: physicalForm, legal: legalForm },
      // Валидность активной подформы (юрлицо/ИП/физлицо) — приходит событием
      // validity-change от подформы при каждом изменении её полей.
      childValid: false,
    }
  },
  methods: {
    canContinue: function(event){
      this.$emit('can-continue', {status: event.status});
    },
    onChildValidity(payload){
      // Все подформы живы под keep-alive и могут сообщать о себе; учитываем
      // только ту, что выбрана сейчас.
      if(payload.type !== this.payment) return;
      this.childValid = payload.valid;
      this.reportValidity();
    },
    reportValidity(){
      this.reportStepValidity('wizard-step-payment', Boolean(this.component) && this.childValid);
    },
  },
  watch: {
    payment: function (value) {
      this.component = this.components[value];
      // Тип плательщика коммитим сразу при выборе: от него зависит состав
      // шагов визарда (у физлица нет «Банка»), и шкала должна реагировать
      // без ожидания «Далее». Поля подформа перезапишет, когда станет
      // валидной (см. её reportValidity).
      if(value){
        this.$store?.commit?.('saveDataFormForStep', {payment: {type: value}});
      }
      // При смене типа валидность новой подформы ещё неизвестна — считаем шаг
      // невалидным, пока она не отчитается (mounted/activated).
      this.childValid = false;
      this.reportValidity();
    },
    clickedNext: function (status) {
      // Пока не выбран тип плательщика, дочерний компонент (legal/ip/physical) ещё
      // не смонтирован и некому обработать clickedNext — без этой ветки nextButton
      // в wizard.vue навсегда застревал в true, и «Далее» переставало работать
      // даже после выбора типа и заполнения формы.
      if(status === true && !this.component){
        sendNotifyError('Выберите тип плательщика');
        this.$emit('can-continue', {status: false});
      }
    },
  },
  mounted() {
    this.reportValidity();
  },
}
</script>