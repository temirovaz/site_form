export default {
    props: {
        disabled: Boolean,
        type: String,
        value: {}
    },
    render (createElement) {
        return createElement('input', {
            staticClass: 'form-control',
            attrs: {
                disabled: this.disabled,
                type: this.type || 'text'
            },
            domProps: {
                value: this.value
            },
            on: {
                ...this.$listeners,
                input: (e) =>  this.$emit('input', e.target.value, e, this),
                change: (e) => this.$emit('change', e.target.value, e),
            },
            ref: 'input',
        })
    }
}