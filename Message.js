module.exports = class Message {
	constructor(type, data) {
		this.type = type;
		this.data = data;
	}

	get json() {
		return JSON.stringify(this);
	}
}
