<script>
export default {
  props: [],
  name: "form-input",
  created() {
    if (this.value) {
      this.localValue = this.value;
    }
  },
  watch: {
    localValue(value) {
      this.$emit("input", value);
    },
  },
  render: function (createElement) {
    var self = this
    return createElement('input', {
      domProps: {
        value: self.value
      },
      on: {
        input: function (event) {
          self.$emit('input', event.target.value)
        }
      }
    })
  }
}
</script>