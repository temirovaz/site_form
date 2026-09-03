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

    <template v-if="component">
      <keep-alive>
        <component v-bind:is="component" :clickedNext="clickedNext" @can-continue="canContinue"></component>
      </keep-alive>
    </template>
  </div>

</template>

<script>


import physicalForm from './payment-form/physical-form';
import IPForm from './payment-form/ip-form';
import legalForm from './payment-form/legal-form';
import {sendNotifyError} from '../../../plugins/toast';

export default {
  name: 'wizard-step-payment',
  components: {
    physicalForm,
    IPForm,
    legalForm
  },
  props: ['clickedNext'],
  data: function () {
    return {
      payment: '',
      component: null,
      components: { ip: IPForm, physical: physicalForm, legal: legalForm }
    }
  },
  methods: {
    canContinue: function(event){
      this.$emit('can-continue', {status: event.status});
    },

  },
  watch: {
    payment: function (value) {
      this.component = this.components[value]
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
}
</script>