<template>
  <modal :name="modalName" class="modal-adding-exist-listener" :adaptive="true" height="auto" @before-open="beforeOpen" >
    <div class="modal-header">
      <button type="button" data-dismiss="modal" aria-label="Close" class="close" @click="$modal.hide(modalName)"><span aria-hidden="true">×</span></button>
      <h4 class="modal-title">Добавление слушателя</h4>

    </div>
    <div class="modal-body">
      <button type="button" class="btn btn-default btn-sm" @click="showFormAddNewListener">Добавить нового слушателя</button>
      <br>
      <br>
      <div class="modal-exist-listener-list">
        <template  v-for="listener in listeners">
          <div class="modal-exist-listener-list__item">
            <div class="modal-exist-listener-list__left">
              <span class="modal-exist-listener-list__prefix">{{ listener.surname }} {{ listener.name }} {{ listener.patronymic }}</span>
            </div>
            <div class="modal-exist-listener-list__right">
              <button v-if="!listener.selected" class="modal-exist-listener-list-button-select"  @click="selectListerForProgram(listener)">Выбрать</button>

              <div v-if="listener.selected" @click="unSelectListerForProgram(listener)" class="modal-exist-listener-list-button-unselect">
                <div class="modal-exist-listener-list-button-unselect__icon">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <ellipse cx="16.5" cy="16" rx="11.5" ry="9" fill="#881812"/>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M15.9999 0C24.8365 0 32 7.16328 32 15.9997C32 24.8365 24.8365 31.9997 15.9999 31.9997C7.16348 32 0 24.8365 0 15.9997C0 7.16328 7.16348 0 15.9999 0ZM8.8817 17.6245L8.87779 17.6208C8.67337 17.4339 8.56347 17.182 8.55071 16.9258C8.53795 16.6701 8.62233 16.4089 8.80696 16.2026C8.80956 16.1997 8.81191 16.1971 8.81451 16.1945C9.00123 15.9904 9.25305 15.8802 9.5093 15.8674C9.76685 15.8547 10.0296 15.9404 10.2364 16.1273L13.6103 19.1867L21.7063 10.7078C21.899 10.5057 22.155 10.4005 22.4144 10.3943C22.6727 10.3878 22.9337 10.4799 23.136 10.6721C23.3384 10.8646 23.4433 11.1214 23.4498 11.3802C23.4563 11.6388 23.3639 11.9003 23.1717 12.1023L14.3955 21.294C14.3895 21.3003 14.383 21.3063 14.3764 21.3115C14.1902 21.4977 13.947 21.5966 13.6999 21.6057C13.4462 21.6154 13.1887 21.5294 12.9853 21.3453L8.88482 17.6271L8.8817 17.6245Z" fill="#F3F3F3"/>
                  </svg>
                </div>
                <div class="modal-exist-listener-list-button-unselect__text">Отменить выбор</div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-default btn-sm" @click="saveListenersInProgram">Сохранить</button>
    </div>
  </modal>
</template>

<script>

import DaDataSuggestion from "../../../../dadata-suggestion";
import { mapGetters } from 'vuex'
import listenerService from "../../../../../service/ListenerService";
import programService from "../../../../../service/ProgramService";
import listenerModel from "../../../../../model/ListenerModel";
import ListenerService from "../../../../../service/ListenerService";
import ProgramService from "../../../../../service/ProgramService";
export default {
  name: 'adding-exist-listener-for-program',
  components: {DaDataSuggestion},
  data: function (){
    return {
      program: {},
      modalName: 'adding-exist-listener-for-program',
      listeners: [],
    }
  },
  computed: {
    ...mapGetters([
      'getSelectedPrograms'
    ]),
  },
  methods:{
    beforeOpen: function (event) {
      this.program = event.params.program

      this.listeners = listenerService.getUniqBySnilsListeners();
      this.listeners.map((listener) => {
        listener.selected = listenerService.hasListenerInProgram(this.program, listener);
      });

    },
    showFormAddNewListener: function (){
      this.$modal.show('adding-listener-for-program', {program: this.program})
      this.$modal.hide(this.modalName);
    },

    unSelectListerForProgram: function (listener){
      this.listeners = this.listeners.map((item, index) => {
        if(item.snils === listener.snils){
          item.selected = false;
        }
        return item;
      })
    },

    selectListerForProgram: function (listener){
        this.listeners = this.listeners.map((item, index) => {
          if(item.snils === listener.snils){
            item.selected = true;
          }
          return item;
        })
    },

    saveListenersInProgram: function (){

       this.listeners.forEach((listener) => {

          const model =  listenerModel.fromObject(listener);

          if(listener.selected){
            if(!ListenerService.hasListenerInProgram(this.program, model)){
              ProgramService.addListenerInProgram(this.program, model);
            }
          }else{
            programService.removeListenerWithProgram(this.program, model)
          }

        });
        this.$modal.hide(this.modalName);
    },


  }
}
</script>