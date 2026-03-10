export class Abonnement{
	#abonnementData;
	#data;
	constructor(abonnement, frequency){
		if(!abonnement || !frequency){
			throw Error("Parameter abonnement and frequency should be given");
		}

		this.#abonnementData = abonnement;
		this.#data = {
			_id: 				abonnement._id,
			type:				abonnement.type,
			videoSent:			0,
			pictureSent:		0,
			memorialCreated:	0,
			minuteSent:			0,
			frequency
		}
	}

	change_abonnement(abonnement,frequency){
		if(!abonnement || !frequency){
			throw Error("Parameter abonnement and frequency should be given");
		}

		this.#abonnementData = abonnement;
		this.#data._id = abonnement._id;
		this.#data.frequency = frequency;
	}

	set_expiration_date(date){
		this.#abonnementData.expiration_date = date;
	}

	get_expiration_date(){
		return this.#abonnementData.expiration_date;
	}

	add_pictures(number){
		this.#data.pictureSent += number;
	}

	add_videos(number){
		this.#data.videoSent += number;
	}

	add_memorial(){
		this.#data.memorialCreated += 1;
	}

	get_memorial_created(){
		return this.#data.memorialCreated;
	}

	get_videos_sent(){
		return this.#data.videoSent;
	}

	get_pictures_sent(){
		return this.#data.pictureSent;
	}

	get_id(){
		return this.#data._id;
	}

	get_frequency(){
		return this.#data.frequency;
	}

	get_price(){
		return this.#abonnementData.price
	}

	get_currency(){
		return this.#abonnementData.currency
	}

	get_type(){
		return this.#data.type;
	}

	to_json(){
		return this.#data;
	}
}

export class Card{
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

	get_expiration_date(){
		return this.#data.expiration_date;
	}

	get_id(){
		return this.#data._id;
	}

	get_currency(){
		return this.#data.currency;
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

	async update_card_in_db(db){
		let response = await db.updateOne(
			{ _id: this.#data._id },
			{ 
				$set: { 
					amount: this.get_amount(), 
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
		return this.#data;
	}
}

export class PaymentCard{
	#card;
	constructor(card){
		if(!(card instanceof Card)){
			throw Error("card should be an instanceof Card");
		}

		this.#card = card;
	}

	async pay(price,currency,collection){
		let card = this.#card;

		let amount = Number(card.get_amount());
		price = Number(price);

		if(amount.toString() == "NaN"){
			throw Error("Card amount is not a number. "+ card.amount);
		}

		if(price.toString() == 'NaN'){
			throw Error("price is not a number "+ price);
		}

		if(amount < price){
			throw new InsufficiantFound(`InsufficiantFound for amount ${price}${currency}`)
		}
		else if(currency != card.get_currency()){
			throw Error(`Card currency different then given currency ${card.currency} - ${currency}`)
		}
		else{
			let response = await collection.updateOne(
				{ _id: card.get_id() },
				{
					$set:{ amount: amount - price }
				}
			);

			if(!response.modifiedCount){
				throw Error("User card coudln't be updated ");
			}

			return true;
		}
	}

	static async getInstance(card,collection,trace_id){
		let response = await collection.find({_id: card._id}).next();

		if(!response){
			throw Error("Card don't exist");
		}

		response.trace_id = trace_id;

		return new PaymentCard(new Card(response));
	}
}

export class InsufficiantFound extends Error{
	constructor(message){
		super(message);
		this.name = 'InsufficiantFound';
	}
}