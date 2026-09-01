<template>
  <div class="wizard">
    <div ref="wizard-body" class="wizard__body" >
      <div  class="wizard__body__step" v-if="!isFinish">
        <keep-alive>
          <component :is="component" @can-continue="proceedNext" @can-finish="proceedFinish" :clickedFinish="clickedFinish" :clickedNext="nextButton"></component>
        </keep-alive>
      </div>
      <div class="wizard-finish-step" v-if="isFinish">
          <div class="wizard-finish-step__header">Спасибо. Ваша заявка принята</div>
      </div>
    </div>
    <div class="wizard-footer" v-if="!isFinish">
      <div class="wizard-footer__container">
        <button key="back" v-if="!isFirstStep" class="btn btn-default pull-left" :disabled="navigationLocked" @click="backClicked">Назад</button>
        <button key="next" v-if="!isLastStep" class="btn btn-default pull-right" :disabled="navigationLocked" @click="nextStep">Далее</button>
        <button key="submit" v-if="isLastStep" class="btn btn-default pull-right" :disabled="navigationLocked" @click="saveForm">Отправить</button>
      </div>
    </div>
  </div>
</template>
<script>
import stepContacts from './wizard/steps/contacts';
import stepPayment from './wizard/steps/payment-form';
import stepPrograms from './wizard/steps/programs';
import stepBank from './wizard/steps/bank';
import stemSummary from './wizard/steps/summary';
import  {sendNotifyError} from '../plugins/toast';
import ApiLikeyService from "../service/api/ApiLikeyService";

export default {
  name: 'Wizard',

  data () {
    return {
      nextButton: false,
      clickedFinish: false,
      currentStep: 0,
      isFinish: false,
      navigationLocked: false,
      test: ''
    };
  },
  computed: {
    steps(){
      const steps = [
        {component: stepContacts},
        {component: stepPayment},
        {component: stepBank},
        {component: stepPrograms},
        {component: stemSummary},
      ];

      if(this.$store?.state?.form?.payment?.type === 'physical') {
        return steps.filter((value) => value.component.name !== 'wizard-step-bank');
      }
      return steps;
    },
    isFirstStep(){
      return !this.currentStep;
    },
    isLastStep(){
     return this.currentStep === this.steps.length - 1
    },
    component(){
      return this.steps[this.currentStep].component
    }
  },

  beforeDestroy() {
    clearTimeout(this._navigationLockTimer);
  },

  methods: {
    // При переходе между шагами (особенно сразу после закрытия модалки выбора
    // программы) первый клик по «Назад»/«Далее»/«Отправить» иногда не приводил
    // ни к какому эффекту — кнопка оставалась кликабельной, но действие не
    // происходило; только повторный клик срабатывал. Причина не в обработчике
    // клика конкретной кнопки (проверено множеством способов — событие доходит
    // куда угодно, обработчик где угодно не срабатывает), а в том, что сразу
    // после смены шага какое-то время (порядка полусекунды) взаимодействие
    // ненадёжно. Поэтому на короткое время после каждого перехода кнопки
    // навигации явно блокируются (:disabled) — это гарантированно ловит
    // "потерянный" клик и не даёт его сделать, вместо того чтобы тот тихо пропал.
    lockNavigation(ms = 600) {
      this.navigationLocked = true;
      clearTimeout(this._navigationLockTimer);
      this._navigationLockTimer = setTimeout(() => {
        this.navigationLocked = false;
      }, ms);
    },

    proceedNext(event){
      if(event.status === true){
        this.currentStep++;
        this.lockNavigation();
      }
      this.nextButton = false;
      this.$nextTick(() => {
        this.$refs["wizard-body"].scrollIntoView({ behavior: 'auto' });
      });
    },

    proceedFinish(event){

      if(event.status === true){
        ApiLikeyService.sendFormForSaveTo1C().then((response) => {
          this.isFinish = true;
        });
      }
      this.clickedFinish = false;
    },

    backClicked(){
      if(this.navigationLocked) return;
      this.currentStep--;
      this.lockNavigation();
    },

    nextStep() {
      if(this.navigationLocked) return;
      this.nextButton = true;
    },
    saveForm(){
      if(this.navigationLocked) return;
      this.clickedFinish = true;
    }
  },
};
</script>
