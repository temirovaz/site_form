import {CUSTOMER_TYPE} from "./constant/CustomerType";

export default class CustomerModel {
    constructor (data = {}) {
        this.contactPhone = '';
        this.contactEmail = '';
        this.customerType = null;

        this.physicalName = null;
        this.physicalSecondName = null;
        this.physicalSurname = null;

        this.ipName = null;
        this.ipINN = null;

        this.legalName = null;
        this.legalINN = null;
        this.legalKPP = null;


        for (const property in data) {
            if(this.hasOwnProperty(property)){
                this[property] = data[property]
            }
        }
    }

    getCustomerFormatName(){
        if(this.customerType === null){
            return false;
        }
        if(this.customerType === CUSTOMER_TYPE.PHYSICAL){
            return [this.physicalSurname, this.physicalName, this.physicalSecondName].join(' ');
        }

        return this[this.getCustomerType() + 'Name'];
    }
    getCustomerType(){
        return this.customerType;
    }
    isCustomerLegal(){
        return this.customerType === CUSTOMER_TYPE.IP || this.customerType ===  CUSTOMER_TYPE.LEGAL;
    }
    getCustomerINN(){
        return this[this.getCustomerType() + 'INN'];
    }
    getCustomerKPP(){
        return this[this.getCustomerType() + 'KPP'];
    }

    static fromObject(data)
    {
        const attributes = {
            contactPhone: data.phone,
            contactEmail: data.email,
        };

        return new CustomerModel(attributes)
    }

    static fromStore(store){
        const attributes = {
            contactPhone: store.contact.phone,
            contactEmail: store.contact.email,
            customerType: store.payment.type,
        };

        if(attributes.customerType === CUSTOMER_TYPE.PHYSICAL){
            attributes.physicalSurname = store.payment.surname;
            attributes.physicalName = store.payment.name;
            attributes.physicalSecondName = store.payment.patronymic;
        }else{
            attributes[attributes.customerType + 'Name'] = store.payment.name_full_with_opf;
            attributes[attributes.customerType + 'INN'] = store.payment.inn;

            if(attributes.customerType === CUSTOMER_TYPE.LEGAL){
                attributes[attributes.customerType + 'KPP'] = store.payment.kpp;
            }
        }





        return new CustomerModel(attributes)
    }
}

