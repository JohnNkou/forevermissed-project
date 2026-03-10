import { MongoClient } from 'mongodb'
import { PaymentCard } from 'utils/types.js'
import timers from 'node:timers/promises'

export function getMongoClient(){
	let { SUB_USER, SUB_PASSWORD, DB_HOST, DB_NAME } = process.env;

	if(!SUB_USER || !SUB_PASSWORD){
		throw Error("The SUB_USER and SUB_PASSWORD environement variable should be set");
	}
	if(!DB_HOST || !DB_NAME){
		throw Error("DB_HOST AND DB_NAME should be set");
	}

	let url = `mongodb://${DB_HOST}:27017`;

	console.log('URL',url);

	const client = new MongoClient(url,{
		auth:{
			username: SUB_USER,
			password: SUB_PASSWORD
		},
		authSource: DB_NAME,
		serverSelectionTimeoutMS:5000,
		heartbeatFrequencyMS:2000,
		retryWrites:true,
		retryReads: true
	})

	return client;
}

export async function getConnectedClient(){
	console.log("YOUPIIII");
	while(true){
		try{
			console.log("Unto next");
			let client = getMongoClient();

			await client.connect();

			return client;
		}
		catch(error){
			console.error('retryUntil error', error.toString())
			await timers.scheduler.wait(5000);
		}
	}
}

export async function suspendUserMissingRecord(recordId, missing_paiement_collection){

	let response = await missing_paiement_collection.updateOne(
		{ _id: recordId },
		{ $set: {status: 'unpaid_suspended'} }
	);

	if(!response.modifiedCount){
		throw Error(`Couldn't set status of missing_paiement item ${id} to unpaid_suspended. ${JSON.stringify(response)}`);
	}
}

export async function suspendUser(userId, user_collection){
	try{
		let response = await user_collection.updateOne(
			{ _id: userId },
			{ $set: { suspended:true } }
		);
	}
	catch(error){
		console.error("Error while suspending user",userId,error);
	}
}

export async function suspendUserMemorials(userId, memorial_collection){
	try{
		let response = await memorial_collection.updateMany(
			{ created_by: userId },
			{ $set: { status:'suspended' } }
		)

		if(!response.modifiedCount){
			console.error("Memorials created by user",userId, "coudlnt' be suspended", response);
		}
		else{
			console.log("Memorials created by user",userId,"were suspended")
		}
	}
	catch(error){
		console.error("Error while trying to suspend memorial created by user",userId,error);
	}
}

export async function getUserPaymentCard(adminId, user_collection, card_collection){
	let user = await user_collection.find({ _id: adminId }).next(),
	card = await card_collection.find({_id: user.default_payment._id}).next();

	return await PaymentCard.getInstance(card, card_collection);
}