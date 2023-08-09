

<script>
export default {
  name: "FromInput",
  props: {
    value: {
      required: true,
    },
  },
  computed:{
    computedClass(){
      return {'form-control' : true}
    }
  },
  render: function (createElement) {
    const self = this
    return createElement('input', {
      domProps: {
        value: self.value,
        type: 'text',
      },
      class: this.computedClass,
      on: {
        input: function (event) {
          self.$emit('input', event.target.value)
        },
        change(event) {
          self.$emit('change', event.target.value);
        }
      },
      ref: 'input',
    })
  }
}
</script>

