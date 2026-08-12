export default class ListenerModel {
    constructor (data = {}) {
        this.name = '';
        this.surname = '';
        this.date_of_birth =  '';
        this.email =  '';
        this.patronymic = '';
        this.phone = '';
        this.post = '';
        this.snils = '';
        this.passport_series = '';
        this.passport_number = '';
        this.passport_date_of_issue = '';
        this.passport_division = '';
        this.passport_issued = '';
        this.passport_place_of_birth = '';
        this.registration = '';
        this.isLoadedDataFrom1C = false;
        this.fieldsCanBeEdited = [
            'post'
        ];

        for (const property in data) {
            if(this.hasOwnProperty(property)){
                this[property] = data[property]
            }
        }
    }

    getFieldsWhichCanBeEdited(){
        return this.fieldsCanBeEdited;
    }

    canBeEditedField(field){
        return this.getFieldsWhichCanBeEdited().includes(field);
    }

    toStore(){
        return {
            date_of_birth: this.date_of_birth,
            email: this.email,
            name: this.name,
            patronymic: this.patronymic,
            phone: this.phone,
            post: this.post,
            snils: this.snils,
            surname: this.surname,
            passport_series: this.passport_series,
            passport_number: this.passport_number,
            passport_date_of_issue: this.passport_date_of_issue,
            passport_division: this.passport_division,
            passport_issued: this.passport_issued,
            passport_place_of_birth: this.passport_place_of_birth,
            registration: this.registration
        }
    }

    static fromObject(data)
    {

        const attributes = {
            name: data.name,
            surname: data.surname,
            date_of_birth: data.date_of_birth || data.passport_date_of_birth,
            email:  data.email,
            patronymic : data.patronymic ,
            phone : data.phone ,
            post : data.post || data.position,
            snils : data.snils,
            passport_series : data.passport_series || '',
            passport_number : data.passport_number || '',
            passport_date_of_issue : data.passport_date_of_issue || '',
            passport_division : data.passport_division || '',
            passport_issued : data.passport_issued || '',
            passport_place_of_birth : data.passport_place_of_birth || '',
            registration : data.registration || '',
            isLoadedDataFrom1C : data.isLoadedDataFrom1C !== undefined ? data.isLoadedDataFrom1C : false ,
        };

        return new ListenerModel(attributes)
    }

     clearProtectedReceivedFrom1C(){
        this.name = '';
        this.surname = '';
        this.date_of_birth =  '';
        this.patronymic = '';
        this.post = '';
        this.isLoadedDataFrom1C = false;
    }
}

