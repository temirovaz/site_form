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
          <div class="wizard-finish-step__description">Мы уже начали работу на ней. После назначения ответственного, вам на электронную почту <b>{{ contactEmail }}</b> поступит уведомление.</div>
      </div>
    </div>
    <div class="wizard-footer" v-if="!isFinish">
      <div class="wizard-footer__container" :style="navigationLocked ? {opacity: 0.6} : null">
        <button key="back" v-if="!isFirstStep" class="btn btn-default pull-left" @click="backClicked">Назад</button>
        <button key="next" v-if="!isLastStep" class="btn btn-default pull-right" @click="nextStep">Далее</button>
        <button key="submit" v-if="isLastStep" class="btn btn-default pull-right" :disabled="submitInProgress" @click="saveForm">Отправить</button>
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
      pendingAction: null,
      submitInProgress: false,
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
    },
    contactEmail(){
      return this.$store?.state?.form?.contact?.email || '';
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
    // взаимодействие с этой частью страницы ненадёжно. На это время блокируется
    // весь шаг целиком (pointer-events) — там нет способа "запомнить" клик.
    // Кнопки футера устроены иначе: они остаются кликабельными (только визуально
    // притушены), а их обработчики (см. backClicked/nextStep/saveForm) при
    // клике во время блокировки не игнорируют его, а откладывают действие и
    // выполняют его сами, как только блокировка снимается — так что реальному
    // пользователю достаточно одного клика, даже если он попал в это окно.
    lockNavigation(ms = 700) {
      this.navigationLocked = true;
      clearTimeout(this._navigationLockTimer);
      this._navigationLockTimer = setTimeout(() => {
        this.navigationLocked = false;
        if(this.pendingAction){
          const action = this.pendingAction;
          this.pendingAction = null;
          action();
        }
      }, ms);
    },

    proceedNext(event){
      // Защита от повторного/устаревшего can-continue: при быстром переходе
      // назад watcher на clickedNext у деактивированного (keep-alive) шага может
      // "доиграть" отложенное срабатывание при повторной активации компонента —
      // со старым значением true, уже после того как nextButton был сброшен в
      // false. Без этой проверки currentStep увеличивался сам по себе сразу
      // после перехода назад, выглядя как "проглоченный" клик по «Назад».
      if(!this.nextButton) return;
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
      if(!this.clickedFinish) return;
      // Пока идёт запрос в 1С, повторный клик по «Отправить» не должен запускать
      // второй sendFormForSaveTo1C(): clickedFinish сбрасывается ниже сразу же,
      // не дожидаясь ответа сети, — без submitInProgress второй клик успевал бы
      // пройти false→true ещё раз и отправить заявку дублем.
      if(event.status === true && !this.submitInProgress){
        this.submitInProgress = true;
        ApiLikeyService.sendFormForSaveTo1C()
          .then(() => {
            this.isFinish = true;
          })
          .catch(() => {
            sendNotifyError('Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз.');
          })
          .finally(() => {
            this.submitInProgress = false;
          });
      }
      this.clickedFinish = false;
    },

    backClicked(){
      if(this.navigationLocked){ this.pendingAction = () => this.backClicked(); return; }
      this.currentStep--;
      this.lockNavigation();
    },

    nextStep() {
      if(this.navigationLocked){ this.pendingAction = () => this.nextStep(); return; }
      this.nextButton = true;
    },
    saveForm(){
      // submitInProgress не задерживает клик через pendingAction, как navigationLocked:
      // пока первый запрос к 1С не завершился, повторный клик просто игнорируется —
      // ставить его в очередь и отправлять форму второй раз, как только придёт первый
      // ответ, не нужно.
      if(this.submitInProgress) return;
      if(this.navigationLocked){ this.pendingAction = () => this.saveForm(); return; }
      this.clickedFinish = true;
    }
  },
};
</script>