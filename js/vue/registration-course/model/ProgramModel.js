export default class ProgramModel {
    constructor (data = {}) {
        this.id = '';
        this.name = '';
        this.hours =  '';
        this.prefix =  '';
        this.selected = false;
        this.listeners = [];
        for (const property in data) {
            if(this.hasOwnProperty(property)){
                this[property] = data[property]
            }
        }
    }

    isSelectProgram(){
        return this.selected;
    }

    static fromObject(data)
    {
        const attributes = {
            id: data.id,
            name: data.name,
            hours: data.hours,
            prefix: data.prefix,
            selected: data.selected,
            listeners: []
        };

        return new ProgramModel(attributes)
    }
}

