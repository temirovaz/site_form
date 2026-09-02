<template>
  <div class="wizard">
    <div ref="wizard-body" class="wizard__body" >
      <div  class="wizard__body__step" v-if="!isFinish" :style="navigationLocked ? {pointerEvents: 'none', opacity: 0.6} : null">
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
    // Сразу после перехода между шагами первый клик по любому интерактивному
    // элементу (кнопки «Назад»/«Далее»/«Отправить», но также и обычные кнопки
    // внутри самого шага, например «Добавить программу») иногда не приводил ни
    // к какому эффекту — элемент оставался кликабельным, но действие не
    // происходило; срабатывал только повторный клик. Причина не в обработчике
    // клика конкретного элемента (проверено множеством способов — событие
    // доходит куда угодно, обработчик где угодно не срабатывает), а в том, что
    // сразу после смены шага какое-то время (порядка полусекунды-секунды)
    // взаимодействие с этой частью страницы ненадёжно. Поэтому на короткое
    // время после каждого перехода блокируется весь шаг целиком (pointer-events)
    // и кнопки футера (:disabled) — это гарантированно ловит "потерянный" клик
    // и не даёт его сделать, вместо того чтобы тот тихо пропал.
    lockNavigation(ms = 700) {
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