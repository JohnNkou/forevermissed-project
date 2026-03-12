import { loginEndpoint, registerEndpoint, otpEndpoint } from '../endpoint.js'

const { APP_URL } = process.env;

export default class User{
	#data;
	#cookies = new Map();
	#auth;
	#id;

	constructor(data){
		this.#data = data;
	}

	to_json(){
		return this.#data;
	}

	set_id(id){
		this.#id = id;
	}

	set_cookie(key,value){
		this.#cookies.set(key,value);
	}

	get_email(){
		return this.#data.email;
	}

	get_id(){
		return this.#id;
	}

	get_abonnement(){
		return this.#data.abonnement;
	}

	get_payment_card(){
		return this.#data.payment_card;
	}

	update_data(data){
		for(let name in data){
			this.#data[name] = data[name];
		}
	}

	async update_abonnement_db(collection){
		let abonnement = this.#data.abonnement.get_abonnement_data(),
		response = await collection.updateOne(
			{ "_id": this.get_id() },
			{
				"$set":{
					abonnement: abonnement
				}
			}
		);

		if(!response.modifiedCount){
			throw Error("Abonnement couldn't be updated. " + JSON.stringify(response))
		}

		return true;
	}

	request(url,options={}){
		if(!(url instanceof URL)){
			if(!url.includes('http')){
				if(!APP_URL){
					throw Error("NO APP_URL FOUND IN ENVIRONMENT VARIABLE");
				}
				url = new URL(`${APP_URL}${url}`);
			}
			else
				url = new URL(url);
		}

		let headers,
		cookies = this.#cookies;

		if(this.#auth){
			headers = options.headers;

			if(!headers){
				headers = new Headers();
			}

			headers.append('Authorization', `${this.#auth.token_type} ${this.#auth.access_token}`);

			options.headers = headers;
		}

		if(cookies.size){
			headers = options.headers = options.headers || new Headers();

			for(let [key,value] of cookies.entries()){
				headers.append("cookie",`${key}=${value}`);
			}
		}

		return fetch(url,options).then((response)=>{
			let headers = response.headers,
			set_cookies = headers.getSetCookie();

			if(set_cookies){
				let cookies = this.#cookies;
				set_cookies.forEach((cookie_data)=>{
					let [name,value] = cookie_data.split(';')[0].split('=');

					cookies.set(name,value);
				})
			}

			return response;
		});
	}

	request_json(url,options={}){
		let headers = options.headers || new Headers();

		headers.set('content-type','application/json');
		options.headers = headers;
		options.body = JSON.stringify(options.body);

		return this.request(url,options)
	}

	register(){
		return this.request_json(registerEndpoint,{
			method:'POST',
			body: this.to_json()
		})
	}

	send_otp(code){
		return this.request_json(otpEndpoint,{
			method:'POST',
			body:{ code }
		})
	}

	async log_in(){
		let { email, password } = this.#data;

		if(!email || !password){
			throw Error("Email and password should be defined");
		}

		return this.request_json(loginEndpoint,{
			method:'POST',
			body:{ email, password }
		}).then((response)=> {
			return response.clone().json().then((data)=>{
				let { access_token, token_type } = data;

				this.#auth = { access_token, token_type };

				return response;
			})
		})
	}

	get_auth_token(){
		return this.#auth;
	}
}