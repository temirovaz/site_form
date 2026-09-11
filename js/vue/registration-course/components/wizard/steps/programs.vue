<template>
  <div>
    <div class="programs-form">
      <h2>Пожалуйста, добавьте программы обучения и слушателей.</h2>
    </div>
    <button class="btn btn-default" :class="{'-animation' : !$store.getters.getSelectedPrograms.length }" @click="$modal.show('selecting-program-for-listener')">Добавить программу</button>
    <br>
    <br>
    <template  v-for="(program, index) in $store.getters.getSelectedPrograms" >
      <div class="table-responsive">
        <table class="programs-table">
          <tr>
            <td colspan="4" class="programs-table__header">Программа №{{index + 1}}</td>
          </tr>
          <tr>
            <td class="programs-table__td">
              <div class="programs-table__label">Наименование</div>
              <div class="programs-table__name"><a class="programs-table__link" :href="'/show-program-page.php?prefix=' + program.prefix" target="_blank">{{ program.name }}</a></div>
            </td>
            <td class="programs-table__td">
              <div class="programs-table__label">Выдаваемый документ</div>
              Свидетельство о профессии рабочего, должности служащего
            </td>
            <td class="programs-table__td">
              <div class="programs-table__label">Кол-во часов</div>
              {{ program.hours }}
            </td>
            <td>
              <div class="programs-table-options">
                <button class="button-icon -remove" @click="unSelectedProgramForUser(program)">
                  <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.5002 1.91693V1.0836C5.5002 0.853483 5.68677 0.666931 5.91687 0.666931H10.0827C10.3128 0.666931 10.4994 0.853483 10.4994 1.0836V1.91693C10.4994 2.14705 10.3128 2.3336 10.0827 2.3336H5.91687C5.68677 2.3336 5.5002 2.14705 5.5002 1.91693Z" fill="white"/>
                    <path d="M5.91667 6.50001H6.75C6.9801 6.50001 7.16667 6.68655 7.16667 6.91668V13.5833C7.16667 13.8135 6.9801 14 6.75 14H5.91667C5.68656 14 5.5 13.8135 5.5 13.5833V6.91668C5.5 6.68655 5.68656 6.50001 5.91667 6.50001Z" fill="white"/>
                    <path d="M10.0833 6.50001H9.25C9.0199 6.50001 8.83333 6.68655 8.83333 6.91668V13.5833C8.83333 13.8135 9.0199 14 9.25 14H10.0833C10.3134 14 10.5 13.8135 10.5 13.5833V6.91668C10.5 6.68655 10.3134 6.50001 10.0833 6.50001Z" fill="white"/>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M15.0833 4.83334H13.8333L13.4435 16.5278C13.4286 16.9769 13.0601 17.3333 12.6107 17.3333H3.3893C2.93988 17.3333 2.57143 16.9769 2.55648 16.5278L2.16667 4.83334H0.916667C0.686564 4.83334 0.5 4.64679 0.5 4.41668V3.58334C0.5 3.35323 0.686564 3.16668 0.916667 3.16668H15.0833C15.3134 3.16668 15.5 3.35323 15.5 3.58334V4.41668C15.5 4.64679 15.3134 4.83334 15.0833 4.83334ZM12.1667 4.83334H3.83333L4.25 15.6667H11.75L12.1667 4.83334Z" fill="white"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
          <tr>
            <td colspan="4">
              <table class="listener-table">
                <tr>
                  <th style="width: 35px">
                    №
                  </th>
                  <th>
                    Слушатель
                  </th>
                  <th colspan="2"></th>
                </tr>
                <template v-for="(listener, index) in program.listeners" >
                  <tr>
                    <td>{{ index + 1 }}</td>
                    <td>{{ listener.surname }} {{ listener.name }} {{ listener.patronymic }}</td>
                    <td class="-text-end">
                      <button class="button-text -remove" @click="showModalForEditListener(program, listener)">
                        <small>редактировать</small>
                      </button> /
                      <button class="button-text -remove" @click="removeListenerFromProgram({program: program, listener: listener})">
                        <small>удалить</small>
                      </button>
                    </td>
                  </tr>
                </template>
                <tr>
                  <td colspan="2" class="-disable-border -background-transparent">

                    <button  class="btn btn-default btn-xs" @click="showAddListerModal(program)">Добавить слушателя</button>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>

    </template>

    <selecting-program-for-listener-modal></selecting-program-for-listener-modal>
    <adding-listener-in-program-modal></adding-listener-in-program-modal>
    <adding-exist-listener-for-program-modal></adding-exist-listener-for-program-modal>
    <listener-for-program-update></listener-for-program-update>
  </div>
</template>

<script>

import { mapFields } from 'vuex-map-fields';
import selectingProgramForListenerModal from './programs/modals/selecting-program-for-listener';
import addingListenerInProgramModal from './programs/modals/adding-listener-for-program';
import addingExistListenerForProgramModal from './programs/modals/adding-exist-listener-for-program';
import listenerForProgramUpdate from './programs/modals/listener-for-program-update';
import { mapGetters } from 'vuex'
import ListenerService from '../../../service/ListenerService';
import ListenerModel from "../../../model/ListenerModel";
import ProgramService from "../../../service/ProgramService";
import {sendNotifyError} from "../../../plugins/toast";



export default {
  name: 'wizard-step-programs',
  components: {
    selectingProgramForListenerModal,
    addingListenerInProgramModal,
    addingExistListenerForProgramModal,
    listenerForProgramUpdate
  },
  props: ['clickedNext'],
  data: function () {
    return {
      modal:{
        listener: false,
        program: false,
      },

    }
  },
  methods: {

    unSelectedProgramForUser: function(program){
      this.$store.commit('unSelectedProgramForUser', program);
    },
    removeListenerFromProgram: function(payload){
      this.$store.commit('removeListenerFromProgram', payload);
    },

    showModalForEditListener: function (program, listener){
      this.$modal.show('listener-for-program-update', {program: program, listener: new ListenerModel(listener)})
    },

    showAddListerModal: function (program, listener){
      const listeners = ListenerService.getUniqBySnilsListeners();
      const modal = listeners.length && listener === undefined ? 'adding-exist-listener-for-program' : 'adding-listener-for-program';
      this.$modal.show(modal, {program: program, listener: new ListenerModel(listener)})
    },
  },
  computed: {
    ...mapFields(['programs']),
    ...mapGetters([
       'getSelectedPrograms'
    ]),

  },
  watch: {
    clickedNext: function(status) {

      let canContinue = true;
      if(ProgramService.getSelectedProgram().length === 0){
        sendNotifyError('Не выбрана учебная программа')
        canContinue = false;
      }
      ProgramService.getSelectedProgram().forEach((program) => {
        if(!program.listeners?.length){
          sendNotifyError(`Для программы: "${program.name}", необходимо добавить хотя бы одного слушателя`);
          canContinue = false;
        }
      });

      this.$emit('can-continue', {status: canContinue})

    }
  },
  created() {
    this.$store.dispatch('loadPrograms');
  },
}
</script>