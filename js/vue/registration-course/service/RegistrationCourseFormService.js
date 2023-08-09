import store from "./../plugins/store";
export default class RegistrationCourseFormService {
    static saveCommentInSummaryStep(comment){
        if(!comment) return;

        let formData = this.getSavedDataForm()
        formData.comment = comment
        this.updateFormDataInStore(formData);
    }

    static getSavedDataForm(){
        return store.getters.getFormData
    }

    static updateFormDataInStore(formData){
        console.log(formData);
        store.commit('updateFormData', formData);
    }
}