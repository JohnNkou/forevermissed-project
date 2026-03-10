import { faker } from '@faker-js/faker'
import FORM_FIELDS from 		'../src/fields.js'
import { getAbonnementDates } from 'utils/utils.js'
import fs from 'node:fs'
import assert from 'node:assert'
import dotenv from 				'dotenv'
import { ObjectId, Decimal128 } from 'mongodb'

Promise.sequence = async function(...tasks){
	let results = [];

	for(const fn of tasks){
		results.push(await fn());
	}

	return results;
}

Date.prototype.format = function(string){
	return string.split(' ').map((s)=>{
		s = s.trim();
		if(s){
			switch(s){
			case '%year':
				return this.getFullYear();
			case '%month':
				return this.getMonth() + 1;
			case '%date':
				return String(this.getDate()).padStart(2,0);
			case '%hour':
				return String(this.getHours()).padStart(2,0);
			case '%minute':
				return String(this.getMinutes()).padStart(2,0);
			case '%second':
				return String(this.getSeconds()).padStart(2,0)
			}
		}
		else{
			return s;
		}
	}).join(' ');
}

FormData.prototype.toJSON = function(){
	let data = {};

	for(let [key,value] of this.entries()){
		if(value instanceof Blob){
			value = value.name;
		}
		if(data[key]){
			if(data[key] instanceof Array){
				data[key].push(value);
			}
			else{
				data[key] = [value,data[key]];
			}
		}
		else{
			data[key] = value;
		}
	}

	return data;
}

export const is = {
	Object(data){
		return Object.prototype.toString.call(data) == Object.prototype.toString.call({});
	},
	Array(data){
		return data instanceof Array;
	}
}

export function getPopUsers(){
	let data = fs.readFileSync('../../mail/password.txt').toString(),
	payloads = {};

	return data.split('\n').map((line)=>{
		let [user,password] = line.split(':');
		
		return { user, password }
	})
}

export async function updateAbonnementForTest(db_abonnements){
	let abonements = await db_abonnements.find().toArray(),
	length = abonements.length;

	for(let i=0; i < length; i++){
		await db_abonnements.updateOne(
			{ _id: abonements[i]._id },
			{ $set: { "maxVideo.time": (i + 1) * 5 } }
		)
	}
}

export async function restoreAbonnements(db_abonnements, abonnements){
	let lastId = abonnements.at(-1)._id;

	await db_abonnements.deleteMany({ _id: { $gt: lastId } });
}

export function idSorter(asc){
	return (x,y)=>{
		if(x._id.toString() > y._id.toString()){
			return asc ? 1 : -1
		}

		return asc ? -1: 1;
	}
}

export function checkMissingPaiementRecords({records, start_date, chosen_abonnement, status, frequency, manager}){
	start_date.toISOString();

	records.forEach(({ email, abonnementId : _abonnementId, status:_status, due_date, price, currency },index)=>{
		let { expiration_date:expected_due_date } = getAbonnementDates({ start:start_date, range: 1 + index, frequency }),
		date_format = '%year %month %date %hour %minute';
		
		assert.equal(email, manager.get_email(),`The email in the missing paiement record should be equal to ${manager.get_email()} -- ${index}`)
		assert.ok(_abonnementId.equals(chosen_abonnement._id), `The abonnementId field should be set to ${chosen_abonnement._id} -- ${index}`)
		assert.equal(_status,status,`The status should be ${status}`)
		assert.equal(price, chosen_abonnement.price, `The price of the paiement record should be set to ${chosen_abonnement.price} -- ${index}`)
		assert.equal(currency, chosen_abonnement.currency, `The currency of the paiement record should be set to ${chosen_abonnement.currency} -- ${index}`)
		assert.equal(due_date.format(date_format), expected_due_date.format(date_format), `The due_date should be set to ${expected_due_date.toLocaleString()} -- ${index}`);
	})
}

export function orderBuilder({abonnement, card, frequency}){
	assert.ok(abonnement,'No abonnement given');
	assert.ok(card,'No card given');
	assert.ok(frequency,'No frequency given')
	return {
		abonnement:{
			id: abonnement._id,
			frequency
		},
		payment_data:{
			type:'card',
			...card.to_json()
		}
	}
}


export async function setCardStub(db_abonnements, db_cards){
	let abonements = await db_abonnements.find().toArray(),
	length = abonements.length;

	await Promise.all(abonements.map(({ price, currency },i)=>{
		let adder = 10 + (i * 5),
		card = {
			amount: new Decimal128((Number(price) + adder).toString()) ,
			currency,
			ccv: faker.number.int({ min:100, max:999 }),
			number: faker.string.uuid(),
			expiration_date: '06/2028'
		}

		return db_cards.insertOne(card).then((response)=>{
			if(!response.insertedId)
				throw Error("Couldn't insert card " + JSON.stringify(card))
		})
	}))
}

export function generateUser({ user, role='manager' } = {}){
	let email = faker.internet.email();

	if(user){
		let { APP_DOMAIN } = process.env;

		email = `${user}@${APP_DOMAIN.toString()}`
	}

	return {
		email: 				email,
		password:			faker.string.uuid(),
		name:				faker.person.fullName(),
		role				
	}
}

export function generateAbonnement({ type }={}){
	return {
		type: type || faker.string.uuid(),
		maxVideo: { 
			number: faker.number.int({ min:10, max:50 }),
			time: faker.number.int(100) 
		},
		maxMemorial: faker.number.int({min:1, max:30}),
		frequency:[ 'monthly', 'yearly' ],
		maxPicture: { 
			number: faker.number.int({ min:10, max:100 }),
			size: faker.number.int({ min:10000, max:50000 })
		},
		currency: 'USD',
		price: new Decimal128(
			faker.number.int({ max:40 }).toString()
		),
		maxTribute: faker.number.int({ min:1, max:10 })
	}
}

