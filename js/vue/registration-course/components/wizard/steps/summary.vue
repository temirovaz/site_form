<template>
  <div class="summary-step">
    <div class="summary-step__header">Проверьте данные перед отправкой  заявки</div>
    <div class="summary-step-info">
      <div class="summary-step-info__item">
        <div class="summary-step-info__name">Заказчик:</div>
        <div class="summary-step-info__value">{{customerFormatName}}</div>
      </div>
      <div class="summary-step-info__item" v-if="isCustomerLegal">
        <div class="summary-step-info__name">ИНН:</div>
        <div class="summary-step-info__value">{{customerINN}}</div>
      </div>
      <div class="summary-step-info__item" v-if="isCustomerLegal">
        <div class="summary-step-info__name">КПП:</div>
        <div class="summary-step-info__value">{{customerKPP || '-'}}</div>
      </div>
      <div class="summary-step-info__item">
        <div class="summary-step-info__name">Телефон:</div>
        <div class="summary-step-info__value">{{customerPhone}}</div>
      </div>
      <div class="summary-step-info__item">
        <div class="summary-step-info__name">Почта:</div>
        <div class="summary-step-info__value">{{customerEmail}}</div>
      </div>
    </div>

<!--    <h2 class="summary-step__header">Выбранные программы</h2>-->
    <template  v-for="(program, index) in selectedPrograms">
      <table class="summary-step-table">
       <tr>
          <td class="summary-step-table__program-name">
            {{ program.name }}
          </td>
        </tr>
        <tr>
          <td colspan="4">
            <table class="summary-step-table-listener">
              <tr>
<!--                <th>
                  №
                </th>
                <th>
                  Слушатели
                </th>-->
              </tr>
              <template v-for="(listener, index) in program.listeners" >
                <tr>
<!--                  <td style="width:35px">{{index + 1}}</td>-->
                  <td>{{ listener.surname }} {{ listener.name }} {{ listener.patronymic }}</td>
                </tr>
              </template>
            </table>
          </td>
        </tr>
      </table>
    </template>
    <div class="row">
      <div class="col-md-12">
        <FormField name="comment" label="Комментарий" v-model.trim="comment" tag="textarea"/>
      </div>
    </div>
  </div>

</template>

<script>
import ProgramService from "../../../service/ProgramService";
import CustomerModel from "../../../model/CustomerModel";
import RegistrationCourseFormService from "../../../service/RegistrationCourseFormService";

export default {
  name: "wizard-save-form",
  data () {
    return {
      customer: {},
      comment: '',
    }
  },
  props: ['clickedFinish'],

  watch: {
    clickedFinish: function(status) {
      if(status === true){
        RegistrationCourseFormService.saveCommentInSummaryStep(this.comment);
        this.$emit('can-finish', {status: true})
      }
    }
  },
  computed: {
    selectedPrograms(){
      return ProgramService.getSelectedProgram()
    },
    customerFormatName(){
      return this.customer.getCustomerFormatName();
    },
    customerINN(){
      return this.customer.getCustomerINN()
    },
    customerKPP(){
      return this.customer.getCustomerKPP()
    },
    isCustomerLegal(){
      return this.customer.isCustomerLegal();
    },
    customerPhone(){
      return this.customer.contactPhone;
    },
    customerEmail(){
      return this.customer.contactEmail;
    }
  },
  created() {
     this.customer = CustomerModel.fromStore(this.$store.state.form);
  },
  activated() {
     this.customer = CustomerModel.fromStore(this.$store.state.form);
  },
}
</script>

<style scoped>

</style>