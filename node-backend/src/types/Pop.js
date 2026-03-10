import Pop3Command from 'node-pop3'
import { getNumber } from 'utils/utils.js';
import { scheduler } from 'node:timers/promises'

const { APP_DOMAIN, NODE_ENV, POP_PORT } = process.env,
matchers = {
	abonnement: {
		basic: [
			{ regex:/x-abonnement-type:\s+(\S+)/i, name:'abonnement_type' },
			{ regex:/x-abonnement-price:\s+(\S+)/i, name:'abonnement_price' },
			{ regex:/x-abonnement-currency:\s+(\S+)/i, name:'abonnement_currency' },
			{ regex:/x-abonnement-dueDate:\s+(.+)/i, name:'abonnement_dueDate', action: (value)=> new Date(value) }
		],
		order_failed: [
			{ regex:/x-paiement-failed:\s+(\S+)/i, name:'paiement_failed' }
		],
		order_successfull: [
			{ regex:/x-paiement-succeed:\s+(\S+)/i, name:'paiement_succeed' }
		],
		suspension:[
			{ regex:/x-user-suspended:\s+(\S+)/i, name:'user_suspended' }
		]

	}
},
otp_regex = /x-otp-code:\s+(\S+)/i;

export default class Pop{
	#view_count = 0;
	#client;
	#regex;
	#user;
	#password;
	#last_message_id;

	constructor({ user,password }){
		this.#user = user;
		this.#password = password;
		this.#regex = new RegExp(`to:\\s+${user}@${APP_DOMAIN}`,"i");

		this.connect();
	}

