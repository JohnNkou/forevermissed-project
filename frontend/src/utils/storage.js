const _name = 'MISSED'

export function Storage(){
	let data = {};

	try{
		data = JSON.parse(localStorage.getItem(_name)) || {};
	}
	catch(error){}

	this.set = (name,value)=>{
		data[name] = value;

		localStorage.setItem(_name, JSON.stringify(data));
	}

	this.get = (name)=>{
		return data[name];
	}
}