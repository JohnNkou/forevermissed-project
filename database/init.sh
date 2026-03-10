#!/bin/bash

#printf "\n\nRUNNING THE INIT.SH FILE\n\n"

#echo "---HUMMANEING" `pwd`

#touch hummen

function dir(){
	echo "---STARTING DIR"
	r=555
	while [[ $r == 555 ]]; do
		r=`mongosh --host $DB_HOST --eval 'db' || echo 555`
		echo "--- RETRYING"
	done

	echo "---STUFF ENDED"

	mongosh --host localhost -f /home/ubuntu/init.js

	mongorestore -u $MONGO_INITDB_ROOT_USERNAME -p $MONGO_INITDB_ROOT_PASSWORD -d $DB_NAME --authenticationDatabase=admin /home/ubuntu/dump/${DB_NAME}
}

dir &