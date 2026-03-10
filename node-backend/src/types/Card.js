import { Decimal128 } from 'mongodb'

export default class Card{
	#data;
	#stored_amount;
	constructor(card){
		if(!card){
			throw Error("No card given");
		}

		this.#data = card;
	}

	get_number(){
		return this.#data.number;
	}

	get_id(){
		return this.#data._id;
	}

	get_expiration_date(){
		return this.#data.expiration_date;
	}

	get_ccv(){
		return this.#data.ccv;
	}

	get_amount(){
		return this.#data.amount;
	}

	store_amount(new_amount){
		this.#stored_amount = new_amount;
	}

	update_amount(new_amount){
		this.#data.amount = new_amount;
	}

	async synchronize(collection){
		let card = await collection.find({_id: this.get_id()}).next();

		if(!card){
			throw Error("No card found for synchornizing");
		}

		this.#data = card;
	}

	async update_card_in_db(db){
		let response = await db.updateOne(
			{ _id: this.#data._id },
			{ 
				$set: { 
					amount: new Decimal128(this.get_amount().toString()), 
					expiration_date: this.get_expiration_date(),
					ccv: this.get_ccv(),
					number: this.get_number()
				} 
			}
		);

		if(!response.modifiedCount){
			console.error("No card was modified",this.#data);
			throw Error("No card was modified");
		}
	}

	to_json(){
		return {...this.#data, amount:undefined};
	}
}