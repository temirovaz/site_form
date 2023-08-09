<template>
  <div class="wizard">
    <div ref="wizard-body" class="wizard__body">
      <div  class="wizard__body__step" v-if="!isFinish">
        <keep-alive>
          <component :is="component" @can-continue="proceedNext" @can-finish="proceedFinish"
                     :clickedFinish="clickedFinish" :clickedNext="nextButton"></component>
        </keep-alive>
      </div>
      <div class="wizard-finish-step" v-if="isFinish">
          <div class="wizard-finish-step__header">Спасибо. Ваша заявка принята</div>
      </div>
    </div>
    <div class="wizard-footer" v-if="!isFinish">
      <div class="wizard-footer__container">
        <button v-if="!isFirstStep" class="btn btn-default pull-left" @click="backClicked">Назад</button>
        <button v-if="!isLastStep" class="btn btn-default pull-right" @click="nextStep">Далее</button>
        <button v-if="isLastStep" class="btn btn-default pull-right" @click="saveForm">Отправить</button>
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
      steps: [],
      test: ''
    };
  },
  computed: {
    isFirstStep(){
      return !this.currentStep;
    },
    isLastStep(){
     return this.currentStep === this.steps.length - 1
    },
    component(){
      let steps = [
        {component: stepContacts},
        {component: stepPayment},
        {component: stepBank},
        {component: stepPrograms},
        {component: stemSummary},
      ];

      this.steps = steps;
      if(this.$store?.state?.form?.payment?.type === 'physical') {
        this.steps = steps.filter((value) => value.component.name !== 'wizard-step-bank');
      }
      return this.steps[this.currentStep].component
    }
  },

  methods: {
    proceedNext(event){
      if(event.status === true){
        this.currentStep++;
      }
      this.nextButton = false;
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
      this.currentStep--;
    },

    nextStep() {
      this.nextButton = true;
    },
    saveForm(){
      this.clickedFinish = true;
    }
  },
};
</script>