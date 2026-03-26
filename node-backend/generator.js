import { generateOrder, generateUser, generateMemorial, generateTribute, getEnvData, generatePassword, getExpirationDate, generatePictureData, generateVideoData } from './tests/utils.js'
import cluster from 'node:cluster'
import os from 'node:os'
import { faker } from '@faker-js/faker'
import fsP from 'node:fs/promises'
import fs from 'node:fs';
import { scheduler } from 'timers/promises'

const args = process.argv.slice(2).reduce((data,arg)=>{
	let [key,value] = arg.split('=');

	key = key.replace('--','');
	value = Number(value);

	if(Number.isNaN(value)){
		throw Error(`key ${key} has not number arg`);
	}

	switch(key){
	case 'users':
	case 'orders':
	case 'tributes':
	case 'memorials':
	case 'pictures':
	case 'videos':
		data[key] = value;
		break;
	default:
		throw Error(`Unknwon key ${key}`)
	}

	return data;
}, { }),
cores = os.availableParallelism();

function wait(){
	return scheduler.wait(Math.floor(Math.random() * 100));
}

function getLogger(name){
	return console.log.bind(console,name);
}

function timeIt(fn){
	let then = Date.now(),
	r = fn();

	if(r instanceof Promise){
		return r.then((d)=>{
			let elapsed = Date.now() - then;

			return elapsed
		})
	}
	else{
		return (Date.now() - then);
	}
}

async function repeatOperation(fn,repeat=10){
	let result;
	for(let i=0; i < repeat; i++){
		result = await fn();

		if(result){
			if(result instanceof Array){
				if(result.length){
					break;
				}
			}
			else{
				break;
			}
		}

		await wait();
	}

	return result;
}

