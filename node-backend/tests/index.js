import assert from 				'node:assert'
import path from 				'node:path';
import { MongoClient, ObjectId } from 	'mongodb'
import { memorialEndpoint, tributeEndpoint, abonnementEndpoint, userCardEndpoint, memorialPictureEndpoint, memorialVideoEndpoint, memorialAudioEndpoint, resourceEndpoint, orderEndpoint, userEndpoint, orderPaymentEndpoint } from '../src/endpoint.js'
import FORM_FIELDS from 		'../src/fields.js'
import Memorial from 			'../src/types/Memorial.js'
import Abonnement from 			'../src/types/Abonnement.js'
import { generateOrder, generateMemorial, generateUser, generatePictureData, generateVideoData, generateTribute, generateAbonnement, addResourceDataToForm, addDataToForm, updateAbonnementForTest,restoreAbonnements, setCardStub, getExpirationDate, waitFor, checkMissingPaiementRecords, waitAction, idSorter, getPopUsers, is, orderBuilder, titleSorter, getEnvData, getUserResource, dateToString, ObjectIdToString, removeId, Decimal128ToNumber } from './utils.js'
import { getNumber, calculateExpirationDate,  getAbonnementDates, getMonthBetweenDate, } from 'utils/utils.js'
import bcrypt from 				'bcrypt';
import Card from '../src/types/Card.js'
import { scheduler, setTimeout as setTimeoutP } from 'node:timers/promises'
import log from 'why-is-node-running'
import test from 'node:test'

getEnvData();

const User = await import('../src/types/User.js').then((d)=> d.default),
Pop = await import('../src/types/Pop.js').then((d)=> d.default),
client = await import('./conn.js').then((d)=> d.default);


const { DB_HOST, MONGO_INITDB_ROOT_USERNAME, MONGO_INITDB_ROOT_PASSWORD, DB_NAME, SESSION_NAME, CHECKING_MISSING_PAIEMENT_INTERVAL, POP_USER, POP_PASSWORD} = process.env,
RENEWAL_FREQUENCY_SECONDS = getNumber(process.env.RENEWAL_FREQUENCY_SECONDS),
MAX_MISSING_PAIEMENT_RETRY = getNumber(process.env.MAX_MISSING_PAIEMENT_RETRY),
POP_USERS = getPopUsers(),
db = client.db(DB_NAME),
db_users 			=	db.collection('users'),
db_memorials 		=	db.collection('memorials'),
db_tributes 		=	db.collection('tributes'),
db_abonnements 		= 	db.collection('abonnements'),
db_paiements 		=	db.collection('paiements'),
db_cards 			=	db.collection('cards'),
db_orders 			=	db.collection('orders'),
db_missed_payments 	= 	db.collection('missed_payments'),
db_sessions			=	db.collection('sessions'),
db_otps				=	db.collection('otps'),
managers = Array.from('1'.repeat(2)).map((_,index)=> new User(generateUser(POP_USERS[index]))),
admins = [1,2].map((_,index)=> new User(generateUser({ ...POP_USERS[index+2], role:'admin' }))),
default_abonnements =	await db_abonnements.find().toArray(),
Pop_Service = new Pop({ user: POP_USER, password: POP_PASSWORD }),
errors = [];

