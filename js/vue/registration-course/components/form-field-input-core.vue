<template>

    <label @click="$refs.input.focus()" class="form-control-label" :class="{'form-control-label__required': rules}">
      <b>{{ label }}</b>
    </label>
  <input
      ref="input" :type="typeControl" :max="max"
      class="form-control" :disabled="disabled" @keyup="keyUpEvent" v-model="innerValue" :name="name"
      :placeholder="isLoading ? '' : placeholder || label"/>
</template>

<script>
export default {
  props: [
      'label', 'errors', 'value', 'disabled', 'type', 'rules', 'mode',
      'name', 'labelDisabled', 'dataRef', 'isLoading', 'type', 'placeholder', 'max'
  ],
  name: "ControlInput",
  data () {
    return {
      innerValue: ""
    }
  },
  computed: {
    modeControl: function () {
      return this.mode || 'lazy';
    },
    typeControl: function () {
      return this.type || 'text';
    }
  },
  watch: {
    innerValue(value) {
      this.$emit("input", value);
    },
    value(val) {
      if (val !== this.innerValue) {
        this.innerValue = val;
      }
    }
  },
  methods: {
    keyUpEvent(event) {
      this.$emit("keyup", event);
    },
  },
  created() {
    if (this.value) {
      this.innerValue = this.value;
    }
    this.$nextTick(function () {
      if (this.name === 'phone'){
        this.$imask(this.$refs.input, {
          mask: '+{7}(000)000-00-00', lazy: false
        });
      }
    })

  }
}
</script>