if (cluster.isPrimary) {
	let tasks = Array.from({ length:cores }).map(()=> ({}))

	for(let name in args){
		let value = args[name],
		division;

		if(value >= cores){
			division = Math.floor(value / cores);

			tasks.forEach((env,index)=>{
				env.core_number = index;
				env[name] = division;
			})
		}
		else{
			tasks.slice(0, value).forEach((env,index)=>{
				env.core_number = index;
				env[name] = 1;
			})
		}
	}

	tasks.forEach((env)=>{
		if(Object.keys(env).length){
			let worker = cluster.fork(env);

			worker.on('error',(error)=>{
				console.error('WORKER ERROR', error);
			})
			worker.on('exit',()=>{
				console.log("Worker exited");
			})
		}
	})

}
else{
	getEnvData('');

	process.env.MIN_POOL_SIZE = 1000;
	process.env.MAX_POOL_SIZE = 10000;

	const { DB_NAME, APP_URL, users, memorials, tributes, orders, pictures, videos } 	= process.env;
	const Client 		= await import('./src/conn.js').then((d)=> d.default),
	db 					= Client.db(DB_NAME),
	db_tributes 		= db.collection('tributes'),
	db_users			= db.collection('users'),
	db_memorials		= db.collection('memorials'),
	db_orders			= db.collection('orders'),
	db_abonnements		= db.collection('abonnements'),
	db_progress			= db.collection('progress'),
	abonnements 		= await db_abonnements.find().toArray(),
	tasks 				= [],
	root 				= process.cwd(),
	core_number			= Number(process.env.core_number),
	logger				= getLogger(`core_number=${core_number}`);

	if(Number.isNaN(core_number)){
		console.log('EVN',process.env.core_number, Number(process.env.core_number));
		throw Error("core_number should be defined")
	}

	if(users){
		let data = await Promise.all(Array.from({ length: users }).map((_)=> {
			let user = generateUser(),
			index = Math.floor((Math.random() * abonnements.length)),
			abonnement = abonnements[index],
			frequency = abonnement.frequency[0];

			user.email  = index += user.email;

			user.abonnement = {
				id: abonnement._id,
				type: abonnement.type,
				frequency: frequency,
				date_created: new Date(),
				expiration_date: getExpirationDate(new Date(), frequency),
				checking: false
			};
			user.resources = {
				videoSent:			0,
				pictureSent:		0,
				minuteSent:			0,
				memorialCreated: 	0,
				tributeSent:		0
			};
			user.date_created = faker.date.recent({days: 7300});
			user.maxMemorial = abonnement.maxMemorial;
			user.maxTribute = abonnement.maxTribute;
			user.maxPicture = abonnement.maxPicture.number;
			user.maxVideo = abonnement.maxVideo.number;
			user.hasMemorialRoom = true;
			user.hasTributeRoom = true;
			user.hasPictureRoom = true;
			user.hasVideoRoom = true;

			return generatePassword('admin1').then((password)=>{
				user.password = password;

				return user;
			})
		}));

		await db_progress.updateOne(
			{ 'users': { $exists:true } },
			{ $inc: { 'users': data.length } },
			{ upsert:true }
		)

		tasks.push(
			doWork(data, (work)=> db_users.insertMany(work, { ordered:false })).
			then(()=> db_progress.updateOne(
				{ users:{  $exists:true }},
				{ $inc: { 'users': data.length * -1} }
			)).then(()=>{
				console.log(`core_number:${core_number}. Finished adding ${users} users`);
			})
		);
	}

	if(memorials){
		if(users){
			await Promise.all(tasks);
		}

		function createMemorial(userId){
			let memorial = generateMemorial().toJSON(),
			bg_index = Math.floor(Math.random() * 10) % bgs.length,
			ps_index = Math.floor(Math.random() * 10) % ps.length,
			bg = bgs[bg_index],
			pi = ps[ps_index],
			background_image = memorial.background_image,
			image = memorial.image;

			memorial.date_created = memorial.date_updated = faker.date.recent({ days:3000 });
			memorial.view_count = 0;
			memorial.created_by = userId;

			memorial.image = `${APP_URL}/api/resources/${image}`;
			memorial.background_image = `${APP_URL}/api/resources/${background_image}`;
			memorial.gallery = [];
			memorial.videos = [];

			for(let name in memorial){
				if(name.includes('date')){
					memorial[name] = new Date(memorial[name]);
				}
			}

			fsP.symlink(`./${bg}`, `${root}/tests/resources/${background_image}`);
			fsP.symlink(`./${pi}`, `${root}/tests/resources/${image}`);

			return memorial;
		}

		await db_users.createIndex({ date_created:-11, lock:1, hasMemorialRoom:1 });

		let total = memorials,
		data = [],
		max = {},
		bgs = ['bg-1.jpg','bg-2.jpg','bg-3.jpg'],
		ps = ['p-1-min.jpg', 'p-2-min.jpg','p-3-min.jpg','p-4-min.jpg'],
		lockQuery = {},
		stages = [
			{
				$match:{
					lock: lockQuery, hasMemorialRoom:true
				}
			},
			{
				$project:{ abonnementId:"$abonnement.id", maxMemorial:1, memorialCreated:"$resources.memorialCreated", date_created:1 }
			},
			{
				$sort:{ date_created:-1 }
			}
		],r;

		while(total){
			let lock = Math.random(),
			userLength,skip,limit,_users,ids,args;

			lockQuery['$exists'] = false;

			userLength = await repeatOperation(
				()=> db_users.aggregate([
					...stages,
					{ $count:"total" }
				]).next().then((d)=> d && d.total || 0),
				5
			)

			if(!userLength){
				let r = await repeatOperation(
					()=> db_progress.findOne({ users:0 }),
					1
				);

				if(r){
					console.log("No user with the capacity to add memorial were found");

					break;
				}
				else{
					continue;
				}
			}
			
			limit = Math.floor(userLength / cores);

			if(limit > 0){
				skip = core_number * limit;
			}
			else{
				skip =  Math.floor(Math.random() * userLength);
				limit = 1;
			}

			/*console.log("core_number", core_number);
			console.log("userLength", userLength);
			console.log("memorials", memorials);
			console.log("skip", skip);
			console.log("limit", limit);

			process.exit(0);*/

			args = stages.concat([
				{ $skip: skip },
				{ $limit: limit }
			])

			_users = await repeatOperation(
				()=> db_users.aggregate(args).toArray()
			)

			ids = _users.map((u)=> u._id);

			//logger(`Got user on first try ${JSON.stringify(ids)}`, lock);
			
			let updateResult = await db_users.updateMany(
				{ _id: { $in: ids }, lock: lockQuery },
				{ $set: { lock } }
			);

			if(updateResult.modifiedCount != _users.length){
				lockQuery['$eq'] = lock;
				delete lockQuery['$exists'];

				_users = await repeatOperation(
					()=> db_users.aggregate(args.slice(0,-2)).toArray()
				);

				ids = _users.map((u)=> u._id);

				//logger(`Failed to set lock. Retrieve new users ${JSON.stringify(ids)}. with args ${JSON.stringify(args)}`);
			}

			if(_users.length){
				for(let user of _users){
					let userId = user._id.toString(),
					abonnementId = user.abonnementId,
					my_max = max[userId],
					memorialCreated = user.memorialCreated;

					if(!my_max){
						if(my_max == undefined){
							max[userId] = my_max = user.maxMemorial - memorialCreated;
						}
						else{
							continue;
						}
					}

					let r = await db_users.updateOne({ _id: user._id, "resources.memorialCreated": memorialCreated }, { $inc: {"resources.memorialCreated": 1}, $set: { hasMemorial: true } });

					if(r.modifiedCount){
						total--; my_max--;
						data.push(createMemorial(user._id));

						max[userId] = my_max;

						if(!my_max){
							await db_users.updateOne(
								{ _id: user._id },
								{ $set: { hasMemorialRoom:false } }
							);
						}

						if(!total){
							break;
						}
					}
				}

				await db_users.updateMany(
					{ _id: { $in: ids } },
					{ $unset: { lock : '' } }
				).then((r)=>{
					let reste = ids.length - r.modifiedCount;
					if(reste){
						logger(`${reste} users couldn't unlock`);
					}
					/*else{
						logger(`Unset the lock for ids ${JSON.stringify(ids)}`);
					}*/
				})
			}
			else{
				r = await repeatOperation(
					()=> db_progress.findOne({ users:0 }),
					1
				)

				if(r){
					console.log(`core_number:${core_number}. No user found for creating memorial. Breaking`);
					break;
				}
			}
		}

		await db_progress.updateOne(
			{ memorials: { $exists:true } },
			{ $inc: { memorials: data.length } },
			{ upsert:true }
		)

		tasks.push(doWork(data, (work)=> db_memorials.insertMany(work, { ordered:false })).
			then(()=> db_progress.updateOne(
				{ memorials: { $exists:true } },
				{ $inc: { memorials: data.length * -1 } }
			)).then(()=>{
				console.log(`core_number:${core_number}. Finished adding ${memorials} memorials`);
			}));
	}

	if(tributes){
		function createTribute(memorial_id){
			let tribute = generateTribute();

			tribute.memorial_id = memorial_id;
			tribute.date_created = faker.date.recent({ days:1000 });

			return tribute;
		}

		if(memorials){
			await Promise.all(tasks);
		}

		await db_users.createIndex({ date_created:-1, lock:1, hasMemorial:1, hasTributeRoom:1 });

		let total = tributes,
		data = [],
		max = {},
		lockQuery = {},
		stages = [
			{ 
				$match: { 
					lock: lockQuery,
					hasTributeRoom:true,
					hasMemorial: true
				} 
			}
		],
		projectStage = {
			date_created:1, 
			maxTribute:1, 
			tributeSent:"$resources.tributeSent", 
			memorials: {
				$map:{
					input:"$memorials",
					as: "item",
					in: { _id:"$$item._id" }
				}
			}
		},
		memorialLookup = {
			from:"memorials",
			localField: "_id",
			foreignField: "created_by",
			as: "memorials"
		},
		bb = Date.now(),
		times = 0,
		retry = 0,
		go = true;

		while(total){
			let lock = Math.random(),
			elapsed = (Date.now() - bb) > 3000,
			r;

			if(elapsed){
				bb = Date.now();
			}

			if(elapsed){
				console.log(`core_number:${core_number}. times=${times++}. retry=${retry}. tributes=${tributes}. total=${total}. Creation tributes`);
				retry = 0;
			}
			else{
				times = 0;
			}

			lockQuery['$exists'] = false;

			let args = [
				...stages,
				{ $count: "total" }
			],
			count,_users,skip,limit,ids;

			elapsed = await timeIt(async ()=> count = await repeatOperation(
				()=> db_users.aggregate(args).next().then((d)=> d && d.total || 0)
			))

			if(elapsed > 10000){
				console.log(`It took ${elapsed} ms to run aggregate count`);
			}

			if(count){
				if(count >= cores){
					limit = Math.floor(count / cores)
					skip = core_number * limit
				}
				else{
					skip = Math.floor(Math.random() * count);
					limit = 1;
				}

				args = [
					...stages,
					{ $sort:{ date_created:-1 } },
					{ $skip: skip },
					{ $limit: limit },
					{ $lookup: memorialLookup },
					{ $project: projectStage },
				]

				/*console.log('count',count);
				console.log('core_number', core_number);
				console.log('skip',skip);
				console.log('limit',limit);
				console.log('STAGES',JSON.stringify(args));*/

				elapsed = await timeIt(async()=>{
						_users = await repeatOperation(
							()=> db_users.aggregate(args).toArray()
						)
					});

				if(elapsed > 10000){
					logger(`It took ${elapsed} ms to run aggregate command`);

					if(go){
						console.log('ARGS', JSON.stringify(args));
						go = false;
					}
				}

				ids = _users.map((m)=> m._id);

				if(_users.length){
					let r = await db_users.updateMany(
						{ _id: { $in: ids }, lock: lockQuery },
						{ $set: { lock } }
					);

					if(r.modifiedCount != ids.length){
						lockQuery['$eq'] = lock;
						delete lockQuery['$exists'];

						args = args.filter((arg)=> !arg['$skip'] || !arg["$limit"]);

						elapsed = await timeIt(async ()=>{
								_users = await db_users.aggregate(
									args.slice(0,stages.length).concat(args.slice(-2))
									).toArray();
							});

						if(elapsed > 10000){
							logger(`It took ${elapsed} ms to run aggregate command 2`);
						}

						ids = _users.map((m)=> m._id);
					}

					for(let user of _users){
						for(let memorial of user.memorials){
							let creator_id = user._id.toString(),
							my_max = max[creator_id],
							tributeSent = user.tributeSent,
							maxTribute = user.maxTribute

							if(!my_max){
								if(my_max == undefined){
									my_max = max[creator_id] = maxTribute - tributeSent;

									if(!my_max){
										continue;
									}
								}
								else{
									continue;
								}
							}

							let r = await db_users.updateOne(
								{ _id: user._id, "resources.tributeSent": tributeSent }, 
								{ 
									$inc: { "resources.tributeSent": 1 } 
								}
							);

							if(r.modifiedCount){
								total--; my_max--;
								data.push(createTribute(memorial._id));

								max[creator_id] = my_max;

								if(!my_max){
									await db_users.updateOne(
										{ _id: user._id },
										{ $set: { hasTributeRoom:false } }
									)
								}

								if(!total){
									break;
								}
							}
						}

						if(!total){
							break;
						}
					}

					await db_users.updateMany(
						{ _id: { $in: ids } },
						{ $unset: { lock:'' } }
					)
				}
				else{
					r = await repeatOperation(
						()=> db_progress.find({
							$or: [ { users:0 }, { memorials:0 } ]
						}).toArray(),
						1
					);

					if(elapsed){
						console.log(`core_number=${core_number}. R Operation UU ${r.length}`)
					}

					if(r.length == 2){
						console.log("No data with maxTribute less then tributeSent was found. Breaking");
						break;
					}
					else{
						retry++;
						continue;
					}
				}
			}
			else{
				r = await repeatOperation(
					()=> db_progress.find({
						$or: [ { users:0 }, { memorials:0 } ]
					}).toArray(),
					1
				)

				if(elapsed){
					console.log(`core_number:${core_number}. R operation ${r.length}`)
				}

				if(r.length == 2){
					console.log("No more memorial with no lock");
					break;
				}

				retry++;
			}
		}

		tasks.push(doWork(data, (work)=> db_tributes.insertMany(work, { ordered:false })).then(()=>{
			console.log(`core_number:${core_number}. Finished adding ${tributes} tributes`);
		}));
	}

	if(orders){
		if(users){
			await Promise.all(tasks);
		}

		let _users = await db_users.find({ role:'manager' }).limit(10000).toArray(),
		data = Array.from({ length: orders }).map((_,index)=>{
			let order = generateOrder(),
			user = _users[index % _users.length],
			stats = ['paid', 'unpaid-suspended'];

			order.email = user.email;
			order.abonnementId = user.abonnement.id;
			order.abonnementType = user.abonnement.type;
			order.status = stats[Math.floor(Math.random() * stats.length)];
			order.due_date = faker.date.recent({ days:30000 })

			return order;
		})

		tasks.push(doWork(data, (work)=> db_orders.insertMany(work, { ordered:false })));
	}

	if(pictures || videos){
		if(memorials || users){
			await Promise.all(tasks);
		}

		if(pictures){
			const data = await addResources('picture', pictures);

			tasks.push(doWork(data, (work)=> db_memorials.bulkWrite(work)));
		}

		if(videos){
			const data = await addResources('video', videos);

			tasks.push(doWork(data, (work)=> db_memorials.bulkWrite(work)));
		}
	}

	await Promise.all(tasks);

	
	Client.close();

	process.exit(0);

		function doWork(data, fn){
		let works = [],
		chunk = 50;

		for(let i=0; i < data.length; i += chunk){
			works.push(data.slice(i, i + chunk));
		}

		return Promise.all(works.map((work)=> fn(work).catch((error)=>{
			console.log(JSON.stringify(error.writeErrors[0].err));

			throw error;
		})))
	}

	async function addResources(type, number){
		if(!type){
			throw Error("No type provided");
		}

		const pictureFiles = ['p-1.jpg','p-2.jpg','p-3.jpg','p-4.jpg'],
		videoFiles = ['1.MOV','2.MOV','3.MOV','4.MOV'],
		isPicture = type == 'picture',
		isVideo = type == 'video';

		let total = number,
		data = [],
		max = {},
		resourceGenerator,ext,files,memorialResourceName,userResourceName,resourceMaxAccess;

		if(isPicture){
			resourceGenerator = generatePictureData;
			ext = 'jpg';
			files = pictureFiles;
			memorialResourceName = 'gallery';
			userResourceName = 'resources.pictureSent';
			resourceMaxAccess = 'maxPicture.number';
		}
		else if(isVideo){
			resourceGenerator = (number, options={}) => generateVideoData(number, options);
			ext = 'mov';
			files = videoFiles;
			memorialResourceName = 'videos'
			userResourceName = 'resources.videoSent';
			resourceMaxAccess = 'maxVideo.number';
		}
		else{
			throw Error("Unknwon type: "+type);
		}

		console.log(`Total is ${total}. core_number:${core_number}`);

		await db_users.createIndex({ date_created:-1, lock:1, hasMemorial:1, hasPictureRoom:1 });
		await db_users.createIndex({ date_created:-1, lock:1, hasMemorial:1, hasVideoRoom:1 });

		while(total){
			let resourceMax = isPicture ? "$maxPicture" : "$maxVideo",
			resourceCreated = isPicture ? "$resources.pictureSent": "$resources.videoSent",
			roomChecker = isPicture ? 'hasPictureRoom': 'hasVideoRoom',
			lockQuery = { $exists:false },
			stages = [
				{ 
					$match: { 
						lock: lockQuery, 
						hasMemorial:true,
						[roomChecker]: true
					} 
				}
			],
			projectStage = {
				sent:resourceCreated, max:resourceMax, date_created:1, memorials:1 
			},
			memorialLookup = {
				from:"memorials",
				localField:"_id",
				foreignField:"created_by",
				as:"memorials"
			},
			lock = Math.random(),
			count, _users, ids,skip,limit,r,args;

			count = await repeatOperation(()=> db_users.aggregate([
				...stages,
				{ $count:"total" }
			]).next().then((d)=> d && d.total || 0));

			/*console.log('MAMA',memorials);
			break;*/

			if(count){
				limit = Math.floor(count / cores);

				if(count >= cores){
					skip = core_number * limit;
				}
				else{
					skip = Math.floor(Math.random() * count);
					limit = 1;
				}

				args = [
					...stages,
					{ $sort: { date_created:-1 } },
					{ $skip:skip },
					{ $limit:limit },
					{ $lookup: memorialLookup },
					{ $project: projectStage }
				]

				_users = await repeatOperation(()=> db_users.aggregate(args).toArray())

				ids = _users.map((u)=> u._id);

				if(ids.length){
					let r = await db_users.updateMany(
						{ _id: { $in: ids }	},
						{ $set: { lock } }
					);

					if(r.modifiedCount != ids.length){
						lockQuery['$eq'] = lock;
						delete lockQuery['$exists'];

						args = args.map((arg)=> !arg['$skip'] || !arg['$limit'])

						_users = await repeatOperation(()=> db_users.aggregate(args).toArray());
						ids = _users.map((u)=> u._id);
					}

					if(ids.length){
						const resource_data = resourceGenerator(Math.min(ids.length,total), { category:0, type:ext })[0].map((resource)=> resource.name);

						for(let user of _users){
							for(let memorial of user.memorials){
								if(resource_data.length){
									let userId = user._id.toString(),
									my_max = max[userId],
									sent = user.sent,
									abMax = user.max

									if(!my_max){
										if(my_max == undefined){
											my_max = max[userId] = abMax - sent;
										}
										else{
											continue;
										}
									}

									let r = await db_users.updateOne({ _id: user._id, [userResourceName]: sent }, { $inc: { [userResourceName]:1 } });

									if(r.modifiedCount){
										total--; my_max--; user.sent++;
										let file = files[my_max % files.length],
										resource = resource_data.pop(),
										resource_min = (isPicture)? resource.replace('.','-min.') : resource.split('.')[0] + '.jpg',
										p = {
											updateOne:{
												filter:{ _id: memorial._id },
												update:{
													$push: {
														[memorialResourceName]: {
															src : `${APP_URL}/api/resources/${resource}`,
															src_min: `${APP_URL}/api/resources/${resource_min}`,
															title: faker.word.words(),
															date_added: new Date()
														}
													}
												}
											}
										};

										let root = process.cwd();

										fsP.symlink(`./${file}`, `${root}/tests/resources/${resource}`);

										if(isPicture){
											fsP.symlink(`./${file.replace('.','-min.')}`, `${root}/tests/resources/${resource_min}`);
										}
										else{
											let min_file = pictureFiles[my_max % pictureFiles.length];
											min_file = min_file.replace('.','-min.');

											fsP.symlink(`./${min_file}`, `${root}/tests/resources/${resource_min}`);
										}

										data.push(p);

										if(!total){
											break;
										}

										max[userId] = my_max;

										if(!my_max){
											await db_users.updateOne(
												{ _id: user._id },
												{ $set: { [roomChecker]: false } }
											)
										}

										if(!total){
											break;
										}
									}
									else{
										console.log(`Couldn't update the ${userResourceName} to increase by one. core_number:${core_number}`);
									}
								}
								else{
									break;
								}
							}

							if(!total || !resource_data.length){
								break;
							}
						}

						await db_users.updateMany(
							{ _id: { $in: ids }, lock },
							{ $unset: { lock:'' } }
						)
					}
					else{
						console.log(`No user with lock could be found. core_number:${core_number}`)
					}
				}
				else{
					console.log(`No empty user found for adding resource. core_number:${core_number}`);
					break;
				}
			}
			else{
				r = await repeatOperation(
					()=> db_progress.find({
						$or:[
							{ users:0 },
							{ memorials:0 }
						]
					}).toArray(),
					1
				)

				if(r.length == 2){
					console.log(`No empty user found for add resource. core_number:${core_number}`,type);
					break;
				}
			}
		}

		return data;
	}
}
