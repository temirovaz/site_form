import {describe, expect, it} from 'vitest';
import CustomerModel from '../../js/vue/registration-course/model/CustomerModel';
import {CUSTOMER_TYPE} from '../../js/vue/registration-course/model/constant/CustomerType';

const storeShape = (payment) => ({
    contact: {phone: '+79123456789', email: 'test@example.com'},
    payment,
});

describe('CustomerModel.fromStore', () => {
    it('собирает физлицо из ФИО плательщика', () => {
        const customer = CustomerModel.fromStore(
            storeShape({
                type: CUSTOMER_TYPE.PHYSICAL,
                surname: 'Иванов',
                name: 'Иван',
                patronymic: 'Иванович',
            })
        );

        expect(customer.getCustomerType()).toBe(CUSTOMER_TYPE.PHYSICAL);
        expect(customer.isCustomerLegal()).toBe(false);
        expect(customer.getCustomerFormatName()).toBe('Иванов Иван Иванович');
        expect(customer.contactEmail).toBe('test@example.com');
    });

    it('собирает юрлицо с ИНН и КПП', () => {
        const customer = CustomerModel.fromStore(
            storeShape({
                type: CUSTOMER_TYPE.LEGAL,
                name_full_with_opf: 'ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ "КУТРИТ"',
                inn: '2311128737',
                kpp: '231101001',
            })
        );

        expect(customer.isCustomerLegal()).toBe(true);
        expect(customer.getCustomerINN()).toBe('2311128737');
        expect(customer.getCustomerKPP()).toBe('231101001');
        expect(customer.getCustomerFormatName()).toContain('КУТРИТ');
    });

    it('собирает ИП без КПП', () => {
        const customer = CustomerModel.fromStore(
            storeShape({
                type: CUSTOMER_TYPE.IP,
                name_full_with_opf: 'ИНДИВИДУАЛЬНЫЙ ПРЕДПРИНИМАТЕЛЬ ТЕСТОВ ТЕСТ ТЕСТОВИЧ',
                inn: '231100000000',
            })
        );

        expect(customer.isCustomerLegal()).toBe(true);
        expect(customer.getCustomerINN()).toBe('231100000000');
        expect(customer.getCustomerKPP()).toBeUndefined();
    });
});

describe('CustomerModel.getCustomerFormatName', () => {
    it('возвращает false, пока тип плательщика не выбран', () => {
        expect(new CustomerModel().getCustomerFormatName()).toBe(false);
    });
});
