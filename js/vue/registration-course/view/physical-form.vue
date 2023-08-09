<template>
  <div>
    <div class="payer-form-group" id="passport">
      <div class="payer-form-group__note"><h2>Ваши паспортные данные</h2></div>
      <div class="row" v-if="physical.mode !== 'view'">
        <div class="col-md-12">
          <TextInput ref="snils"  label="СНИЛС" rules="required" v-model="physical.form.snils" @input="snilsChangeHandle"/>
        </div>
      </div>
      <template v-if="physical.mode === 'edit'">
        <div class="row">
          <div class="col-md-4">
            <TextInput label="Фамилия" rules="required" v-model="physical.form.surname" />
          </div>
          <div class="col-md-4">
            <TextInput label="Имя" rules="required" v-model="physical.form.name"/>
          </div>
          <div class="col-md-4">
            <TextInput label="Отчество" rules="required" v-model="physical.form.patronymic"/>
          </div>
        </div>
        <div class="row">
          <div class="col-md-3">
            <TextInput label="Серия" rules="required" v-model="physical.form.passport_series"/>
          </div>
          <div class="col-md-3">
            <TextInput label="Номер" rules="required" v-model="physical.form.passport_number"/>
          </div>
          <div class="col-md-3">
            <TextInput label="Дата выдачи" rules="required" v-model="physical.form.passport_date_of_issue"/>
          </div>
          <div class="col-md-3">
            <TextInput label="Код подразделения" rules="required" v-model="physical.form.passport_division"/>
          </div>
        </div>
        <div class="row">
          <div class="col-md-12">
            <TextInput label="Выдан" rules="required" v-model="physical.form.passport_issued"/>
          </div>
          <div class="col-md-12">
            <TextInput label="Место рождения" rules="required" v-model="physical.form.passport_place_of_birth"/>
          </div>
          <div class="col-md-12">
            <TextInput label="Регистрация" rules="required" v-model="physical.form.registration"/>
          </div>
        </div>
        <div class="row">
            <div class="col-md-10">
              <TextInput name="physical.form.post" label="Почтовый адрес" rules="required"
                                         :control-disabled="postAddressAsRegistration"
                                         v-model="physical.form.post"/>
            </div>
            <div class="col-md-2">
              <div >
                <div class="" style="padding: 42px 0 0 0;">
                  <label>
                    <input type="checkbox" v-model="postAddressAsRegistration"> Как регистрация
                  </label>
                </div>
              </div>

            </div>
        </div>
        <div class="">
          <button class="btn btn-default btn-lg" @click="changeModeForm('view')">Сохранить</button>
        </div>
      </template>
      <template v-if="physical.mode === 'view'">
        <div class="passport-card">
          <div class="passport-card__button-edit" @click="changeModeForm('edit')">
            <svg width="15" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#0b82f7" d="M373.1 24.97C401.2-3.147 446.8-3.147 474.9 24.97L487 37.09C515.1 65.21 515.1 110.8 487 138.9L289.8 336.2C281.1 344.8 270.4 351.1 258.6 354.5L158.6 383.1C150.2 385.5 141.2 383.1 135 376.1C128.9 370.8 126.5 361.8 128.9 353.4L157.5 253.4C160.9 241.6 167.2 230.9 175.8 222.2L373.1 24.97zM440.1 58.91C431.6 49.54 416.4 49.54 407 58.91L377.9 88L424 134.1L453.1 104.1C462.5 95.6 462.5 80.4 453.1 71.03L440.1 58.91zM203.7 266.6L186.9 325.1L245.4 308.3C249.4 307.2 252.9 305.1 255.8 302.2L390.1 168L344 121.9L209.8 256.2C206.9 259.1 204.8 262.6 203.7 266.6zM200 64C213.3 64 224 74.75 224 88C224 101.3 213.3 112 200 112H88C65.91 112 48 129.9 48 152V424C48 446.1 65.91 464 88 464H360C382.1 464 400 446.1 400 424V312C400 298.7 410.7 288 424 288C437.3 288 448 298.7 448 312V424C448 472.6 408.6 512 360 512H88C39.4 512 0 472.6 0 424V152C0 103.4 39.4 64 88 64H200z"/></svg>
          </div>
          <div class="passport-card__row">
            <div class="passport-card__item">
              <div class="passport-card-item__name">СНИЛС:</div>
              <div class="passport-card-item__value">{{physical.form.snils}}</div>
            </div>
          </div>
          <div class="passport-card__row">
              <div class="passport-card__item">
                <div class="passport-card-item__name">Фамилия:</div>
                <div class="passport-card-item__value">{{physical.form.surname}}</div>
              </div>
              <div class="passport-card__item">
                <div class="passport-card-item__name">Имя:</div>
                <div class="passport-card-item__value">{{physical.form.name}}</div>
              </div>
              <div class="passport-card__item">
                <div class="passport-card-item__name">Фамилия:</div>
                <div class="passport-card-item__value">{{physical.form.patronymic}}</div>
              </div>
            </div>
          <div class="passport-card__row">
            <div class="passport-card__item">
              <div class="passport-card-item__name">Серия:</div>
              <div class="passport-card-item__value">{{physical.form.passport_series}}</div>
            </div>
            <div class="passport-card__item">
              <div class="passport-card-item__name">Номер:</div>
              <div class="passport-card-item__value">{{physical.form.passport_number}}</div>
            </div>
            <div class="passport-card__item">
              <div class="passport-card-item__name">Дата выдачи:</div>
              <div class="passport-card-item__value">{{physical.form.passport_date_of_issue}}</div>
            </div>
            <div class="passport-card__item">
              <div class="passport-card-item__name">Код подразделения:</div>
              <div class="passport-card-item__value">{{physical.form.passport_division}}</div>
            </div>
          </div>
          <div class="passport-card__row">
            <div class="passport-card__item">
              <div class="passport-card-item__name">Выдан:</div>
              <div class="passport-card-item__value">{{physical.form.passport_issued}}</div>
            </div>
          </div>
          <div class="passport-card__row">
            <div class="passport-card__item">
              <div class="passport-card-item__name">Место рождения:</div>
              <div class="passport-card-item__value">{{physical.form.passport_place_of_birth}}</div>
            </div>
          </div>
          <div class="passport-card__row">
            <div class="passport-card__item">
              <div class="passport-card-item__name">Регистрация:</div>
              <div class="passport-card-item__value">{{physical.form.registration}}</div>
            </div>
          </div>
          <div class="passport-card__row">
            <div class="passport-card__item">
              <div class="passport-card-item__name">Почтовый адрес:</div>
              <div class="passport-card-item__value">{{physical.form.post || physical.form.registration}}</div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>

</template>

<script>

import { withValidation } from 'vee-validate';
import { mapFields } from 'vuex-map-fields';
//const TextInput = withValidation(TextField);

export default {
  name: 'c-physical-form',
  components: {},

  data: function () {
    return {
      postAddressAsRegistration: false, //попробовать перенести в store
    }
  },
  methods: {
    changeModeForm: function(mode = 'edit'){
      this.physical.mode = mode;
    },

    async snilsChangeHandle(e) {
    //  const { valid } = await this.$refs.snils.validate(e);
      const valid = true;
      if (valid) {
        this.$store.dispatch('getUserDataBySNILS').then( (response) => {})
      }
    },

  },
  computed: {
    ...mapFields(['physical']),
  },

  beforeCreate(){},
  mounted() {},
  created() {
    this.$store.dispatch('getUserDataBySNILS').then(
        (response) => {

        }
    )
  },
  beforeDestroy() {},
  destroyed() {}
}
</script>
<style>
.form-control[disabled]{
  background-color: #eee;
  opacity: 1;
}
</style>