import nodemailer from 'nodemailer'
import { getNumber } from 'utils/utils.js'
import timers from 'node:timers/promises'
import { orderMail } from './components/Order.js'
import { otpToString } from './components/Otp.js'
import { orderPaymentToString } from './components/OrderPayment.js'
import { suspensionToString } from './components/Suspension.js'

let { APP_DOMAIN, SMTP_HOST, NODE_ENV, SMTP_PORT, SUB_MAIL_USER, SUB_MAIL_PASSWORD } = process.env;

export class SMTP{
	#client;
	#user
	#host

	constructor(){
		let isProd = NODE_ENV == 'production';

		this.#client = nodemailer.createTransport({
			host: SMTP_HOST.toString(),
			port: getNumber(SMTP_PORT),
			secure: isProd,
			tls:{
				rejectUnauthorized: isProd
			},
			auth:{
				user: SUB_MAIL_USER.toString(),
				pass: SUB_MAIL_PASSWORD.toString()
			}
		});
		this.#user = SUB_MAIL_USER;
		this.#host = `${this.#user}@${APP_DOMAIN}`;
	}

	sendOTP({ code, email }){
		return this.#client.sendMail({
			from: this.#host,
			to: email,
			subject: "Votre OTP",
			html: otpToString(code),
			headers:{
				'x-otp-code': code
			}
		})
	}

	sendOrderMessage({ email, price, type, currency }){
		return this.#client.sendMail({
			from: this.#host,
			to: email,
			subject: `Abonnement ${type} confirmé`,
			html: orderMail({ amount: price, type, currency }),
			headers:{
				'x-abonnement-type': type,
				'x-abonnement-price': price,
				'x-abonnement-currency': currency
			}
		})
	}

	sendFailedPaiementMessage({ email, price, currency, due_date, type }){
		return this.#client.sendMail({
			from: this.#host,
			to: email,
			subject:`Echec de paiement`,
			html: orderPaymentToString({ price, currency, type, dueDate: due_date.toLocaleDateString('fr-FR',{ weekday:'short', month:'long', day:'numeric', year:'numeric' }), missing:true }),
			headers:{
				'x-abonnement-price': Number(price),
				'x-abonnement-currency': currency,
				'x-abonnement-dueDate': due_date.toISOString(),
				'x-paiement-failed': true
			}
		})
	}

	sendSuccessPaiementMessage({ email, price, currency, due_date, type }){
		return this.#client.sendMail({
			from: this.#host,
			to: email,
			subject:`Paiement Effectué`,
			html: orderPaymentToString({ price, currency, type, dueDate: due_date.toLocaleDateString('fr-FR', { weekday:'short', year:'numeric', month:'long', day:'numeric' }) }),
			headers:{
				'x-abonnement-price': Number(price),
				'x-abonnement-currency': currency,
				'x-abonnement-dueDate': due_date.toISOString(),
				'x-paiement-succeed': true
			}
		})
	}

	 sendSuspensionMessage(email){
	 	return this.#client.sendMail({
	 		from: 		this.#host,
	 		to: 		email,
	 		subject:	`Suspension`,
	 		html:		suspensionToString(),
	 		headers:	{
	 			'x-user-suspended':true
	 		}
	 	})
	 }
}

export class ClientWaiter{
	#reconnecting = false;
	#client
	#waiters = []

	constructor(client){
		this.#client = client;
	}

	async wait(){
		console.log("Waiting");
		let p = new Promise((resolve,reject)=> this.#waiters.push(resolve));

		if(this.#reconnecting == false){
			console.log("Trying reconnection");
			this.#reconnecting = true;
			this.waitClient();
		}

		console.log("Returning promise");

		return p;
	}

	async getClient(){
		return this.#client;
	}

	async waitClient(){
		console.log("waitClient running");
		while(true){
			try{
				console.log("Waiting connection");
				this.#client = await this.#client.connect();
				console.log("Connection success. Running waiters");
				this.#reconnecting = false;

				let fn;

				while(fn = this.#waiters.pop()){
					try{
						fn()
					}
					catch(error){
						console.error("Waiter function error",error);
					}
				}

				break;
			}
			catch(error){
				console.error("Failed connecting", error.toString());
				await timers.scheduler.wait(100);
				console.log("Retrying");
			}
		}
	}
}