try{
	await updateAbonnementForTest(db_abonnements);
	await setCardStub(db_abonnements,db_cards);
	
	const _abonnements = 		await db_abonnements.find().toArray(),
	payment_cards = await db_cards.find({ amount: { $gt: _abonnements[0].price }, currency: _abonnements[0].currency }).project({ _id:1, number:1, expiration_date:1, ccv:1, expiration_date:1, amount:1 }).toArray(),
	payment_card_1 = new Card(await payment_cards[0]),
	payment_card_2 = new Card(await payment_cards[1]),
	guest = new User(generateUser()),
	manager1 = managers[0],
	manager2 = managers[1],
	admin1 = admins[0],
	admin2 = admins[1],
	userJSON = manager1.to_json(),
	MONTHLY_FREQUENCY = 'monthly',
	YEARLY_FREQUENCY = 'yearly',
	aborter = new AbortController();

	let response,abonnement,jsonResponse,responses;

	await test("Testing User registration", { skip:false, signal: aborter.signal }, async (t)=>{
		await t.test("When the manager sent a registration request with data the server should return a 200 status code",async()=>{
			responses = await Promise.all([
				manager1.register(), 
				manager2.register(),
				admin1.register(),
				admin2.register(),
			]);
			responses.forEach((response)=>{
				assert.equal(response.status,200, `When the user issue a register request the server should return a 200 status code`);
			})
		})

		await t.test("After the server return a 200 status code, otp email should have been sent to the user",async()=>{
			responses = await Pop_Service.get_otp({
				emails: [
					manager1.get_email(), 
					manager2.get_email(),
					admin1.get_email(),
					admin2.get_email()
				],
				timeout: 5000
			});
			responses.forEach((response)=> {
				assert.ok(response,`The get_opt of the Pop Class should retrieve the opt passed to the user`)
			});
		})

		await t.test("After the user sent the otp received, the server should add the user in the database and return a 201 status code with the access_token and user information",async()=>{
			responses = await Promise.sequence(
				...managers.concat(admins).
				map((user,index)=>{
					return ()=> user.send_otp(responses[index])
				})
			);

			for(let i=0; i < responses.length; i++){
				let response = responses[i],
				jsonResponse = await response.json(),
				user;

				assert.equal(response.status,201, `Sending the correct otp should return the 201 status code to the user`);
				assert.ok(jsonResponse.access_token,`The opt response should have an access_token string`);
				assert.ok(jsonResponse.token_type,`The opt response should have an token_type field`)
				assert.ok(jsonResponse.user.id, `The otp response should have user object with and id string`);
				assert.ok(jsonResponse.user.name,`The otp response should have an user object with a name string`)
				assert.ok(jsonResponse.user.email,`The otp response should have an user object with an email field`);

				user = (i < 2)? managers[i]: admins[i % 2];
				user.set_id(new ObjectId(jsonResponse.user.id));
			}

			responses = await db_users.find().toArray();
			assert.equal(responses.length,4,`The database should contain two user`);

			responses.forEach((response,index)=>{
				let users = (index < 2)? managers : admins;

				let user = users.find((user)=> user.get_id().equals(response._id)).to_json();

				for(let name in user){
					if(name != 'password'){
						assert.equal(response[name], user[name], `The field ${name} should be equal to that sent in the database`)
					}
					else{
						assert.notEqual(response[name], user[name], `The password field should not be recorded as is in the database`);
					}
				}
			})
		})

		await t.test("When the user sent an expired cookie the server should return a 404 status code", async ()=>{
			let sId = "monako",
			email = 'viva@gmail.com',
			code = 'monaco';

			responses = await Promise.all([
				await db_sessions.insertOne({ sId, email }),
				await db_otps.insertOne({ email, code, date_created: new Date("2022-12-04 13:00:00") })
			]);

			for(let response of responses){
				assert.ok(response.insertedId);
			}

			guest.set_cookie('sessionId', sId);

			response = await guest.send_otp(code);

			assert.equal(response.status,404,`The server should return a 404 status code because of an expired otp`);
		})
	})

	await test("Testing logIn", { signal: aborter.signal }, async(t)=>{
		await t.test("When the user sent correct login information the server should be return a 200 status code along with the access_token in the response",async ()=>{
			responses = await Promise.all([
				manager1.log_in().then((r)=> { r.id = 0; return r }), 
				manager2.log_in().then((r)=> { r.id = 1; return r }),
				admin1.log_in().then((r)=> { r.id = 2; return r }),
				admin2.log_in().then((r)=> { r.id = 3; return r })
			])

			responses.sort((x,y)=> x < y ? -1: 1);

			responses.forEach((response,i)=>{
				let users = (i < 2)? managers : admins;

				assert.equal(response.status,200, "The manager should be successfully authenticated")
				assert.ok(users[i % 2].get_auth_token(), `After authentification the session cookie data should be stored in the User object`);
			})
		})
	})

	await test("When the user try to add a memorial without having a abonnement the server should retrieve a 403 status code", { skip:false , signal: aborter.signal}, async()=>{
		response = await manager1.request_json(memorialEndpoint,{
			method:'POST',
			body: generateMemorial()
		});

		assert.equal(response.status,403,"The manager without an active plan should have the 403 status returned when trying to create a memorials");
	})

	await test("Testing user card payment adding", { skip:false, signal: aborter.signal }, async(t)=>{
		let chosen_abonnement = _abonnements[0],
		number=0;

		assert.ok(payment_card_1.get_number());
		assert.ok(payment_card_1.get_expiration_date());
		assert.ok(payment_card_1.get_ccv());
		assert.ok(payment_card_2.get_number());
		assert.ok(payment_card_2.get_expiration_date());
		assert.ok(payment_card_2.get_ccv());

		await t.test("When the user sent new correct card information the server should return a 201 status code and update the user cards properties in the database",async()=>{
			for(let card of [payment_card_1, payment_card_2]){
				let manager = managers[number++],
				url = userCardEndpoint.replace(':user_id', manager.get_id()),
				payload = { id: card.get_id() };

				response = await manager.request_json(url,{
					method:'PUT',
					body: {...card.to_json(), id: card.get_id().toString()}
				})

				payload.default = true;

				assert.equal(response.status,201,`After the user add it card information the server should return a 201 status code`);

				response = await db_users.find({ _id: manager.get_id(), cards: { $in: [payload] } }).next();

				assert.ok(response,`The card sent should be added in the cards field of the user data`);

				assert.equal(response.cards[0].default, true, `The first card sent to server should be set to default`);

				manager.update_data({ payment_card: card });
			}
		})

		number = 0;

		await t.test("When the user send incorrect card data the server should return a 400 status code",async()=>{
			let url = userCardEndpoint.replace(':user_id', manager1.get_id());

			response = await manager1.request_json(url, {
				method:'PUT',
				body: { ...payment_card_1.to_json(), number:'12344', id: payment_card_1.get_id().toString() }
			})

			assert.equal(response.status,400,`When the user send a card with an incorrect number the server should return a 400 status cdoe`);
		})

		response = await manager1.request_json(
			userCardEndpoint.replace(':user_id', manager1.get_id()),
			{
				method:'PUT',
				body: { ...payment_card_1.to_json(), id: payment_card_1.get_id().toString() }
			}
		);

		await t.test("When the user request to see it cards the server should return a 200 status code along with the list of cards inserted",async()=>{
			let url = userCardEndpoint.replace(':user_id', manager1.get_id());

			response = await manager1.request(url);
			jsonResponse = await response.json();

			assert.equal(response.status,200,`The Get request to the userCardEndpoint should return a 200 status code`)

			number=0;
			for(let card of jsonResponse.data){
				let payment_card = payment_cards[number++];

				assert.equal(card.ccv, undefined);
				assert.notEqual(card.number, payment_card.number);
				assert.equal(card.number.slice(-4), payment_card.number.slice(-4));
				assert.equal(card.expiration_date, payment_card.expiration_date);
			}
		})
	})

	await test("Testing abonnement procedure", { skip:false, signal: aborter.signal }, async(t)=>{
		let u_abonnement = _abonnements[0];

		await t.test("When the user order an abonnement the server should return a 201 status code if the user has enought money, and update the order database. A duplicate order abonnement should have the 400 status code returned",async()=>{
			let abonnement = u_abonnement,
			frequency = MONTHLY_FREQUENCY,
			card = payment_card_1,
			card_amount = card.get_amount(),
			new_amount = card_amount - abonnement.price,
			resources;

			responses = await [[manager1,payment_card_1],[manager1, payment_card_1]].reduce(async (payloads,[manager,card])=>{
				payloads = await payloads;
				payloads.push(await manager.request_json(orderEndpoint,{
					method:'POST',
					body: orderBuilder({ abonnement, frequency, card })
				}));

				return payloads;
			},[]);

			assert.equal(responses[0].status, 201, "When the manager order an abonnement with correct payment info and money in the card the server should return a 201 status code");
			assert.equal(responses[1].status, 400, "Paying for a current abonnement that is not yet expirared should return a 200 status code");

			responses = await db_orders.find().sort('managerId').toArray();
			resources = await getUserResource(manager1.get_id(), db_users);

			assert.equal(responses.length,1,"The database should have an order created")
			assert.ok(resources,`After the abonnement is confirmed the user should have a resources properties`);

			['videoSent','memorialCreated','pictureSent','tributeSent'].forEach((name)=>{
				assert.equal(resources[name],0, `${name} should be set to 0`);
			})

			responses.forEach((response,index)=>{
				let { _id, price, currency } = abonnement;

				assert.ok(response.abonnementId.equals(_id),`The Order should be linked with the abonnement id ${_id}`);
				assert.equal(response.price.toString(),price.toString(), `The order should have the price of the abonnement in it data`);
				assert.equal(response.currency,currency, `The order should have the current of the abonnement paid in it data`);
				assert.equal(response.email,managers[index].get_email(),`The order should have the managerId set to ${managers[index].get_id().toString()}`);
				assert.ok(response.date_created,`The order entry should have a date_created field`);
				assert.equal(response.status,'new',`The order entry should have a status field set to new`);
			})

			await card.synchronize(db_cards);

			assert.equal(card.get_amount(), new_amount, `The new amount on the card should be ${new_amount}`)
		})

		await t.test("The information of the abonnement ordered should be the same as the abonnement chosen",async()=>{
			let u_abonnement = _abonnements[0];

			response = await db_users.find({_id: manager1.get_id()}).
			project({ _id:1, abonnement:1, default_payment:1 }).next();

			abonnement = new Abonnement(response.abonnement, response.abonnement.frequency);

			let payment_card = manager1.get_payment_card(),
			default_payment = response.default_payment,
			_abonnement = response.abonnement,
			date_created = _abonnement.date_created,
			expiration_date = _abonnement.expiration_date,
			frequency = u_abonnement.frequency[0],
			{ _id, type } = u_abonnement;

			assert.ok(response.abonnement.id.equals(_id),`The abonnement ordered should have an id of ${_id}`);
			assert.equal(response.abonnement.type, type, `The abonnement order should have type of ${type}`);
			assert.equal(response.abonnement.frequency, frequency, `The abonnement order should have a frequency of ${frequency}`);
			assert.ok(date_created,"When the user purchase an abonnement the abonnement field should include a date_created attribute");
			assert.ok(expiration_date,"When the user purchase an abonnement the abonnement field should include a expiration_date attribute")
			assert.ok(response.default_payment,"The default payment should be set after the user subscribe to an abonnement");
			assert.equal(expiration_date.toLocaleString(), getExpirationDate(date_created, frequency).toLocaleString());
			assert.equal(default_payment.number, payment_card.get_number(), "The default payment number should be set to the card number");
			assert.equal(default_payment.ccv, payment_card.get_ccv(), "The default payment ccv should be set to the card ccv");
			assert.equal(default_payment.expiration_date, payment_card.get_expiration_date(), "The default payment expiration date should be  set to the card expiration date");

			manager1.update_data({ abonnement })
		})

		await t.test("When the user has less money than the amount order the server should return a 400 status code",async ()=>{
			let abonnement = u_abonnement,
			frequency = YEARLY_FREQUENCY,
			new_price = abonnement.price * 12,
			card = payment_card_2;

			if(frequency != 'yearly'){
				throw Error("Was expecting a yearly frequency");
			}

			card.update_amount(abonnement.price - 10);

			await card.update_card_in_db(db_cards);

			response = await manager2.request_json(orderEndpoint,{
				method:'POST',
				body: orderBuilder({ abonnement, frequency, card })
			});

			assert.equal(response.status,400,`When the user card amount is less then the abonnement price with the selected frequency the server should return a 400 status code`);
		})

		await t.test("When the user has enough money in the bank the server should return a 201 status code",async()=>{
			let abonnement = u_abonnement,
			card = payment_card_2;

			card.update_amount(abonnement.price);
			await card.update_card_in_db(db_cards);

			response = await manager2.request_json(orderEndpoint,{
				method:'POST',
				body: orderBuilder({ abonnement, frequency: MONTHLY_FREQUENCY, card })
			})

			assert.equal(response.status,201,`When the user as enough data in it bank. The server should return a 201 status code when an order is requested`);
		})

		await t.test("Sending abonnement order with incorrect card should return a 400 status cdoe",async()=>{
			let card = payment_card_2;

			response = await manager2.request_json(orderEndpoint,{
				method:'POST',
				body: orderBuilder({ abonnement, frequency:'startup', card })
			})

			assert.equal(response.status, 400, `When the user send an invalid frequency the server should return a 400 status code`)
		})

		await t.test("After the server returned a 201 status code after an order an email should be sent to the user",async()=>{
			let abonnement = u_abonnement;

			responses = await Pop_Service.get_abonnement_confirmation(
				{ 
					emails:		[manager1.get_email()],
					timeout:	700
				}
			)

			assert.equal(responses.length,1,`Two abonnement mail should have been sent to users`);

			for(let response of responses){
				assert.ok(response,`The get_abonnement_confirmation should return an array of abonnement informations`);
				assert.equal(
					response.abonnement_type, 
					abonnement.type,
					`The abonnement type should be set to ${abonnement.type}`
				)
				assert.equal(
					response.abonnement_price.toString(),
					abonnement.price.toString(),
					`The abonnement price should be set to ${abonnement.price}`
				)
				assert.equal(
					response.abonnement_currency,
					abonnement.currency,
					`The abonnement currency should be set to ${abonnement.currency}`
				)
			}
		})

		await t.test("Testing abonnement restriction",async(t)=>{
			let _memorial,
			user_abonnement = await db_users.find({ _id: manager1.get_id() }).next().then((d)=> d.abonnement),
			abonnement_class = new Abonnement(user_abonnement, user_abonnement.frequency);

			await t.test("While the maximum memorial for the given abonnement is not exceeded the user should be able to add memorial and the server should return 201 status code",async()=>{
				let abonnement = u_abonnement,
				maxMemorial = abonnement.maxMemorial,
				memos = [],
				resources;

				while(maxMemorial--){
					memos.push(generateMemorial());
					response = await manager1.request(memorialEndpoint,{
						method:'POST',
						body: memos.at(-1)
					});
					jsonResponse = await response.json();


					assert.equal(response.status,201,"Le serveur devrait retourner le status 200")
					assert.ok(jsonResponse.inserted,"Le manager devrait avoir la possibilité d'inserer un memorial tant que la limete de l'abonnement n'est pas atteint");
					assert.ok(jsonResponse.id,"Apres l'ajout d'un memorial, le serveur devrait retourner l'id du memorial ajouté");

					abonnement_class.add_memorial();
					memos.at(-1)._id = jsonResponse.id;

					if(!_memorial){
						_memorial = new Memorial(memos.at(-1))
						_memorial.set_id(new ObjectId(jsonResponse.id));
					}
				};

				response = await guest.request(memorialEndpoint);
				jsonResponse = await response.json();
				resources = await getUserResource(manager1.get_id(), db_users);

				assert.equal(response.status,200,`Fetching memorials should return a 200 status code`);
				assert.equal(jsonResponse.total,abonnement.maxMemorial, `The number of memorials inserted in the database should be ${abonnement.maxMemorial}`)
				assert.equal(abonnement_class.get_memorial_created(), abonnement.maxMemorial, `The numberof memorial created in the Abonnement object should be equal to the chosen abonnement maxMemorial`);
				assert.equal(resources.memorialCreated, abonnement.maxMemorial, `The memorialCreated of the resources object of the user should be set to ${abonnement.maxMemorial}`);

				memos.sort(idSorter(true))
				jsonResponse.memorials.sort(idSorter(true))

				jsonResponse.memorials.every((memorial,index)=>{
					let created_by = new ObjectId(memorial.created_by),
					memo = memos[index];

					for(let [name,value] of memo.entries()){
						let value = memo.get(name),
						_value = memorial[name];

						assert.ok(_value,`The field ${name} should be returned by the server`);

						if(['birth_date','death_date'].includes(name)){
							_value = _value.slice(0,-3) + 'Z';
						}
						else if(value instanceof File){
							let extension =  path.extname(value.name);

							assert.ok(_value.endsWith(extension),`The field ${name} should end with the extension ${extension}`);
							continue;
						}

						assert.equal(_value, value, `The field ${name} of memorial should be equal to ${value}`)
					}

					assert.ok(new ObjectId(memorial.created_by).equals(manager1.get_id()), "The memorial creator_id attribute should reference the manager who created the memorial");


				})
			})

			await t.test("When the user try to add more memorial the what the maximum for the given abonnement authorized a 423 status code should be returned",async()=>{
				responses = await Promise.all([
					manager1.request(memorialEndpoint,{
						method:'POST',
						body: generateMemorial()
					}),
					db_users.find({ _id: manager1.get_id() }).next()
				])

				assert.equal(responses[0].status,423,"The server should return a 423 status code after the user has exceeding is quota limit");
				assert.equal(responses[1].resources.memorialCreated, u_abonnement.maxMemorial);
			})

			await t.test("The server should allow POSTING of tribute when the number of tributes is below or equal to the allowed range", async ()=>{
				const abonnement = u_abonnement,
				maxTribute = abonnement.maxTribute,
				tributes = new Array(maxTribute).fill(0).map(generateTribute),
				url = tributeEndpoint.replace(':memorial_id', _memorial.get_id());

				responses = await tributes.reduce(async (x,y)=>{
					x = await x;

					x.push(await guest.request_json(url,{
						method:'POST',
						body:y
					}))

					return x;

				},[]);

				assert.equal(responses.length, maxTribute,`The responses length property should be equal to the value of maxTribute ${maxTribute}`);

				responses.forEach(async (response)=>{
					assert.equal(response.status,201,`When a user post a tribute the server should return a 201 status code. Status returned ${response.status}`)
				})

				responses = await db_tributes.find().toArray();
				response = await db_users.find({_id: manager1.get_id()}).project({ tributeSent:'$resources.tributeSent', _id:1 }).next();

				assert.equal(responses.length, maxTribute,`The number of tribute that should be inserted should be ${maxTribute}`);
				assert.equal(response.tributeSent, maxTribute,`The resource.tributeSent of the user in the database should be set to ${maxTribute}`);

				for(let i=0; i < maxTribute; i++){
					let tribute = tributes[i],
					db_tribute = responses[i];

					for(let name in tribute){
						assert.equal(tribute[name], db_tribute[name], `The field name ${name} in the database should be equal to ${tribute[name]}`);
					}
				}
				assert.equal(responses.every((t)=> t.date_created), true, `All the tribute in the database must have a date_created field`)
			})

			await t.test("The server should return a 423 when the user try to POST a tributes when the maximum allowed value is reached",async()=>{
				let url = tributeEndpoint.replace(':memorial_id', _memorial.get_id()),
				maxTribute = u_abonnement.maxTribute;

				response = await guest.request_json(url,{ method:'POST', body: generateTribute() });
				responses = await Promise.sequence(
					()=> db_tributes.find().toArray(),
					()=> db_users.find({ _id: manager1.get_id() }).project({ tributeSent:'$resources.tributeSent', _id:1 }).next()
				) ;

				assert.equal(response.status, 423, `The server should not allow more tribute than was is allowed by the abonnement maxTribute`);
				assert.equal(responses[0].length, maxTribute,`When the quota is reached the no more tribute of the given memorial should be added to the tribute database`);
				assert.equal(responses[1].tributeSent, maxTribute, `When the quota is reached the resource.tributeSent of the user should not be modified`);
			})

			await t.test("Pictures restrictions",async(t)=>{
				const abonnement = u_abonnement,
				url = memorialPictureEndpoint.replace(':memorial_id', _memorial.get_id()),
				title_names = [FORM_FIELDS.PICTURE, FORM_FIELDS.PICTURE_MINI, FORM_FIELDS.TITLE],
				maxPictureNumber = abonnement.maxPicture.number;

				await t.test("The server should accept the posting of pictures as long as the maximum allowed number of picture is not reached. And it should return a 201 status code",async()=>{
					let datas = generatePictureData(maxPictureNumber - 2),
					pictures = datas[0],
					pictures_mini = datas[1],
					titles = datas[2],
					forms = addResourceDataToForm(datas, title_names);

					assert.equal(forms[0].get(title_names[0]).name, pictures[0].name);

					responses = await Promise.all(forms.map((form,id)=>{
						return	manager1.request(url,{
							method:'POST',
							body: form
						})
					}));

					response = await db_memorials.find({ _id: _memorial.get_id() }).project({ gallery:1 }).next();

					response.gallery.sort((x,y)=> x.title < y.title ? -1: 1);
					titles.sort((x,y)=> x < y ? -1: 1);

					responses.forEach((_response,index)=>{
						assert.equal(_response.status,201,"As long as the quota limit is not exceeded the server should accept pictures from the manager ---"+index);
						assert.equal(response.gallery.length, pictures.length, `The gallery field gallery of the memorial should have ${pictures.length} field in it`);
					})

					response.gallery.forEach(function({ src, src_min, title, date_added },index){
						let [main_name, min_name, picture_title] = [pictures[index].name, pictures_mini[index].name, titles[index]],
						[main_ext, min_ext] = [path.extname(main_name), path.extname(min_name)],
						[main_basename, min_basename] = [path.basename(main_name), path.basename(min_name)];

						["src", "src_min", "title", "date_added"].forEach((name)=> assert.ok(arguments[0][name],`${name} should be contained in the gallery`));
						assert.doesNotMatch(src,new RegExp(main_basename), `The src property in the gallery should not contain the original name`);
						assert.doesNotMatch(src_min, new RegExp(min_basename), `The min_src in the gallery should not contain the original name`);
						assert.ok(src.endsWith(main_ext),`Each src in the gallery should contain the original extension`);
						assert.ok(src_min.endsWith(min_ext), `Each min_src in the gallery should contain the original extension`);
						assert.equal(picture_title, title, `The title property should be equal to ${picture_title}`);
						assert.ok(date_added, `The date added should be defined for each picture`);
					})
					abonnement_class.add_pictures(pictures.length);

					response = await getUserResource(manager1.get_id(), db_users);

					assert.equal(response.pictureSent,pictures.length, `The user resource pictureSent should be set to ${pictures.length}`)
				})

				await t.test("When the user post a picture whose size is exceeding the allowed range the server should return a 400 status code",async()=>{
					let form = new FormData(),
					datas = generatePictureData(2, {size_1: abonnement.maxPicture.size * 2}),
					pictures = datas[0],
					pictures_mini = datas[1],
					titles = datas[2],
					forms = addResourceDataToForm(datas, title_names),
					resources = await getUserResource(manager1.get_id(), db_users),
					responses = await Promise.all(forms.map((form)=> manager1.request(url,{
						method:'POST',
						body: form
					})))

					responses.forEach((response)=>{
						assert.equal(response.status, 400, "The server should return a 400 status code when the user try to send a picture with a size greater than the maximum allowed for his abonnement");
					})

					datas = generatePictureData(2,{size_2:50000});

					forms = addResourceDataToForm(datas, title_names);

					responses = await Promise.all(forms.map((form)=> manager1.request(url,{
							method:'POST',
							body: form
						}))
					)
					response = await getUserResource(manager1.get_id(), db_users);

					responses.forEach((response)=>{
						assert.equal(response.status,400, `The server should return a 400 status code when the user try to send miniature picture with a size greater then 49999 bytes`);
					})
					assert.equal(response.pictureSent, resources.pictureSent,`The resources property of the user should be set to ${resources.pictureSent}`);
				})

				await t.test("When the quota is not breached the server should return a 201 status code",async()=>{
					let datas = generatePictureData(2),
					pictures = datas[0],
					pictures_mini = datas[1],
					titles = datas[2],
					forms = addResourceDataToForm(datas, title_names),
					responses = await Promise.all(forms.map((form)=> manager1.request(url,{
							method: 'POST',
							body: form
						}))
					),
					resources;

					responses.forEach((response)=>{
						assert.equal(response.status, 201, "The server should return a 201 status code when the quota for picture is not reached");
					})
					resources = await getUserResource(manager1.get_id(), db_users);

					abonnement_class.add_pictures(pictures.length);

					response = await db_memorials.find({ _id: _memorial.get_id() }).next();

					assert.ok(response,"The memorial inserted should be found in the database");
					assert.equal(response.gallery.length, maxPictureNumber);
					assert.equal(abonnement_class.get_pictures_sent(), maxPictureNumber,"The number of pictures sent in the Abonnement object should be equal to the maximum allowed for the abonnement");
					assert.equal(resources.pictureSent, maxPictureNumber, `The resources properties should have it pictureSent set to ${maxPictureNumber}`);
				})

				await t.test("The server should return a 423 status code it post request for picture when the quota is reached",async()=>{
					let form = new FormData(),
					datas = generatePictureData(1),
					pictures = datas[0],
					pictures_mini = datas[1],
					titles = datas[2],
					forms = addResourceDataToForm(datas, title_names),
					resources = await getUserResource(manager1.get_id(), db_users);

					responses = await Promise.all(forms.map((form)=> manager1.request(url,{
							method:'POST',
							body: form
						}) )
					)

					responses.forEach((response)=>{
						assert.equal(response.status,423,"The server should return a 423 status code after the user has exceeded the picture quota limit");
					})

					response = await db_users.find({ _id: manager1.get_id })

					assert.equal(resources.pictureSent, maxPictureNumber)
				})

				await t.test("The server should return a 401 status code when a user try to post a picture for a memorial he didn't created",async()=>{
					let datas = generatePictureData(1),
					pictures = datas[0],
					pictures_mini = datas[1],
					titles = datas[2],
					forms = addResourceDataToForm(datas, title_names);

					responses = await Promise.all(forms.map((form)=> manager2.request(url,{
							method:'POST',
							body: form
						}))
					)

					responses.forEach((response)=>{
						assert.equal(response.status, 401, "The server should return a 401 status code when an manager try to send pictures for a memorial he didn't create");
					})
				})

				await t.test("The server should return a 201 status code when the user send a delete request for a picture resource", async()=>{
					let src,
					galleryLength;

					response = await db_memorials.find({ _id: _memorial.get_id() }).next();
					galleryLength = response.gallery.length;
					src = btoa(response.gallery[0].src.toString());

					response = await manager1.request(`${url}?src=${src}`,{ method:'DELETE' });

					assert.equal(response.status, 201, `When the user send a delete request for an existing resource the server should return a 201 status code`);

					responses = await Promise.all([
						await db_memorials.find({ _id: _memorial.get_id() }).next(),
						await getUserResource(manager1.get_id(), db_users)
					]);

					assert.equal(responses[0].gallery.length, --galleryLength, `The new gallery length should be set to ${galleryLength}`);
					assert.equal(responses[1].pictureSent, maxPictureNumber - 1, `The new pictureSent should be set to ${maxPictureNumber - 1}`);

				})

				await t.test("Sending a delete operation for a memorial that a user didn't create should return a 401 status code",async ()=>{
					let memorial = await db_memorials.find({ created_by: manager1.get_id() }).next(),
					src = btoa('purple.png');

					response = await manager2.request(`${url}?src=${src}`, { method:'DELETE' })

					assert.equal(response.status, 401, `Sending a delete picture request for a resource not owned by the user sending the request should return a 401 status code`);
				})
			})
			
			await t.test("Videos restriction ",async (t)=>{
				let url = memorialVideoEndpoint.replace(':memorial_id', _memorial.get_id()),
				abonnement = u_abonnement,
				title_names = [FORM_FIELDS.VIDEO, FORM_FIELDS.PICTURE_MINI, FORM_FIELDS.TITLE],
				maxVideoNumber = abonnement.maxVideo.number;

				await t.test("The server should accept the posting of video when the quota is not reached",async()=>{
					let datas = generateVideoData(maxVideoNumber - 2),
					videos = datas[0],
					pictures_mini = datas[1],
					titles = datas[2],
					forms = addResourceDataToForm(datas, title_names),
					resources;

					responses = await Promise.all(forms.map((form)=> manager1.request(url,{
						method:'POST',
						body: form
					})))

					response = await db_memorials.find({ _id: _memorial.get_id() }).project({ videos:1 }).next();
					resources = await getUserResource(manager1.get_id(), db_users);

					responses.forEach((_response)=>{
						assert.equal(_response.status,201,"As long as the quota limit is not exceeded the server should accept videos from the manager");
						assert.equal(response.videos.length, videos.length, `The memorial video field should have ${videos.length} items`);
					})
					assert.equal(resources.videoSent, videos.length, `The resources videoSent property should be set to ${videos.length}`)

					response.videos.sort((x,y)=> x.title < y.title ? -1: 1);
					titles.sort((x,y)=> x < y ? -1:1)

					response.videos.forEach((video,index)=>{
						let [video_name, mini_name, title] = [videos[index].name, pictures_mini[index].name, titles[index]],
						[video_ext, mini_ext] = [path.extname(video_name), path.extname(mini_name)],
						[video_basename, mini_basename] = [path.basename(video_name,video_ext), path.basename(mini_name, mini_ext)];

						["src","src_min","title","date_added"].forEach((name)=>{
							assert.ok(video[name],`The field ${name} should be included in the video data`);
						})

						assert.doesNotMatch(video.src,new RegExp(video_name), `The src video field of memorial should not contain the same name passed to it by client`);
						assert.doesNotMatch(video.src_min, new RegExp(mini_name),`The src_min video field of memorial should not contain the same name passed to it by client`)
						assert.ok(video.src.endsWith(video_ext),`The video src field should end with extension passed to it by client ${video_ext}`);
						assert.ok(video.src_min.endsWith(mini_ext),`The video src_min field should end with the extension passed to it by client ${mini_ext}`)
					})

					abonnement_class.add_videos(videos.length);
				})

				await t.test("The server should return a 400 status code when the user post a video with a total time exceeding the maximum allowed by the abonnement",async()=>{
					let datas = generateVideoData(2, { category:2 }),
					videos = datas[0],
					forms = addResourceDataToForm(datas, title_names),
					resources = await getUserResource(manager1.get_id(),db_users);

					responses = await Promise.all(forms.map((form)=> manager1.request(url,{
						method:'POST',
						body: form
					})))

					responses.forEach((response)=>{
						assert.equal(response.status, 400, "When the video sent have more minute than the minute allowed for the abonnement the server should return a 400 status code");
					})

					response = await getUserResource(manager1.get_id(), db_users);

					assert.equal(resources.videoSent, response.videoSent, `The videoSent properti of the resource object should be set to ${resources.videoSent}`)
				})

				await t.test("The server should return a 201 status code from posting of video as long as the quota is not reached",async ()=>{
					let datas = generateVideoData(2),
					videos = datas[0],
					forms = addResourceDataToForm(datas, title_names),
					resources;

					responses = await Promise.all(forms.map((form)=> manager1.request(url,{
						method:'POST',
						body: form
					})))

					responses.forEach((response)=>{
						assert.equal(response.status, 201, "When the quota for the abonnement is not reached the server should return a 201 status code when the manager try to add a video");
					})

					abonnement_class.add_videos(videos.length);

					response = await db_memorials.find({ _id: _memorial.get_id() }).next();
					resources = await getUserResource(manager1.get_id(),db_users);

					assert.ok(response, "The memorial inserted should be found in the database");
					assert.equal(response.videos.length, maxVideoNumber);
					assert.equal(abonnement_class.get_videos_sent(),maxVideoNumber, "The number of videoSent should be equal to the maximum allowed for the chosen abonnement");
					assert.equal(resources.videoSent, maxVideoNumber, `The videoSent property should be set to ${maxVideoNumber}`)
				})

				await t.test("The server should return a 423 status code when it receive a posting of a video when the quota is reached",async()=>{
					let datas = generateVideoData(1),
					videos = datas[0],
					forms = addResourceDataToForm(datas, title_names),
					resources = await getUserResource(manager1.get_id(), db_users);

					responses = await Promise.all(forms.map((form)=> manager1.request(url,{
						method:'POST',
						body: form
					})));

					responses.forEach((response)=>{
						assert.equal(response.status,423, "The server should return a 423 status code after the user has exceeded the video quota limit");
					})

					response = await getUserResource(manager1.get_id(), db_users);

					assert.equal(resources.videoSent, response.videoSent, `The videoSent property should be set to ${resources.videoSent}`);
				})

				await t.test("The server should return 401 status code when it receive a posting of a video from a user who didn't create the memorial",async()=>{
					let form = new FormData(),
					datas = generateVideoData(1),
					videos = datas[0],
					forms = addResourceDataToForm(datas, title_names);

					responses = await Promise.all(forms.map((form)=> manager2.request(url,{
						method:'POST',
						body: form
					})));

					responses.forEach((response)=>{
						assert.equal(response.status, 401, "The server should return a 401 status code when an manager try to send memorial video to a memorial he didn't create");
					})
				})

				await t.test("The server should return a 201 status code when the user send a delete request for a video resource", async()=>{
					let src,
					resource_data = await getUserResource(manager1.get_id(),db_users),
					videoSent = resource_data.videoSent,
					videoLength;


					response = await db_memorials.find({ created_by: manager1.get_id() }).next();
					videoLength = response.videos.length;
					src = btoa(response.videos[0].src.toString());

					response = await manager1.request(`${url}?src=${src}`,{ method:'DELETE' });

					assert.equal(response.status, 201, `When the user send a delete request for an existing resource the server should return a 201 status code`);

					responses = await Promise.all([
						await db_memorials.find({ created_by: manager1.get_id() }).next(),
						await getUserResource(manager1.get_id(), db_users)
					]);

					assert.equal(responses[0].videos.length, --videoLength, `The new gallery length should be set to ${videoLength}`);
					assert.equal(responses[1].videoSent, --videoSent, `The new pictureSent should be set to ${videoSent}`);

				})

				await t.test("Sending a delete operation for a memorial that a user didn't create should return a 401 status code",async ()=>{
					let memorial = await db_memorials.find({ created_by: manager1.get_id() }).next(),
					src = btoa('purple.png'),
					resources = await getUserResource(manager1.get_id(), db_users);
					
					responses = await Promise.all([
						manager2.request(`${url}?src=${src}`, { method:'DELETE' }),
						getUserResource(manager1.get_id(), db_users)
					])

					assert.equal(responses[0].status, 401, `Sending a delete picture request for a resource not owned by the user sending the request should return a 401 status code`);
					assert.equal(resources.videoSent, responses[1].videoSent, `The videoSent property should be set to ${resources.videoSent}`)
				})
			})
		})

		await t.test("The server should return a list of abonnements when a get is received from the abonnementEndpoint",async()=>{
			response = await guest.request(abonnementEndpoint);
			jsonResponse = await response.json();

			assert.equal(response.status,200,`When a user fetch the abonnementEndpoint the server should return the list of disponible abonnement options`);

			for(let abon of jsonResponse.abonnements){
				abon._id = new ObjectId(abon._id);
				let found_abonnement = _abonnements.find((d)=> abon._id.equals(d._id));

				found_abonnement.price = Number(found_abonnement.price);

				assert.ok(found_abonnement,`The abonnement return by the server should be found in the database`);
				assert.deepEqual(abon, found_abonnement, `The abonnement id ${found_abonnement._id} should have the same data has those found in the databases`);
			}
		})

		await t.test("The server should return the abonementData when a get is received from the abonnementEndpoint with the id of the abonenment",async()=>{
			let abonnement = _abonnements[0]

			response = await guest.request(`${abonnementEndpoint}/${abonnement._id}`);
			jsonResponse = await response.json();

			assert.equal(response.status,200,`The request for an abonnement data should return a 200 status code`);
			
			assert.deepEqual(jsonResponse.data,{ ...abonnement, _id: abonnement._id.toString(), price: Number(abonnement.price) }, `The abonnement retrieved should be equal to that in the database`);
		})

	})

	await test("Testing Abonement renewal procedures", async(t)=>{
		let abonnement = _abonnements[0],
		user_abonnement = await db_users.find({ _id: manager1.get_id() }).project({ _id:0, abonnement:true }).next().then((d)=> d.abonnement),
		abonnement_class = new Abonnement(user_abonnement, user_abonnement.frequency);

		await t.test("When the abonnement has expired the subscription system should run payment for the abonnement and update the expiration_date of the abonnement to the a new value when the payment is successfull",async()=>{
			let orders = await db_orders.find({ email: manager1.get_email() }).toArray(),
			new_order_length;

			payment_card_1.update_amount(abonnement.price, abonnement.currency);
			await payment_card_1.update_card_in_db(db_cards);

			let n = getAbonnementDates({ start_offset_month:-1, frequency: abonnement_class.get_frequency() }),
			month_range;

			manager1.get_abonnement().set_date_created(n.start_date);
			manager1.get_abonnement().set_expiration_date(n.expiration_date);

			await manager1.update_abonnement_db(db_users);

			let expiration_date = manager1.get_abonnement().get_expiration_date(),
			frequency = manager1.get_abonnement().get_frequency(),
			new_expiration_date = calculateExpirationDate(expiration_date, frequency),
			card_amount = payment_card_1.get_amount();

			await waitFor(RENEWAL_FREQUENCY_SECONDS * 1000);

			response = await db_users.find({ "_id": manager1.get_id() }).project({ abonnement:1,email:1 }).next();
			orders = await db_orders.find({ 
				_id: { $nin: orders.map((d)=> d._id) },
				email: manager1.get_email() 
			}).toArray();

			assert.notEqual(response.abonnement.expiration_date,expiration_date,"After the abonnement frequency has passed, the subscription script should run the payment for the new cycle and update the expiration_date for the subscription");
			assert.equal(response.abonnement.expiration_date.toLocaleString(), new_expiration_date.toLocaleString());
			assert.ok(orders.length, `The order collection should contain a new item for the successfull renewal`);

			orders.forEach((order)=>{
				assert.ok(order.abonnementId.equals(abonnement._id), `The new order should have the abonnementId set to ${abonnement._id}`);
				assert.equal(order.abonnementType,abonnement.type,`The new order should have the abonnementType set to ${abonnement.type}`);
				assert.equal(order.price, abonnement.price,`The new order should have the price field set to ${abonnement.price}`)
				assert.equal(order.currency, abonnement.currency, `The new order should have the currency field set to ${abonnement.currency}`)
				assert.equal(order.due_date.toLocaleString(), new_expiration_date.toLocaleString(), `The new order should have the date_created field set to ${expiration_date}`);
				assert.equal(order.status,'mail-sent',`The new order should have the status field set to mail-sent`);
			})

			await payment_card_1.synchronize(db_cards);

			assert.equal(payment_card_1.get_amount(),0,"After the subscriptoin the payment_card_1 amount shoud be 0");
		})

		await t.test("When the payment for a renewal of the abonnement fail, the record should be inserted in the order collection and the a new expiration date should be set", { signal: aborter.signal}, async()=>{

			let frequency = abonnement_class.get_frequency(),
			n = getAbonnementDates({ start_offset_month:-2, date:27, frequency }),
			month_range = getMonthBetweenDate(n.expiration_date, new Date()) + 1;

			manager1.get_abonnement().set_date_created(n.start_date);
			manager1.get_abonnement().set_expiration_date(n.expiration_date);
			await manager1.update_abonnement_db(db_users);

			await waitFor(RENEWAL_FREQUENCY_SECONDS * 1000);

			response = await db_users.find({ _id: manager1.get_id() }).project({ abonnement:1 }).next();

			responses = await waitAction(()=>{
				return db_orders.find({ status:'unpaid', email: manager1.get_email() }).toArray().then((d)=>{
					if(!d.length){
						throw Error("Empty list returned");
					}
					return d;

				})
			})

			let { missing_paiement, expiration_date, date_created } = response.abonnement;

			assert.equal(missing_paiement, true, "When the balance of the card of the manager is less than the subscription price the subscription service should set missing_paiement in the user document to indiquate that the user is missing paiements");
			assert.equal(
				expiration_date.toLocaleString(), 
				calculateExpirationDate(
					date_created, 
					frequency
				).toLocaleString(),
				"Even after failed paiement the expiration_date for the abonnement should be updated to the correct field"
			)

			assert.equal(responses.length,month_range,"THe missed_payments collection should have one entry after a failed paiement");
			checkMissingPaiementRecords({
				records: responses, chosen_abonnement:abonnement,
				status:'unpaid', frequency, manager:manager1, start_date: n.start_date
			})

			assert.ok(responses[0].retryTime,"The missing paiement record should have a retryTime field set to 1");
		})

		await t.test("After unsuccessfull payment have been recorded, and email should be sent to the user of those failed payments", { signal:aborter.signal }, async()=>{
			let frequency = abonnement_class.get_frequency(),
			n = getAbonnementDates({ start_offset_month:-2, date:27, frequency }),
			date_format = '%year %month %date %hour %minute';

			responses = await Pop_Service.get_payment_failed_order({ emails: [manager1.get_email()], timeout:500, maxNumber:2 });

			assert.ok(responses.length,"After the paiement of an user subscription has failed, a email should be sent to the user about the failure of the paiement");
			assert.equal(responses[0].abonnement_price, abonnement.price,`The missed paiement mail should contain the abonnement price information`);
			assert.equal(responses[0].abonnement_currency, abonnement.currency, `The missed paiement mail should contain the abonnement currency information`);
			assert.equal(responses[0].abonnement_dueDate.format(date_format), n.expiration_date.format(date_format), `The missed paiement mail should contain the abonnement dueDate information`);
			assert.ok(responses[0].paiement_failed, `When the user paiement fail the mail sent to the user should contain a paiement_failed header`)
		})

		await t.test("When the subscription find abonnement data which wasn't checked for more than one month it should compute number of payment that it should do a operate those payement and register missed payment in the missed_payments document and set those record status to unpaid", { signal: aborter.signal }, async()=>{
			let frequency = abonnement_class.get_frequency(),
			n = getAbonnementDates({ start_offset_month:-5, frequency}),
			month_range = getMonthBetweenDate(n.expiration_date, new Date()) + 1,
			manager_abonnement = manager1.get_abonnement();

			await db.dropCollection('missed_payments');

			manager_abonnement.set_date_created(n.start_date);
			manager_abonnement.set_expiration_date(n.expiration_date);
			await manager1.update_abonnement_db(db_users);

			await waitFor(RENEWAL_FREQUENCY_SECONDS * 1000);

			response = await db_users.find({ _id: manager1.get_id() }).project({ abonnement:1 }).next();
			responses = await waitAction(()=>{
				return db_orders.find({ status:'unpaid', email: manager1.get_email() }).sort('dueDate').toArray().then((d)=>{
					if(d.length != month_range){
						throw Error(`Missed paiement record should contain ${month_range} items ${JSON.stringify(d)}`);
					}

					return d;
				})
			},50).catch((error)=>{
				let dom = error.message;
				dom = JSON.parse(dom.slice(dom.indexOf('items') + 6));

				throw Error(error.message.slice(0, error.message.indexOf('items') + 5));
			})

			let { expiration_date, date_created } = response.abonnement;

			assert.equal(expiration_date.toString(), calculateExpirationDate(date_created, frequency).toString());
			assert.equal(responses.length, month_range, "The missing paiement should be populated with 5 record of missing paiement");

			checkMissingPaiementRecords({
				records: responses, status:'unpaid',
				frequency,
				start_date: n.start_date, manager: manager1,
				chosen_abonnement: abonnement
			})
		})

		await test("When subscription data end up making successfull payment for missed_payments records the status of those payment should be set to paid", { signal: aborter.signal } ,async()=>{
			let frequency = abonnement_class.get_frequency(),
			n = getAbonnementDates({ start_offset_month:-5, frequency}),
			month_range = getMonthBetweenDate(n.expiration_date, new Date()) + 1;

			payment_card_1.update_amount(abonnement.price * month_range, abonnement.currency);
			await payment_card_1.update_card_in_db(db_cards);

			await waitFor(CHECKING_MISSING_PAIEMENT_INTERVAL * 1000 * 3);

			responses = await db_orders.find({ status:'paid' }).sort('due_date').toArray();

			assert.equal(responses.length,month_range,`After the user cards had the required amount for paying all the debt, the status record of the missing paiement should be set to paid`);

			checkMissingPaiementRecords({ 
				records: responses, status:'paid', frequency, start_date: n.start_date, chosen_abonnement:abonnement, manager:manager1});
		})

		await t.test("When record in the missed_payments has been paid a mail should be sent to those user", { signal: aborter.signal } ,async()=>{
			let frequency = abonnement_class.get_frequency(),
			n = getAbonnementDates({ start_offset_month:-5, frequency}),
			month_range = getMonthBetweenDate(n.expiration_date, new Date()) + 1;

			responses = await Pop_Service.get_payment_success_order({ emails:[manager1.get_email()], timeout:300, maxNumber:month_range });

			assert.ok(responses.length,`After the missed paiement has been resolved by the user, the system should send confirmation of missed paiement to the user`);

			for(let response of responses){
				assert.equal(response.abonnement_price, abonnement.price,`The paiement successfull mail should contain the abonnement_price in the header`);
				assert.equal(response.abonnement_currency,	abonnement.currency,`The paiement successfull mail should contain the currency in the header`);
				assert.ok(response.abonnement_dueDate,`The paiement successfull mail should contain the dueDate header`);
				assert.ok(response.paiement_succeed,`The paiement successfull mail should contain the paiement_successfull header`);
			}
		})

		await t.test("When the maximum retry has been reached for record in the order collection their status should be updated to unpaid_suspended, the user who created the memorial status should be set to suspended, all the user memorial should be set to suspended", { signal: aborter.signal } ,async()=>{
			let frequency = abonnement_class.get_frequency(),
			n = getAbonnementDates({ start_offset_month:-5, frequency}),
			month_range = getMonthBetweenDate(n.expiration_date, new Date()) + 1,
			order_ids = await db_orders.find({ email: manager1.get_email() }).sort('_id',-1).limit(month_range).toArray().then((d)=> d.map((d)=> d._id));

			//console.log('ORDERS', await db_orders.find({ email: manager1.get_email() }).toArray());

			response = await db_orders.updateMany(
				{ _id: { $in: order_ids } },
				{ $set: { "retryTime": MAX_MISSING_PAIEMENT_RETRY, status:'unpaid' } }
			);

			assert.equal(response.modifiedCount, month_range, `The items in the order collection should be set to unpaid`);

			await waitFor(CHECKING_MISSING_PAIEMENT_INTERVAL * 1000 * 3);

			responses = [
				await db_orders.countDocuments({ status:'unpaid-suspended', _id: { $in: order_ids }, retryTime: MAX_MISSING_PAIEMENT_RETRY, }), 
				await db_memorials.find({ created_by: manager1.get_id() }).toArray(),
			];
			response = await db_users.find({ _id: manager1.get_id() }).next();

			assert.equal(responses[0],month_range, `The should be 5 record of missing paiement items with a status set to unpaid_suspended`);
			assert.ok(response.suspended,`The managerId whose missing_paiement retryTime record has attain the MAX_MISSING_PAIEMENT_RETRY should have is suspended attribute set to true`);
			assert.ok(responses[1].length,`The manager1 should have at least one memorial created`);

			responses[1].forEach((memorial)=>{
				assert.equal(memorial.status,'suspended', `All the memorial created by a suspended account should have a status of suspended`);
			})
		})

		await t.test("The server should return a 402 status code for request of suspended memorial", { signal: aborter.signal } ,async()=>{
			let memorials = await db_memorials.find({ created_by: manager1.get_id() }).toArray();

			responses = await Promise.all(memorials.map((memorial)=>{
				return memorial.gallery.map((gallery)=>{
					return manager1.request(`${gallery.src}?memorial_id=${memorial._id}`)
				}).concat(memorial.videos.map((video)=>{
					return manager1.request(`${video.src}?memorial_id=${memorial._id}`);
				})).concat([
					manager1.request(`${memorial.background_image}?memorial_id=${memorial._id}`),
					manager1.request(`${memorial.background_sound}?memorial_id=${memorial._id}`),
					manager1.request(`${memorial.image}?memorial_id=${memorial._id}`)
				])
			}).flat(10));
			response = await manager1.request(`${memorialEndpoint}/${memorials[0]._id}`);

			responses.forEach((response)=>{
				assert.equal(response.status, 402, `Trying to request picture or videos created by a suspended user should return a 402 status code`);
			})
			assert.equal(response.status,402,`Trying to request a memorial whose user is suspended should return the 402 status code`);

			response = await manager1.request(tributeEndpoint.replace(':memorial_id',memorials[0]._id));

			assert.equal(response.status, 402, `Trying to request tribute from a memorial whose user is suspended should return the 402 status code`);
		})

		await t.test("After the user has been suspended an email should be sent to the user", { signal: aborter.signal } ,async()=>{
			responses = await Pop_Service.get_suspension_order({ emails:[manager1.get_email()], timeout: 300 });

			assert.ok(responses.length,`After the user has been suspended a suspension mail should be sent to him`);

			for(let response of responses){
				assert.ok(response.user_suspended,`The suspension mail should contain a user_suspended field`);
			}
		})

		await t.test("Request for memorial endpoint should not return suspended memorial for user not managing the memorial", { signal: aborter.signal } ,async ()=>{
			let memorial = generateMemorial().toJSON(),
			memorials;

			for(let name in memorial){
				if(name.includes('date')){
					memorial[name] = new Date(memorial[name]);
				}
			}

			memorial.created_by = manager2.get_id();
			memorial.date_created = new Date();
			memorial.date_updated = new Date();
			memorial.view_count = 0;
			memorial.videos = [];
			memorial.gallery = [];

			response = await db_memorials.insertOne(memorial);

			assert.ok(response.insertedId,`Memorial should be inserted`);

			memorial._id = response.insertedId;
			response = await guest.request(memorialEndpoint);
			memorials = await db_memorials.find({ status: { $ne:'suspended' } }).toArray();
			jsonResponse = await response.json();

			assert.equal(response.status,200,`The server should return a 200 status code when a request for the public memorial endpoint is made`);
			assert.equal(jsonResponse.memorials.length,memorials.length,`The number of memorial returned by the server should be ${memorials.length}`);

			assert.equal(
				String(memorials[0]._id), 
				jsonResponse.memorials[0]._id,
				`The memorial returned by the server should have a id of ${memorials[0]._id}`
			);

			response = await db_memorials.deleteOne({ _id: memorial._id });

			assert.ok(response.deletedCount,`The memorial should have been deleted`);
		})

		responses = [
			await db_users.updateOne(
				{ _id: manager1.get_id() },
				{ $unset: { suspended:'' } }
			),
			await db_memorials.updateMany(
				{ created_by: manager1.get_id() },
				{ $unset: { status:'' } }
			)
		]

		assert.equal(responses[0].modifiedCount,1,`Unsetting the suspended field should work`);
		assert.ok(responses[1].modifiedCount, `Suspended memorial should be reset to an empty state`);
	})

	await test("Testing other operation",{ skip:false, signal: aborter.signal },async(t)=>{
		await t.test("The server should return a 200 status code along with the data for each resource endpoint of memorial not suspended",async()=>{
			let memorial = await db_memorials.find({ 
				gallery: { 
					$elemMatch: { 
						src: { 
							$exists:true 
						} 
					} 
				},
				videos:{
					$elemMatch:{
						src:{
							$exists:true
						}
					}
				}
			}).next(),
			atts = ['src','src_min'],
			videos,gallery,background_image,background_sound,image;

			assert.ok(memorial,`Memorial should not be empty`);

			videos = memorial.videos;
			gallery = memorial.gallery;
			background_image = memorial.background_image;
			background_sound = memorial.background_sound;
			image = memorial.image;

			responses = await videos.concat(gallery).reduce(async (x,y)=>{
				let urls = atts.map((att)=> y[att] + `?memorial_id=${memorial._id}`);
				x = await x;

				for(let url of urls){
					x.push(
						await guest.request(url)
					);
				}

				return x;
			},[]);

			responses.push(await guest.request(background_image + `?memorial_id=${memorial._id}`));
			responses.push(await guest.request(background_sound + `?memorial_id=${memorial._id}`));
			responses.push(await guest.request(image + `?memorial_id=${memorial._id}`));

			responses.forEach((response)=>{
				assert.equal(response.status,200, `The server should have return a 200 status code for the resource`);
			})
		})

		await t.test("Accessing a resource with a reference to a memorial_id not containing the resource should return a 404 status code",{ signal: aborter.signal }, async()=>{
			let memorials = await db_memorials.find().toArray(),
			with_resource = memorials.find((f)=> f.gallery.length),
			without_resource = memorials.find((f)=> f.gallery.length == 0),
			src;

			assert.ok(with_resource,'There should be a memorial with resources created');
			assert.ok(without_resource,'There should be a memorial without a resource');

			src = with_resource.gallery[0].src;

			response = await guest.request(`${src}?memorial_id=${without_resource._id}`);

			assert.equal(response.status,404,`The server should return a 404 status code`);
		})

		await t.test("When the user send a get request to the order endpoint it data in the order collection should be returned", async()=>{
			let orders = [ generateOrder(manager1.get_email(), 't-1'), generateOrder(manager1.get_email(), 't-1'), generateOrder(manager1.get_email(), 't-2'), generateOrder(manager1.get_email(), 'unpaid-suspended'), generateOrder(manager1.get_email(), 'processing'), generateOrder(manager2.get_email()) ],
			order,myOrders;

			orders.sort((x,y)=> x.date_created > y.date_created ? -1: 1);
			myOrders = orders.filter((order)=> order.status != 'processing' && order.email == manager1.get_email())

			await db_orders.deleteMany({});

			await db_orders.insertMany(orders);

			dateToString(orders); ObjectIdToString(orders); Decimal128ToNumber(orders);

			response = await manager1.request(orderEndpoint);
			jsonResponse = await response.json();

			assert.equal(response.status,200, `The server should return a 200 status code`);
			assert.equal(jsonResponse.orders.length, myOrders.length, `The orders array should have ${orders.length} order`);

			ObjectIdToString(jsonResponse.orders);

			for(let i=0; i < orders.length; i++){
				let order = jsonResponse.orders[i],
				_order = myOrders[i];

				assert.deepEqual(order, _order, `The order returned should be the same as those inserted in the database`);
			}

			response = await manager1.request(`${orderEndpoint}?status=t-1`);
			jsonResponse = await response.json();
			order = myOrders.filter((order)=> order.status == 't-1');
			ObjectIdToString(jsonResponse.orders);

			assert.equal(jsonResponse.orders.length, 2, `The orders array should only have 2 elements`);
			assert.deepEqual(jsonResponse.orders, order, `The orders array should be then same as the orders with the paid status`);

			response = await manager1.request(`${orderEndpoint}?status=t-2`);
			jsonResponse = await response.json();
			order = myOrders.find((order)=> order.status == 't-2');
			ObjectIdToString(jsonResponse.orders);

			assert.equal(jsonResponse.orders.length,1, `The orders array should onlye have 1 element`);
			assert.deepEqual(order, jsonResponse.orders[0], `The order returned should be the same as the unpaid order`);

			response = await manager1.request(`${orderEndpoint}?status=unpaid-suspended`);
			jsonResponse = await response.json();
			order = myOrders.find((order)=> order.status == 'unpaid-suspended');
			ObjectIdToString(jsonResponse.orders);

			assert.equal(jsonResponse.orders.length,1, `The orders array should only have 1 element`);
			assert.deepEqual(jsonResponse.orders[0], order, `The orders array should be the same as the unpaid-suspended status order`);
		})

		await t.test("The order should be updated to paid when the user successfull pay an unpaid-suspended order", async()=>{
			let order = await db_orders.find({ email: manager1.get_email(), status:'unpaid-suspended' }).next(),
			card = manager1.get_payment_card(),
			url = orderPaymentEndpoint.replace(':order_id', order._id.toString());

			assert.ok(order);

			Decimal128ToNumber(order);

			card.update_amount(0);
			await card.update_card_in_db(db_cards);

			response = await manager1.request(url, { method:'PUT' });

			assert.equal(response.status, 400, `The server should return a 404 status code when the payment coudln't be done`);

			card.update_amount(order.price);
			await card.update_card_in_db(db_cards);

			response = await manager1.request(url, { method:'PUT' });
			order = await db_orders.find({ _id: order._id }).next();

			assert.equal(response.status, 201, `The server should return a 201 status code because the user card as enought money`);
			assert.equal(order.status, 'paid');
		})
	})

	await test("Testing admin operation", { skip:false, signal: aborter.signal }, async(t)=>{

		await t.test("Testing Abonnement operation", async(t)=>{
			await t.test("The admin should be able to add new abonnement",async()=>{
				let abonnement = generateAbonnement();

				abonnement.price = Number(abonnement.price);

				response = await admin1.request_json(abonnementEndpoint,{
					method:'POST',
					body: abonnement
				});
				jsonResponse = await response.json();

				assert.equal(response.status, 201, `The server should return a 201 status code after the admin post a new abonnement`);
				assert.ok(jsonResponse.insertedId,`The response returned by the server should contain an insertedId`);

				response = await db_abonnements.find({ type: abonnement.type }).next();

				response.price = Number(response.price);
				delete response._id;

				assert.deepEqual(abonnement,response,`The abonnement inserted should be equal to the abonnement sent`);
			});

			await t.test("The admin should be able to edit abonnement",async()=>{
				let abonnement = await db_abonnements.find().sort("_id",-1).next(),
				url = `${abonnementEndpoint}/${abonnement._id.toString()}`;

				let new_abonnement = {
					type: 'capexdonavant',
					price: abonnement.price * 2,
					maxMemorial: abonnement.maxMemorial * 10,
					maxTribute: abonnement.maxTribute * 30
				}

				response = await admin1.request_json(url,{
					method:'PUT',
					body: new_abonnement
				})

				abonnement = {...abonnement, ...new_abonnement }

				assert.equal(response.status,201,`After the admin update the abonnement information the server should return a 201 status code`);

				response = await db_abonnements.find({ _id: abonnement._id }).next();

				response.price = Number(response.price);
				delete abonnement._id; delete response._id;

				assert.deepEqual(abonnement,response,`After the admin update abonnement information those information should be reflected in the database`);
			})
		})

		await t.test("Testing User management", async (t)=>{

			await t.test("When the admin issue a get request to the user endpoint the list of user in the database should be returned",async()=>{
				let users = await db_users.find().toArray();

				response = await admin1.request(userEndpoint);
				jsonResponse = await response.json();

				assert.equal(response.status,200, `The server should return a 200 status code`);
				assert.equal(jsonResponse.users.length,users.length, `The returned data should be the same as those retrieve from the database`);
			})

			await t.test("The admin should be able to create new admin user only",async (t)=>{
				let userLength = await db_users.countDocuments(),
				users = [ generateUser({ role:'manager' }), generateUser({ role:'admin' }) ],
				newLength, sentUser,manager_user;

				responses = await Promise.sequence(
					...users.map((data, index)=> {
						let user = index == 0 ? manager1 : admin1;

						return ()=> user.request_json(userEndpoint,{
							method:'POST',
							body: data
						})
					})
				);

				responses.forEach((response, index)=>{
					let status = index == 0 ? 403 : 201,
					role = index == 0 ? 'manager':'admin';

					assert.equal(response.status, status, `The server should return a ${status} status code when an ${role} try to insert an user`);
				})

				sentUser = await db_users.find().sort('_id',-1).next();
				newLength = await db_users.countDocuments();

				delete sentUser._id;

				for(let name in users[1]){
					let method = 'equal',
					message = `The user ${name} field should be equal to ${users[1][name]}`;

					if(name == 'password'){
						method = 'notEqual';
						message = `The field ${name} should be encrypted`;
					}

					assert[method](sentUser[name], users[1][name], message);
				}

				userLength++;

				assert.ok(sentUser.date_created, `The date_created field should be set`);
				assert.equal(sentUser.resources, undefined, `The resources field should not be defined for admin user`);

				assert.equal(userLength, newLength, `The database should have ${userLength} records`);
			})

			await t.test("The admin should be able to modify the user informations but not the email of managers",async ()=>{
				let users = await db_users.find().toArray(),
				admin = users.filter((user)=> user.role == 'admin')[0],
				manager = users.filter((user)=> user.role == 'manager')[0],
				modif_1 = { email:'litonie@facebook.com', password:'budapest' },
				modif_2 = { email:'bangladesh@facebook.com', password:'minesota' },
				manager_2,admin_2;

				responses = await Promise.sequence(
					()=> admin1.request_json(`${userEndpoint}/${admin._id}`,{
						method:'PUT',
						body: modif_1
					}),
					()=> admin1.request_json(`${userEndpoint}/${manager._id}`,{
						method:'PUT',
						body: modif_2
					})
				);

				responses.forEach((response,index)=>{
					let status = index == 0 ? 201: 400,
					role = index == 0 ? 'admin': 'manager'

					assert.equal(response.status, status, `The modification of a user should return a ${status} for ${role} status code`);
				})

				users = await db_users.find({ _id: { $in: [admin._id, manager._id] } }).toArray();
				admin = users.filter((user)=> user.role == 'admin')[0]
				manager_2 = users.filter((user)=> user.role == 'manager')[0];

				for(let name in modif_1){
					let value = modif_1[name];

					assert.equal(value, admin[name], `The modified field ${name} should be equal to ${value}`);
				}

				for(let name in modif_2){
					let value = modif_2[name];

					assert.notEqual(value, manager[name], `The field ${name} should not have been modified for the manager user because the user tried to update the email of the manager`);
				}
			})

			await t.test("The admin should be able to delete admin",async ()=>{
				let admin = await db_users.find({ role:'admin' }).sort('_id',-1).next();

				response = await admin1.request(`${userEndpoint}/${admin._id}`,{
					method:'DELETE',
				});

				assert.equal(response.status,201, `The server should return a 201 status code when an admin sent a delete request`);

				response = await db_users.find({ _id: admin._id }).next();

				assert.equal(response, undefined, `The admin delete should be removed from the database`);
			})

			await t.test("Sending a delete request for a manager should suspend that manager if he has memorial created by him, otherwise the manager should be removed",async ()=>{
				let manager_with_memorial = await db_users.find({ "resources.memorialCreated": { $gt:0 } }).next(),
				manager_without_memorial = await db_users.find({"resources.memorialCreated": 0}).next();

				responses = await Promise.all(
					[
						manager_with_memorial, 
						manager_without_memorial
					].map((manager)=> admin1.request(`${userEndpoint}/${manager._id}`,{
					method:'DELETE'
				})));

				responses.forEach((response)=>{
					assert.equal(response.status, 201, `The server should return a 201 status code to the delete request from an admin`);
				})

				responses = await Promise.sequence(
					()=> db_users.find({ _id: manager_without_memorial._id }).next(),
					()=> db_users.find({ _id: manager_with_memorial._id }).next(),
					()=> db_memorials.find({ created_by: manager_with_memorial._id }).toArray()
				);

				assert.equal(responses[0], undefined, `The manager_without_memorial memorial should have been deleted from the database`);
				assert.equal(responses[1].suspended, true, `The manager with memorial should have been suspended`);
				assert.ok(responses[2].length, `The should not be empty memorial returned`);
				responses[2].forEach((memorial)=>{
					assert.equal(memorial.status, 'suspended', `The memorial of suspended manager should all be have a status set to suspended`);
				})
			})
		})

		await t.test("Testing Transaction viewing", async (t)=>{
			await t.test("The admin should be able to view all the transaction that occured in the order collection",async()=>{
				let orders = await db_orders.find().sort('date_created',-1)
				.project({
					_id: { $toString:"$_id" },
					abonnementId: { $toString:"$abonnementId" },
					date_created:1, due_date:1, status:1, price:1, currency:1, abonnementType:1, email:1
				})
				.toArray();

				Decimal128ToNumber(orders); dateToString(orders);

				response = await admin1.request(orderEndpoint);
				jsonResponse = await response.json();

				assert.equal(response.status,200,`The server should return a 200 status code when the admin sent a get request to the orderEndpoint`);

				assert.equal(jsonResponse.orders.length,orders.length, `The server should return the same order infromation that are in the database`);

				for(let i=0; i < orders.length; i++){
					let order = orders[i],
					r_order = jsonResponse.orders[i];

					assert.deepEqual(r_order, order, `The server should return the same information that are in the order database`);
				}
			})

			await t.test("When the admin put filter in the query it should only be able to see order with the given status",async()=>{
				let length = await db_orders.countDocuments({ status:'unpaid-suspended' });

				response = await admin1.request(`${orderEndpoint}?status=unpaid-suspended`);
				jsonResponse = await response.json();

				assert.equal(response.status,200, `The server should return a 200 status code`);
				assert.equal(jsonResponse.orders.length, length, `The server should return ${length} transaction order`);

				response = await admin1.request(`${orderEndpoint}?status=new`);
				jsonResponse = await response.json();

				assert.equal(response.status,200, `The server should return a 200 status code`);
				assert.equal(jsonResponse.orders.length,0, `The server should return a empty order`);

				await db_orders.updateMany({ }, { $set: { status:'t-1' } });
				length = await db_orders.countDocuments({ status: 't-1' });

				response = await admin1.request(`${orderEndpoint}?status=t-1`);
				jsonResponse = await response.json();

				assert.equal(response.status, 200, `The server should return a 200 status code`);
				assert.equal(jsonResponse.orders.length, length, `The server should return ${length} transaction order`);

				response = await admin1.request(`${orderEndpoint}?status=unpaid-suspended`);
				jsonResponse = await response.json();

				assert.equal(response.status, 200, `The server should return a 200 status code`)
				assert.equal(jsonResponse.orders.length,0,`The server should an empty order transaction`);
			})
		})
	})
}
catch(error){
	errors.push(error);
}

let collectionToDrop = ['users','memorials','tributes','paiements','cards','orders','otps','sessions'];

await Promise.all(collectionToDrop.map((collection)=> db.collection(collection).deleteMany({}).catch(console.error)));
await restoreAbonnements(db_abonnements, default_abonnements).catch(console.error);

client.close();
await Pop_Service.close().catch(console.error);
await Pop_Service.delete_messages().catch(console.error);

if(errors.length){
	throw errors;
}