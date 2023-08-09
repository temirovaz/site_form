
export default class Array {
    static inArray(array, key, value) {
        return array.some(item => item[key] === value)
    }
}
