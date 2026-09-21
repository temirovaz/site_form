<template>
  <keep-alive>
    <modal name="selecting-program-for-listener" class="modal-selecting-program" :adaptive="true" height="auto"  @before-open="beforeOpen"  @before-close="beforeCLose">
    <div class="modal-header">
      <button type="button" data-dismiss="modal" aria-label="Close" class="close" @click="$modal.hide('selecting-program-for-listener')">
        <span aria-hidden="true">×</span>
      </button>
      <h4 class="modal-title">Добавление программы</h4>
    </div>
    <div class="modal-body">
      <NoteLine>Начните вводить наименование программы</NoteLine>
      <FormField mode="eager" label="Поиск программ" label-disable="" rules="" v-model="searchPrograms" ref="search"/>
      <div class="modal-programs-list">
        <template v-if="programs != null" v-for="program in programs">
          <div class="modal-programs-list__item">
            <div class="modal-programs-list__left">
              <span class="modal-programs-list__prefix">{{program.prefix}} ({{program.hours}}ч.)</span>
              <a :href="'/show-program-page.php?prefix=' + program.prefix" target="_blank">
                {{program.name}}
              </a>
            </div>
            <div class="modal-programs-list__right">
              <button v-if="!program.isSelectProgram()" class="btn btn-default btn-sm" @click="programService.selectProgram(program)">Выбрать </button>
              <button v-if="program.isSelectProgram()" class="btn btn-grey-outline btn-sm" @click="programService.unSelectProgram(program)">Удалить </button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </modal>
  </keep-alive>
</template>

<script>
import ProgramModel from "../../../../../model/ProgramModel";
import ProgramService from "../../../../../service/ProgramService";
import NoteLine from "../../../../note-line";

export default {
  name: 'selecting-program-for-listener-modal',
  components: {NoteLine},
  data: function (){
    return {
      programs: [],
      searchPrograms: '',
      programService: ProgramService,
    }
  },
  watch: {
    searchPrograms(value){
      this.programs = [];
      if(value){
        const programs = this.$store.state.programs.filter((program) => {
          return (program.name + program.prefix).toLowerCase().includes(value.toLowerCase());
        });
        this.programs =  programs.map(function (program) { return ProgramModel.fromObject(program); },programs)
      }
    }
  },
  methods:{
    isSelectProgram: function(programModal){
      return programModal.isSelectProgram();
    },
    beforeOpen: function () {
    //  window.jivo_api.open();
    },
    beforeCLose: function (){
      this.programs = [];
      this.searchPrograms = '';
      window.jivo_api.close();
    }

  },
  computed: {

  },

}
</script>