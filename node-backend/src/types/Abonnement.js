export default class Abonnement{
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

	set_date_created(date){
		date.toISOString();

		this.#abonnementData.date_created = date;
	}

	set_expiration_date(date){
		date.toISOString();
		this.#abonnementData.expiration_date = date;
	}

	get_expiration_date(){
		return this.#abonnementData.expiration_date;
	}

	get_id(){
		return this.#data._id;
	}

	get_date_created(){
		return this.#abonnementData.date_created;
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

	get_abonnement_data(){
		return this.#abonnementData;
	}

	to_json(){
		return this.#data;
	}
}