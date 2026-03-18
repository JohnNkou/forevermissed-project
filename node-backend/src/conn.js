import { getNumber } from 'utils/utils.js'
import { MongoClient } from 'mongodb'

const { DB_HOST, MONGO_INITDB_ROOT_USERNAME, MONGO_INITDB_ROOT_PASSWORD, DB_NAME, SESSION_NAME, CHECKING_MISSING_PAIEMENT_INTERVAL, POP_USER, POP_PASSWORD} = process.env,
RENEWAL_FREQUENCY_SECONDS = getNumber(process.env.RENEWAL_FREQUENCY_SECONDS),
MAX_MISSING_PAIEMENT_RETRY = getNumber(process.env.MAX_MISSING_PAIEMENT_RETRY),
client = new MongoClient(DB_HOST,{
	auth:{
		username: MONGO_INITDB_ROOT_USERNAME,
		password: MONGO_INITDB_ROOT_PASSWORD
	}
});

export default client;