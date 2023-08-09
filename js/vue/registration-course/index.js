import Vue from 'vue'
import Axios from 'axios'



import store from "./plugins/store";
import "./plugins/vee-validate"
import "./plugins/toast"
import {api} from "./plugins/api";

// components
import FormField from "./components/form-field.vue"
import wizard from './components/wizard';
import VModal from 'vue-js-modal'


Vue.component('FormField', FormField)
Vue.component('Wizard', wizard);
Vue.use(VModal, {dynamic: true, injectModalsContainer: true})

Vue.prototype.$http = Axios;
Vue.prototype.$api = api;



new Vue({
    store: store,
}).$mount('#app')