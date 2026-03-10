export default class Memorial{
	#data;
	#id;
	constructor(data){
		let payloads = {};

		for(let [name,value] of data.entries()){
			if(value instanceof File){
				value = value.name;
			}

			payloads[name] = value;
		}

		this.#data = payloads;
	}

	to_json(){
		return this.#data;
	}

	set_id(id){
		this.#id = id;
	}

	get_id(){
		return this.#id;
	}
}