	async connect(){
		let user = this.#user,
		password = this.#password;

		if(this.#client){
			await this.#client.QUIT().then((message)=>{
				console.log('QUIT MESSAGES',message)
			}).catch((error)=>{
				console.error("Error while quitting",error);
			})
		}

		this.#client = new Pop3Command({
			user, 
			password,
			host: APP_DOMAIN.toString(),
			port: getNumber(POP_PORT),
			tls:true,
			timeout:500,
			tlsOptions: {
				rejectUnauthorized: NODE_ENV.toString() == 'production'
			}
		})
	}

	print_message(message){
		let data = {};

		message.split('\n').forEach((line)=>{
			let [key,value] = line.split(':');
			data[key.toLowerCase()] = value;
		})

		console.log(`USER:${this.#user}\nfrom: ${data['from']}\nto: ${data['to']}\nsubject: ${data['subject']}\notp-code: ${data['x-otp-code']}
		`)
	}

	async *get_mails(timeout){
		let run = true,
		timedout = false,
		counter = setTimeout(async ()=>{
			run = false;
			timedout = true;
		},getNumber(timeout))

		while(run){
			try{
				let ids = await this.#client.UIDL(),
				maxMessages = ids.length;

				if(maxMessages != this.#view_count){
					let max = maxMessages - this.#view_count,
					stream;

					for(let i=1; i <= max; i++){
						let message = await this.#client.RETR(i),
						action = yield message;

						this.#view_count++;

						if(action == 'end'){
							clearTimeout(counter);
							run = false;
							break;
						}
					}

					await this.#client.QUIT();
				}
				else{
					await this.#client.QUIT();
				}

				await scheduler.wait(5);
			}
			catch(error){
				if(error.eventName){
					console.log(error.eventName);
				}
				else{
					console.error(error);
				}
			}
		}

		if(timedout){
			throw Error("Timeout reached");
		}

	}

	async get_suspension_order({ emails, timeout }){
		let r = [],
		double = [...emails],
		message_generator = this.get_mails(timeout),
		_matcher = matchers.abonnement.suspension;

		for await(const message of message_generator){
			for(let email of emails){
				if(message.includes(email)){
					if(_matcher.every((matcher)=>{
						let match = message.match(matcher.regex);

						if(match && match.length){
							let emailIndex = double.indexOf(email);

							if(!r[emailIndex]){
								r[emailIndex] = {};
							}

							r[emailIndex][matcher.name] = match[1];

							return true;
						}
					})){
						emails.splice(emails.indexOf(email),1);
					}
				}

				if(!emails.length){
					message_generator.next('end');
				}
			}
		}

		return r;
	}

	async get_payment_success_order({ emails, timeout, maxNumber }){
		let r = [],
		double = [...emails],
		message_generator = this.get_mails(timeout),
		found = 0,
		_matcher = matchers.abonnement.basic.slice(1).concat(matchers.abonnement.order_successfull);

		for await(const message of message_generator){
			for(let email of emails){
				if(message.includes(email)){
					if(_matcher.every((matcher)=>{
						let match = message.match(matcher.regex);

						if(match && match.length){
							let emailIndex = double.indexOf(email);

							if(!r[emailIndex]){
								r[emailIndex] = {};
							}

							r[emailIndex][matcher.name] = match[1];
							return true;
						}
					})){
						found++;
					}
				}

				if(found == maxNumber){
					message_generator.next('end');
					break;
				}
			}
		}

		return r;
	}

	async get_payment_failed_order({ emails, timeout, maxNumber }){
		let r = [],
		double = [...emails],
		message_generator = this.get_mails(timeout),
		_matcher = matchers.abonnement.basic.slice(1).concat(matchers.abonnement.order_failed),
		found = 0;

		for await(const message of message_generator){
			for(let email of emails){
				if(message.includes(email)){
					let payload = {};
					if(_matcher.every((matcher)=>{
						let match = message.match(matcher.regex);

						if(match && match.length){
							/*let emailIndex = double.indexOf(email);

							if(!r[emailIndex]){
								r[emailIndex] = {};
							}*/

							if(matcher.action){
								match[1] = matcher.action(match[1]);
							}

							payload[matcher.name] = match[1];

							//r[emailIndex][matcher.name] = match[1];

							return true;
						}
					})){
						r.push(payload);
						found++;
					}
				}
			}

			if(found == maxNumber){
				message_generator.next('end');
			}
		}

		r.sort((x,y)=>{
			let dueDate = matchers.abonnement.basic.find((c)=> c.name.indexOf('dueDate') != -1).name;
			if(x[dueDate] < y[dueDate]){
				return -1;
			}
			return 1;
		})

		return r;
	}

	async get_abonnement_confirmation({ emails, timeout }){
		let r = new Array(emails.length).fill(undefined),
		double = [...emails],
		message_generator = this.get_mails(timeout);

		for await(const message of message_generator){
			for(let email of emails){
				if(message.includes(email)){
					let matched = false;
					matchers.abonnement.basic.forEach((matcher)=>{
						let match = message.match(matcher.regex);

						if(match && match.length){
							let emailIndex = double.indexOf(email);

							if(!r[emailIndex]){
								r[emailIndex] = {};
							}

							r[emailIndex][matcher.name] = match[1];
							matched = true;
						}
					})

					if(matched){
						emails.splice(emails.indexOf(email),1);
					}
				}
			}

			if(!emails.length){
				message_generator.next('end');
			}
		}

		return r;
	}

	async get_otp({ emails, timeout}){
		let r = new Array(emails.length).fill(undefined),
		double = [...emails],
		message_generator = this.get_mails(timeout);

		try{
			for await(const message of message_generator){
				for(let email of emails){
					if(message.includes(email)){
						let match = message.match(otp_regex);

						if(match[1]){
							r[double.indexOf(email)] = match[1];
							emails.splice(emails.indexOf(email),1);
						}
					}
				}

				if(!emails.length){
					message_generator.next('end');
				}
			}

			return r;
		}
		catch(error){
			if(error.command){
				console.error(error.command,this.#user);
			}
			else{
				console.error(error.toString());
			}
		}

		return r;
	}

	delete_messages(){
		let b = `${this.#user}:${this.#password}`;

		process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

		return fetch(`https://${APP_DOMAIN}:8025/api/v1/messages`,{
			method:'DELETE',
			headers:{
				'Authorization': `Basic ${btoa(b)}`
			}
		})
	}

	close(){
		return this.#client.QUIT();
	}
}