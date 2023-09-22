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
            surname: this.surname
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