export function generateTribute(){
	let author_name = faker.person.fullName(),
	text = faker.word.words({ min:20, max:120 });

	return { author_name, text }
}

export function getExpirationDate(date,frequency,repeat=1){
	let year = date.getUTCFullYear(),
	month = date.getUTCMonth(),
	month_date = date.getUTCDate(),
	hours = date.getUTCHours(),
	minutes = date.getUTCMinutes(),
	seconds = date.getUTCSeconds(),
	milliseconds = date.getUTCMilliseconds();

	switch(frequency){
	case 'monthly':{
		date.setUTCMonth(month + repeat)

		break;
	}
	case 'yearly':
		date.setUTCFullYear(year + repeat);
		break;
	default:
		throw Error("Unknwon frequency "+ frequency);
	}

	if(date.getUTCDate() != month_date){
		date.setUTCDate(0);
	}

	return date;
}

export async function waitFor(milliseconds){
	if(milliseconds == undefined){
		throw Error("No milliseconds passed to function");
	}

	await new Promise((resolve)=> setTimeout(resolve,milliseconds));
}

export async function waitAction(action,times=5,interval=50){
	return new Promise((resolve,reject)=>{
		let c = setInterval(async()=>{
			if(!checking){
				if(times--){
					checking = true;
					try{
						value = await action();

						if(value){
							clearInterval(c);
							resolve(value);
						}
					}
					catch(err){
						error = err;
					}

					checking = false;
				}
				else{
					clearInterval(c);

					if(error){
						reject(error);
					}
					else{
						resolve(value);
					}
				}
			}
		}, interval || 0),
		value,error,checking;
	})
}

export function generatePictureData(number,{size_1=1000, size_2=1000}={}){
	const pictures = [],
	pictures_mini = [],
	names = [];

	if(number == undefined){
		throw Error("Number not given");
	}

	while(number--){
		pictures.push(new File([new ArrayBuffer(size_1)], faker.string.nanoid(6) + ".png"));
		pictures_mini.push(new File([new ArrayBuffer(size_2)], faker.string.nanoid(6) + ".png"));
		names.push(faker.string.nanoid());
	}

	return [pictures, pictures_mini, names]
}

export function addResourceDataToForm(datas, names){
	let forms = [],
	max = datas[0].length,
	count = 0;

	datas.sort((x,y)=>{
		if(x.length != y.length){
			throw Error("addResourceDataToForm datas array should have array of same length");
		}
		return 1;
	})

	while(max != count){
		let form = new FormData();
		names.forEach((name,index)=>{
			form.append(name, datas[index][count]);
		})

		forms.push(form);
		count++;
	}

	return forms;
};

export function titleSorter(asc=true){
	return (x,y)=> x.title > y.title && asc ? 1: -1
}

export function addDataToForm({form,lists,name}){
	lists.forEach((list)=> form.append(name, list));
}

export function generateVideoData(number, {category=1, video_size=1000, picture_size=1000} = {}){
	const videos = [],
	pictures_mini = [],
	titles = [];

	if(number == undefined){
		throw Error("Number is not given");
	}

	while(number--){
		let bytes,
		name;

		if(category == undefined){
			bytes = new ArrayBuffer(video_size);
		}
		else{
			bytes = fs.readFileSync(`videos/${category}.MOV`);
		}

		videos.push(new File([bytes], faker.string.nanoid(5) + ".mov"));
		pictures_mini.push(new File([new ArrayBuffer(picture_size)], faker.string.nanoid(5) + ".png"));
		titles.push(faker.string.nanoid());
	}

	return [videos, pictures_mini, titles]
}

export function generateMemorial(role='admin'){
	let form = new FormData();

	form.append("name", faker.person.fullName() + faker.string.uuid().slice(0,5))
	form.append("birth_date", faker.date.recent({refDate:'2000-01-01'}).toISOString())
	form.append("death_date", faker.date.recent({ days:360 }).toISOString())
	form.append("birth_place", faker.location.city())
	form.append("death_place", faker.location.city())
	form.append("biography", faker.word.words(40))
	form.append("obituary", faker.word.words(100))
	form.append("image", new File([new ArrayBuffer(1000)], faker.string.nanoid(5) + ".jpeg"))
	form.append("background_image",	new File([new ArrayBuffer(1000)], faker.string.nanoid(5) + ".jpeg"))
	form.append("background_sound", new File([fs.readFileSync('./audios/1.aiff')], faker.string.nanoid(5) + ".aiff"))

	return form;
}

export function generateOrder(){
	return {
		abonnementId: new ObjectId(),
		abonnementType: faker.string.uuid(),
		email: faker.internet.email(),
		price: new Decimal128(
			faker.number.int({ min:20, max:100 }).toString()
		),
		currency: 'USD',
		date_created: new Date(),
		status: 'new'
	}
}

export function getUserResource(user_id, collection){
	return collection.find({ _id: user_id }).project({
		pictureSent: "$resources.pictureSent",
		videoSent: "$resources.videoSent",
		memorialCreated: "$resources.memorialCreated",
		tributeSent: "$resources.tributeSent"
	}).next();
}

export function getEnvData(){
	dotenv.config({ path:['../.env','../../database/.env','../../.env'] });
}