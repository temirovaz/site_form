export default {
    props: {
        disabled: Boolean,
        value: {},
    },
    render (createElement) {
        return createElement('textarea', {
            staticClass: 'form-control',
            attrs: {
                disabled: this.disabled,
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