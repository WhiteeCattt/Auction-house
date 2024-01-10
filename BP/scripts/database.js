import { world, system } from '@minecraft/server';

export class DynamicDB {
    /**
     * @description Creates a new database or loads an existing one.
     * @param {string} id An identifier for the database
     * @param {import('@minecraft/server').World | import('@minecraft/server').Entity} provider The provider for the database. Can be a world or an entity.
     * @returns {DynamicDB}
     */
    constructor(id, provider) {
        this._id = id
        this._provider = provider
        let length = this._provider.getDynamicProperty(`dynamicdb:${id}_length`)
        if (length === undefined) {
            this._data = {}
        } else {
            let mergedString = ''
            for (let i = 0; i < length; i++) {
                mergedString += this._provider.getDynamicProperty(`dynamicdb:${id}_${i}`)
            }
            this._data = JSON.parse(mergedString)
        }
    }
    /**
     * @description Deletes a database.
     * @param {string} id
     * @returns {boolean}
     */
    static delete(id) {
        let length = this._provider.getDynamicProperty(`dynamicdb:${id}_length`)
        if (length === undefined) {
            return false
        } else {
            for (let i = 0; i < length; i++) {
                this._provider.setDynamicProperty(`dynamicdb:${id}_${i}`, undefined)
            }
            this._provider.setDynamicProperty(`dynamicdb:${id}_length`, undefined)
            return true
        }
    }
    /**
     * @description Clears the database.
     */
    clear() {
        this._data = undefined
        let length = this._provider.getDynamicProperty(`dynamicdb:${this._id}_length`)
        for (let i = 0; i < length; i++) {
            this._provider.setDynamicProperty(`dynamicdb:${this._id}_${i}`, undefined)
        }
        this._provider.setDynamicProperty(`dynamicdb:${this._id}_length`, undefined)
    }
    /**
     *
     * @param {string} id
     * @returns {boolean}
     */
    static exists(id) {
        let length = this._provider.getDynamicProperty(`dynamicdb:${id}_length`)
        if (length === undefined) {
            return false
        } else {
            return true
        }
    }
    /**
     * @description Saves the database in the form of dynamic properties.
     * @returns {Promise<int>}
     */
    save() {
        let time = Date.now()
        const oldLength = this._provider.getDynamicProperty(`dynamicdb:${this._id}_length`)
        for (let i = 0; i < oldLength; i++) {
            this._provider.setDynamicProperty(`dynamicdb:${this._id}_${i}`, undefined)
        }
        let data = this._data
        if (data === undefined) data = {}
        let dataString = JSON.stringify(data)
        let splitString = []
        for (let i = 0; i < dataString.length; i += 32767) {
            splitString.push(dataString.substring(i, i + 32767))
        }
        splitString.forEach((str, index) => {
            this._provider.setDynamicProperty(`dynamicdb:${this._id}_${index}`, str)
        })
        this._provider.setDynamicProperty(`dynamicdb:${this._id}_length`, splitString.length)
        return Promise.resolve(Date.now() - time)
    }
    /**
     * @description Gets all the keys in the database.
     * @returns {string[]}
     * @readonly
     */
    keySet() {
        if (this._data === undefined) this._data = {}
        return Object.keys(this._data)
    }
    /**
     * @description Gets a value from the database.
     * @param {string} key The key to get
     * @returns {any}
     */
    get(key) {
        if (this._data === undefined) this._data = {}
        return this._data[key]
    }
    /**
     * @description Sets a value in the database.
     * @param {string} key The key to set
     * @param {any} value The value to set
     * @returns {void}
     */
    set(key, value) {
        if (this._data === undefined) this._data = {}
        this._data[key] = value
    }
    /**
     * @description Deletes a key from the database.
     * @param {string} key The key to delete
     * @returns {void}
     */
    delete(key) {
        if (this._data === undefined) this._data = {}
        this._data[key] = undefined
    }
    /**
     * @description Returns the database as a JSON string.
     * @returns {string}
     */
    toString() {
        let data = this._data
        if (data === undefined) data = {}
        return JSON.stringify(data)
    }
}
