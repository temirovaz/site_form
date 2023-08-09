<template>
  <ValidationProvider :rules="rules" :name="label || name"  :mode="mode || 'lazy'"  v-slot="{ errors}" ref="validator" >
    <div class="form-group form-control-spinner" :class="{'has-error' : errors.length}">
      <img v-if="isLoading" class="form-control-spinner__svg" height="9" src="/local/templates/aspro-allcorp2/images/svg/spinner-input-red.svg">
      <template v-if="!labelDisabled">
        <label @click="$refs.input.$el.focus()" class="form-control-label" :class="{'form-control-label__required': rules}">
          <b>{{ label }}</b>
        </label>
      </template>
      <template v-if="name === 'phone'">
        <FormInput  ref="input" v-mask="'+7 (###)-###-##-##'" :placeholder="placeholderComputed" :value="value" v-model="localValue"></FormInput>
      </template>
      <template v-else-if="tag === 'textarea'">
        <FromTextarea ref="input" :placeholder="placeholderComputed"  :value="value" :disabled="disabled" v-model="localValue"></FromTextarea>
      </template>
      <template v-else>
            <FormInput ref="input" :placeholder="placeholderComputed" :disabled="disabled" v-model="localValue" :type="type" v-on="$listeners" :max="max"  ></FormInput>
      </template>
        <span class="form-control-error" v-for="error in errors">{{ error }}</span>
      </div>
    </ValidationProvider>
  </template>

  <script>
  import FormInput from "./form/form-input";
  import FromTextarea from "./form/form-textaria";
  import {mask} from 'vue-the-mask'


  export default {
    components: {FromTextarea, FormInput},
    props: [
      'label', 'errors', 'value', 'disabled',  'rules', 'tag',
      'name', 'labelDisabled', 'isLoading', 'type', 'placeholder', 'max', 'mode'
    ],
    name: "FormField",
    data () {
      return {
        localValue: ""
      }
    },
    computed: {
      placeholderComputed: function(){
        return this.placeholder || this.label;
      }
    },

    watch: {
      localValue(value) {
        this.$emit("input", value);
      },
      value(value) {
        if (value !== this.localValue) {
           this.localValue = value;
        }
      }
    },
    created() {
      if (this.value) {
        this.localValue = this.value;
      }
    },
    directives: {mask}
  }
  </script>