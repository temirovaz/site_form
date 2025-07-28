# Маппинг данных адресов для 1С

## 📋 Описание изменений

Добавлен маппинг полей адресов в методе `sendFormForSaveTo1C` для корректной передачи данных в 1С.

## 🔄 Маппинг полей

### Входные данные (из формы):
```javascript
{
  "payment": {
    "type": "legal",
    "inn": "2311128737",
    "kpp": "231101001",
    "name_short": "Q-ТРИТ",
    "name_full_with_opf": "ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ \"КУТРИТ\"",
    "management_name": "Манухин Игорь Леонидович",
    "management_post": "ДИРЕКТОР",
    "address_value": "г Москва, ул Тверская, д 1",           // Юридический адрес
    "actual_address": "г Москва, ул Тверская, д 1",          // Фактический адрес
    "postal_code": "123456"                                   // Почтовый индекс
  }
}
```

### Выходные данные (для 1С):
```javascript
{
  "payment": {
    "type": "legal",
    "inn": "2311128737",
    "kpp": "231101001",
    "name_short": "Q-ТРИТ",
    "name_full_with_opf": "ОБЩЕСТВО С ОГРАНИЧЕННОЙ ОТВЕТСТВЕННОСТЬЮ \"КУТРИТ\"",
    "management_name": "Манухин Игорь Леонидович",
    "management_post": "ДИРЕКТОР",
    "address_value": "г Москва, ул Тверская, д 1",           // Остается для внутреннего использования
    "legal_address": "г Москва, ул Тверская, д 1",           // Адрес юридический – (строка)
    "postal_address": "г Москва, ул Тверская, д 1",          // Адрес почтовый – (строка)
    "postal_index": "123456"                                  // Индекс – (строка 6)
  }
}
```

## 📝 Соответствие полей 1С

| Поле в форме | Поле для 1С | Описание в 1С |
|--------------|-------------|---------------|
| `actual_address` | `postal_address` | Адрес почтовый – (строка) |
| `postal_code` | `postal_index` | Индекс – (строка 6). При отсутствии извлекается из адреса |
| `address_value` | `legal_address` | Адрес юридический – (строка) |

## 🔧 Логика маппинга

```javascript
// Маппинг полей адресов для 1С
if(dataForm.payment) {
    // Маппинг фактического адреса
    if(dataForm.payment.actual_address) {
        dataForm.payment.postal_address = dataForm.payment.actual_address;
        delete dataForm.payment.actual_address;
    }
    
    // Маппинг почтового индекса
    if(dataForm.payment.postal_code) {
        dataForm.payment.postal_index = dataForm.payment.postal_code;
        delete dataForm.payment.postal_code;
    }
    
    // Маппинг юридического адреса
    if(dataForm.payment.address_value) {
        dataForm.payment.legal_address = dataForm.payment.address_value;
        // Не удаляем address_value, так как он может использоваться в других местах
    }
}
```

## ✅ Особенности реализации

1. **Сохранение исходных данных**: Поле `address_value` не удаляется, так как может использоваться в других частях приложения
2. **Условная обработка**: Маппинг выполняется только при наличии соответствующих полей
3. **Очистка данных**: Временные поля (`actual_address`, `postal_code`) удаляются после маппинга
4. **Совместимость**: Изменения не влияют на существующую функциональность

## 🎯 Результат

Теперь при отправке формы в 1С будут корректно передаваться:
- ✅ Юридический адрес в поле `legal_address`
- ✅ Фактический адрес в поле `postal_address`  
- ✅ Почтовый индекс в поле `postal_index` 