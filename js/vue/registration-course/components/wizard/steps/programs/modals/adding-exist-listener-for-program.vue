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

              <button v-if="listener.selected" class="modal-exist-listener-list-button-unselect" @click="unSelectListerForProgram(listener)">Отменить выбор</button>
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