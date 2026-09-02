<template>
  <div>
    <ValidationProvider :rules="rules" :name="label || name"  mode="passive"  v-slot="{ errors}" ref="validator" >
      <div class="form-group" :class="{'has-error' : errors.length}">
        <label class="form-control-label" :class="{'form-control-label__required': rules && rules.includes('required')}">
          <b>{{ label }}</b>
        </label>
        <vue-simple-suggest
            v-model="chosen"
            :list="getSuggestionEmail"
            :debounce="100"
            @input="onInput"
            :styles='{defaultInput : "form-control"}'
            :placeholder="placeholder"
        ></vue-simple-suggest>
        <span class="form-control-error" v-for="error in errors">{{ error }}</span>
      </div>
    </ValidationProvider>
  </div>

</template>

<script>
import VueSimpleSuggest from 'vue-simple-suggest'
import 'vue-simple-suggest/dist/styles.css'

export default {
  name: "Suggestion",
  components: {
    VueSimpleSuggest
  },
  props: ['label','mode', 'rules','placeholder', 'method'],
  data() {
    return {
      chosen: '',
    }
  },
  methods: {
    onInput (e) {
      this.$emit("input", this.chosen);
    },
    async getSuggestionEmail() {
      const response = await this.$api.dadata.post('/suggest/email', {query: this.chosen});
      return response.data.suggestions.map((suggest) => suggest.value)
    }
  }
}
</script>