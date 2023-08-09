import Vue from 'vue';
import VueToast from 'vue-toast-notification';
import 'vue-toast-notification/dist/theme-default.css';

Vue.use(VueToast);

export default class NotifyService {

    static sendError(message, config = {}){
        Vue.$toast.open({
            message: message,
            type: 'error',
            position: 'bottom-right',
            // duration: 5000
        });
    }
}