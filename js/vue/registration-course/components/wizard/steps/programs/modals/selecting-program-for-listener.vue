<template>
  <keep-alive>
    <modal name="selecting-program-for-listener" class="programs-model"  @before-open="beforeOpen"  width="50%" height="auto" @before-close="beforeCLose">
    <div class="modal-header">
      <button type="button" data-dismiss="modal" aria-label="Close" class="close" @click="$modal.hide('selecting-program-for-listener')">
        <span aria-hidden="true">×</span>
      </button>
      <h4 class="modal-title">Добавление программы</h4>
    </div>
    <div class="modal-body">
      <div class="note-line">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0_1_281)">
              <rect x="10" y="5" width="12" height="21" fill="#881812"/>
              <path d="M16 32C20.2435 32 24.3131 30.3143 27.3137 27.3137C30.3143 24.3131 32 20.2435 32 16C32 11.7565 30.3143 7.68687 27.3137 4.68629C24.3131 1.68571 20.2435 0 16 0C11.7565 0 7.68687 1.68571 4.68629 4.68629C1.68571 7.68687 0 11.7565 0 16C0 20.2435 1.68571 24.3131 4.68629 27.3137C7.68687 30.3143 11.7565 32 16 32ZM17.86 13.176L15.86 22.586C15.72 23.266 15.918 23.652 16.468 23.652C16.856 23.652 17.442 23.512 17.84 23.16L17.664 23.992C17.09 24.684 15.824 25.188 14.734 25.188C13.328 25.188 12.73 24.344 13.118 22.55L14.594 15.614C14.722 15.028 14.606 14.816 14.02 14.674L13.118 14.512L13.282 13.75L17.86 13.176ZM16 11C15.4696 11 14.9609 10.7893 14.5858 10.4142C14.2107 10.0391 14 9.53043 14 9C14 8.46957 14.2107 7.96086 14.5858 7.58579C14.9609 7.21071 15.4696 7 16 7C16.5304 7 17.0391 7.21071 17.4142 7.58579C17.7893 7.96086 18 8.46957 18 9C18 9.53043 17.7893 10.0391 17.4142 10.4142C17.0391 10.7893 16.5304 11 16 11Z" fill="#F3F3F3"/>
            </g>
            <defs>
              <clipPath id="clip0_1_281">
                <rect width="32" height="32" fill="white"/>
              </clipPath>
            </defs>
          </svg>
          <div class="note-line__text">
            <small>Начните вводить наименование программы</small>
          </div>
      </div>
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

export default {
  name: 'selecting-program-for-listener-modal',
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
      window.jivo_api.open();
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