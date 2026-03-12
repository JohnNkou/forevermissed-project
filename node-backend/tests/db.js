import { generateUser, generateMemorial, generateOrder, generateAbonnement, getEnvData } from './utils.js'
import test from 'node:test'
import assert from 'node:assert'
import { ObjectId } from 'mongodb'
import { scheduler } from 'node:timers/promises'

getEnvData();

const { DB_NAME, OTP_EXPIRATION } = process.env,
client 		= await import('./conn.js').then((d)=> d.default),
db 					= client.db(DB_NAME),
db_users 			= db.collection('users'),
db_memorials 		= db.collection('memorials'),
db_tributes  		= db.collection('tributes'),
db_orders 			= db.collection('orders'),
db_abonnements 		= db.collection('abonnements'),
db_otps				= db.collection('otps'),
collections 		= ['users','memorials','tributes','orders'],
defaultMonitor		= await client.db().admin().command({ getParameter:1, ttlMonitorSleepSecs:1 }).then((t)=> t.ttlMonitorSleepSecs);

let response,responses,error;

try{
		await test("Testing database validator",async (t)=>{
			await t.test("Testing user collection validator", async (t)=>{
				const required = ['name','email','role','date_created'];

				function generate(){
					return {
						...generateUser(),
						date_created: new Date()
					}
				}

				await t.test("When required properties are missing the server should throw an error and not insert passed data", async()=>{
					let user = generate();

					for(let field of required){
						let data = {...user};

						delete data[field];

						await assert.rejects(()=> db_users.insertOne(data), `The insert operation should throw because the field ${field} is missing`);
					}
				})

				await t.test("When the data passed to the insertOperation contain bad type the server should throw", async()=>{
					let data = [
						{ name:'role', value:'calecon' },
						{ name:'role', value:'tombo' },
						{ name:'date_created', value:'vendredi' },
						{ name:'email', value:'tombola' }
					],
					user = generate();

					for(let { name, value } of data){
						let d = {...user, [name]: value};

						await assert.rejects(()=> db_users.insertOne(d), `The insert operation should throw because the field ${name} has bad value ${value}`);
					}
				})

				await t.test("The collection should not allow two user with the same email",async()=>{
					let user = generate();

					response = await db_users.insertOne(user);

					assert.ok(response.insertedId, `insertedId should be defined`);

					user.name = 'bagar'; user.role='manager';
					delete user._id;

					await assert.rejects(()=> db_users.insertOne(user), `Duplicate email should not be allowed`);
				})
			})

			await t.test("Testing memorial validator",async(t)=>{
				const required = ['birth_date','birth_place','gallery','videos','created_by','date_created','date_updated','view_count','name'];

				function generate(){
					let memorial = generateMemorial().toJSON();

					for(let name in memorial){
						if(name.includes('date')){
							let value = memorial[name];

							if(!(value instanceof Date)){
								memorial[name] = new Date(value);
							}
						}
					}

					memorial.date_created = new Date();
					memorial.date_updated = new Date();
					memorial.created_by = new ObjectId();
					memorial.videos = [];
					memorial.gallery = [];
					memorial.view_count = 0;

					return memorial;
				}

				await t.test("When the required field are missing the database should throw",async(t)=>{
					const memorial = generate();

					for(let field of required){
						let data = { ...memorial };

						delete data[field];

						await assert.rejects(()=> db_memorials.insertOne(data), `The insert operation should throw because the field ${field} is missing`)
					}
				})

				await t.test("When the field passed have bad type the database should throw",async ()=>{
					const memorial = generate();
					let bad_types = [
						{ name:'birth_date', value:13 },
						{ name:'death_date', value:15 },
						{ name:'view_count', value:'jeudi' },
						{ name:'view_count', value:-10 },
						{ name:'created_by', value:'tarzan' },
						{ name:'date_created', value:'momo' },
						{ name:'date_updated', value:56 },
						{ name:'videos', value:2 },
						{ name:'gallery', value:'purple' }
					];

					for(let { name,value } of bad_types){
						let data = {...memorial, [name]: value};

						await assert.rejects(()=> db_memorials.insertOne(data), `The insert operation should throw because the field ${name} contain a bad value ${value}`)
					}
				})

				await t.test("The server should not allow duplicate names", async()=>{
					let memorial = generate();

					response = await db_memorials.insertOne(memorial).catch((error)=>{
						console.error(error.errInfo.details.schemaRulesNotSatisfied[0]);

						throw error;
					});

					assert.ok(response.insertedId,'The insertedId should be returned');

					await assert.rejects(()=> db_memorials.insertOne(memorial), `The database should throw on duplicate memorial`);
				})
			})

			await t.test("Testing order validator", async(t)=>{
				const required = ['abonnementId', 'abonnementType','email','price','currency','date_created','status'];

				await t.test("When required field are missing the database should throw", async()=>{
					const order = generateOrder();

					for(let field of required){
						let data = {...order};

						delete data[field];

						await assert.rejects(()=> db_orders.insertOne(data), `The insert operation should throw because the field ${field} is missing`)
					}
				})

				await t.test("When the data have bad type the server should throw", async()=>{
					const order = generateOrder();
					let bad_types = [
						{ name:'abonnementId', value:'purple' },
						{ name:'email', value: 'poncathas' },
						{ name:'price', value:'jourdain' },
						{ name:'currency', value:'BAUDIN' },
						{ name:'date_created', value:'colar' },
						{ name:'status', value:'bibe' }
					]

					for(let { name,value } of bad_types){
						let data = {...order, [name]: value };

						await assert.rejects(()=> db_orders.insertOne(data), `The insert operation should throw because the field ${name} has bad value ${value}`)
					}
				})

				await t.test("Two order shouldn't have the same abonnementId, email and date_created information", async()=>{
					const order = generateOrder();

					response = await db_orders.insertOne({...order}).catch((error)=>{
						console.log('ERROR',error.errInfo.details.schemaRulesNotSatisfied);
						throw error;
					});

					assert.ok(response.insertedId);

					order.currency = 'CDF';

					await assert.rejects(()=> db_orders.insertOne(order), `Duplicate order with the same abonnementId, email and date_created information shoulnd't not be inserted in the database`)
				})
			})

			await t.test("Testing Abonnement validator",async(t)=>{
				const required = ['type','maxVideo','maxPicture','maxMemorial','frequency','currency','price','maxTribute'];

				await t.test("When the required field are missing the database should throw when inserting", async()=>{
					const abonnement = generateAbonnement();

					for(let field of required){
						let data = { ...abonnement };

						delete data[field];

						await assert.rejects(()=> db_abonnements.insertOne(data),`The insert operation shoudl throw because the field ${field} is required`);
					}
				})

				await t.test("When the data passed to the insert method has bad type the database should throw", async()=>{
					const abonnement = generateAbonnement();
					let bad_types = [
						{ name:'type', value:35 },
						{ name:'maxVideo', value:'trois' },
						{ name:'maxPicture', value:'vinght' },
						{ name:'frequency', value:15 },
						{ name:'currency', value:'23' },
						{ name:'price', value:'56' },
						{ name:'maxTribute', value:'vinght' }
					]

					for(let { name,value } of bad_types){
						let data = { ...abonnement, [name]: value }

						await assert.rejects(()=> db_abonnements.insertOne(data), `The insert operation should throw because the field ${name} has a bad type ${value}`);
					}
				})

				await t.test("The database should not allow two abonnement from having the same type field", async()=>{
					let abonnement = generateAbonnement();

					response = await db_abonnements.insertOne({...abonnement});

					assert.ok(response.insertedId);

					await assert.rejects(()=> db_abonnements.insertOne(abonnement), `The server should reject an attemps to insert duplicate abonnement with the same type ${abonnement.type}`); 
				})
			})
		})

		await test("Testing OTP Expiration", async (t)=>{
			let db = client.db().admin(),
			defaultMonitor

			await db.command({ setParameter:1, ttlMonitorSleepSecs:Number(OTP_EXPIRATION) });

			await t.test("After the expiration_second have passed the database should delete the OTP", async()=>{
				response = await db_otps.insertOne({ code:'1243', email:'volupté@gmail.com', date_created: new Date(), status:'processing' });

				assert.ok(response.insertedId);

				await scheduler.wait((Number(OTP_EXPIRATION) * 1000) * 2);

				response = await db_otps.countDocuments();

				assert.equal(response,0, `After the OTP_EXPIRATION ${OTP_EXPIRATION} second have passed the otp should be removed`);
			})
		})
}
catch(err){
	error = err;
}

await Promise.all(collections.map((collection)=> db.collection(collection).deleteMany({}).catch(console.error)));

await client.db().admin().command({ setParameter:1, ttlMonitorSleepSecs: defaultMonitor })

await client.close();

if(error){
	throw err;
}