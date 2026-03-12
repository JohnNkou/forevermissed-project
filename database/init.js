const timer = require('node:timers/promises');

const logger = {
	log:function(...args){
		args.unshift('---');

		console.log.apply(null,args);
	},
	error:function(...args){
		args.unshift('---');
		console.error.apply(null,args);
	}
}

try{
	let { MONGO_INITDB_ROOT_USERNAME, MONGO_INITDB_ROOT_PASSWORD , DB_NAME, DB_HOST, SUB_USER, SUB_PASSWORD, BACK_USER, BACK_PASSWORD, OTP_EXPIRATION } = process.env,
	admin = db.getSiblingDB('admin'),
	config = {
		_id:"rs0",
		members:[
			{ _id:0, host:'localhost:27017' }
		]
	}

	logger.log("Running initialte");

	rs.initiate(config);

	logger.log("Ended initiate", rs.status(), db.hello())

	logger.log("Reconnecting");

	let conn = new Mongo(`mongodb://localhost:27017?replicaSet=rs0`);
	admin = conn.getDB("admin")

	logger.log("Admin new stats", admin.hello())

	logger.log("Creating admin");

	admin.createUser({
		user: MONGO_INITDB_ROOT_USERNAME,
		pwd: MONGO_INITDB_ROOT_PASSWORD,
		roles:[
			{ role:'root', db:'admin' }
		]
	});

	logger.log("Result",admin.auth(MONGO_INITDB_ROOT_USERNAME, MONGO_INITDB_ROOT_PASSWORD));

	let SubscritionRole = 'Sub-service',
	BackendRole = 'Back-service';

	db = admin.getSiblingDB(DB_NAME);

	logger.log("Creating SubscriptionRole");

	db.createRole({
		role: SubscritionRole,
		privileges:[
			{ 
				resource: { db: DB_NAME, collection:"cards" },
				actions:["find","update"] 
			},
			{
				resource: { db: DB_NAME, collection:"users" },
				actions:["find","update"]
			},
			{
				resource: { db: DB_NAME, collection:"abonnements" }, 
				actions:["find"]
			},
			{
				resource: { db: DB_NAME, collection:"memorials" },
				actions:['update','find']
			},
			{
				resource: { db: DB_NAME, collection:'otps' },
				actions:['update','find']
			},
			{
				resource: { db: DB_NAME, collection:'orders' },
				actions:['update','find','insert']
			}
		],
		roles: []
	});

	logger.log("Creating BackendRole");

	db.createRole({
		role: BackendRole,
		privileges:[
			{
				resource: { db: DB_NAME, collection:"cards" },
				actions:["find","update"]
			},
			{
				resource: { db: DB_NAME, collection:"users" }, 
				actions:["insert","update","find","remove"]
			},
			{
				resource: { db: DB_NAME, collection:"orders" },
				actions:["insert", "update" ,"find"]
			},
			{
				resource: { db: DB_NAME, collection:"abonnements" }, 
				actions: ["insert","find","update"]
			},
			{
				resource: { db: DB_NAME, collection:'memorials' },
				actions:['insert','update','find']
			},
			{
				resource: { db: DB_NAME, collection:'tributes' },
				actions:['insert', 'find']
			},
			{
				resource: { db: DB_NAME, collection:'otps' },
				actions:['insert','find']
			},
			{
				resource: { db: DB_NAME, collection:'sessions' },
				actions:['insert','find']
			},
			{
				resource: { db: DB_NAME, collection:'site_settings' },
				actions:['find']
			},
			{
				resource: { db: DB_NAME, collection:'layout_settings' },
				actions:['find']
			}
		],
		roles:[]
	});

	logger.log(`Roles ${db.getRoles({ rolesInfo:1 })}`)

	logger.log("Creating user",SUB_USER);

	db.createUser({
		user: SUB_USER,
		pwd: SUB_PASSWORD,
		roles: [
			{ role: SubscritionRole, db: DB_NAME }
		]
	})

	logger.log("Creating user",BACK_USER);

	db.createUser({
		user: BACK_USER,
		pwd: BACK_PASSWORD,
		roles: [
			{ role: BackendRole, db: DB_NAME }
		]
	})

	logger.log("Reconfiguring replica");

	config.members[0].host = 'database:27017';
	rs.reconfig(config,{ force:true })

	logger.log("Ended reconfiguration");

	const emailPattern = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
	allowedCurrency = ['USD','CDF']

	logger.log("Creating validator for collection user");

	db.createCollection("users",{
		validator:{
			$jsonSchema:{
				bsonType:"object",
				title:"Validator for the users collection",
				required: ['name','email','role','date_created'],
				properties:{
					name:{
						bsonType:'string',
						description:"'name' must be a string"
					},
					role:{
						enum:['manager','admin'],
						description:"'role' should only contain either manager or admin"
					},
					email:{
						pattern: emailPattern,
						description:"'email' has bad pattern"
					},
					date_created:{
						bsonType:"date",
						description:"'date_created' should be a date"
					}
				}
			}
		}
	})

	logger.log("Validator creation ended");

	logger.log("Creating index for collection user")

	db.users.createIndex({ email:1 }, { unique:true })

	logger.log("Index creation ended");

	logger.log("Creating validator for collection memorial");

	db.createCollection("memorials",{
		validator:{
			$jsonSchema:{
				required: ['birth_date','birth_place','gallery','videos','created_by','date_created','date_updated','view_count','name'],
				properties:{
					name:{
						bsonType:'string',
						description:"'name' must be a string"
					},
					birth_date:{
						bsonType:'date',
						description:"'birth_date' should be a date"
					},
					death_date:{
						bsonType:'date',
						description:"'death_date' should be a date"
					},
					birth_place:{
						bsonType:'string',
						description:"'birth_place' should be a string"
					},
					death_place:{
						bsonType:'string',
						description: "'death_place' should be a date"
					},
					videos:{
						bsonType:'array',
						description:"'videos' should be an array"
					},
					gallery:{
						bsonType:'array',
						description:"'gallery' should be an array"
					},
					created_by:{
						bsonType:'objectId',
						description:"'created_by' should be an objectId"
					},
					view_count:{
						bsonType:'int',
						description:"'view_count' should be a integer",
						minimum:0
					},
					date_created:{
						bsonType:'date',
						description:"'date_created' should be a date"
					},
					date_updated:{
						bsonType:'date',
						description:"'date_updated' should be a date"
					}
				}
			}
		}
	})

	logger.log("Validator creation ended")

	logger.log("Creating index for collection memorials");

	db.memorials.createIndex({ name:1 }, { unique:true })

	logger.log("Ended index creation");

	logger.log("Creating validator for collection orders");

	db.createCollection("orders",{
		validator:{
			$jsonSchema:{
				required: ['abonnementId', 'abonnementType','email','price','currency','date_created','status','due_date'],
				properties:{
					abonnementId:{
						bsonType:'objectId',
						description:"'abonnementId' should be an objectId"
					},
					abonnementType:{
						bsonType:'string',
						description:"'abonnementType' should be a string"
					},
					email:{
						pattern: emailPattern,
						description:"'email' incorrect"
					},
					price:{
						bsonType:'decimal',
						minimum:0,
						description:"'price' should be a double"
					},
					currency:{
						enum: allowedCurrency,
						description:"'currency' should either be " + allowedCurrency.join(' or ')
					},
					date_created:{
						bsonType:'date',
						description:"'date_created' should be a date"
					},
					due_date:{
						bsonType:'date',
						description:"'due_date' should be a date"
					},
					status:{
						enum:['new','processing', 'mail-sent','unpaid','unpaid-suspended','paid','t-1','t-2'],
						description:"'status' not in the allowed range"
					}
				}
			}
		}
	})

	logger.log("Validator created");

	logger.log("Creating index for collection orders");

	db.orders.createIndex({ due_date:1, email:1, abonnementId:1 }, { unique:true })

	logger.log("Index created");

	logger.log("Creating validator for collection abonnements");

	db.createCollection('abonnements',{
		validator:{
			$jsonSchema:{
				required:['type','maxVideo','maxPicture','maxMemorial','frequency','currency','price','maxTribute'],
				properties:{
					type:{
						bsonType:'string',
						description:"'type' should be a string"
					},
					maxVideo:{
						bsonType:'object',
						description:"'maxVideo' should be an object"
					},
					maxPicture:{
						bsonType:'object',
						description:"'maxPicture' should be an object"
					},
					maxMemorial:{
						bsonType:'int',
						minimum:1,
						description:"'maxMemorial' should be an integer"
					},
					frequency:{
						bsonType:'array',
						description:"'frequency' should be an array"
					},
					currency:{
						enum: allowedCurrency,
						description:"'currency' should be either " + allowedCurrency.join(' or ')
					},
					price:{
						bsonType:'decimal',
						description: "'price' should be a decimal"
					},
					maxTribute:{
						bsonType:'int',
						minimum:1,
						description:"'maxTribute' should be a integer"
					}
				}
			}
		}
	})

	logger.log("Validator created");

	logger.log("Creating index for collection abonnements");

	db.abonnements.createIndex({ type:1 }, { unique:true })

	logger.log("Index created");

	logger.log("Creating Index for the Otps collection");

	if(!OTP_EXPIRATION){
		throw Error("OTP_EXPIRATION NOT FOUND IN ENVIRONEMENT");
	}

	db.otps.createIndex({ date_created:1 }, { expireAfterSeconds: Number(OTP_EXPIRATION) })

	logger.log("Index created");
}
catch(error){
	console.log('---Error',error);
	throw error;
}