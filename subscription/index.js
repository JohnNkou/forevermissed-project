import { getNumber, getUTCNow, calculateExpirationDate, getMonthBetweenDate, getAbonnementDates } from 'utils/utils.js'
import { PaymentCard, Card, InsufficiantFound } from 'utils/types.js'
import { getMongoClient, getConnectedClient, getUserPaymentCard, suspendUser, suspendUserMissingRecord, suspendUserMemorials } from './utils.js'
import { ObjectId } from 'mongodb';
import { SMTP, ClientWaiter } from './types.js'
import timers from 'node:timers/promises'

const { DB_NAME } = 					process.env,
RENEWAL_ABONNEMENT_SECONDS = 			getNumber(process.env.RENEWAL_ABONNEMENT_SECONDS),
CHECKING_MISSING_PAIEMENT_INTERVAL = 	getNumber(process.env.CHECKING_MISSING_PAIEMENT_INTERVAL),
MAX_MISSING_PAIEMENT_RETRY =			getNumber(process.env.MAX_MISSING_PAIEMENT_RETRY),	
OTP_CHECKING_INTERVAL = 				getNumber(process.env.OTP_CHECKING_INTERVAL),
ORDER_CHECKING_INTERVAL = 				getNumber(process.env.ORDER_CHECKING_INTERVAL),		
SubSMTP = new SMTP();

let client = 							await getConnectedClient();
let db,
db_users,
db_abonnements,
db_cards,
db_missed_payments,
db_memorials,
db_otps,
db_orders;

function setDb(client){
	db = 								client.db(DB_NAME);
	db_users = 								db.collection('users');
	db_abonnements = 						db.collection('abonnements');
	db_cards = 								db.collection('cards');
	db_missed_payments = 					db.collection('missed_payments');
	db_memorials = 							db.collection('memorials');
	db_otps = 								db.collection('otps');
	db_orders = 							db.collection('orders');
}

setDb(client);

(
	async function(){
		let abonnements,
		run = true;

		while(true){
			try{
				abonnements = await db_abonnements.find().toArray();
				console.log("Got abonnement");
				break;
			}
			catch(error){
				console.error("Ab error",error.toString());

				client = await getConnectedClient();
				setDb(client);
			}
		}

		setInterval(async ()=>{
			if(run){
				try{
					let	responses = await db_users.
					find(
						{ 
							"abonnement.expiration_date" : { 
								$lte: new Date()
							},
							"abonnement.checking": false
						}
					).
					project({ abonnement:1, default_payment:1, email:1 }).
					limit(1000).toArray(),
					user_ids = responses.map((response)=> response._id),
					length = responses.length;

					if(length){
						await db_users.updateMany(
							{
								_id: { 
									$in: user_ids }
							},
							{
								$set: {
									"abonnement.checking":true
								}
							}
						)

						responses.reduce(async (payloads, user)=>{
							payloads = await payloads;
							
							let trace_id = Date.now(),
							payment_card = await PaymentCard.getInstance(user.default_payment, db_cards, trace_id),
							chosen_abonement = abonnements.find((ab)=> ab._id.equals(user.abonnement.id)),
							user_abonnement = user.abonnement,
							abonnement_frequency = user_abonnement.frequency,
							month_range = getMonthBetweenDate(user_abonnement.expiration_date, new Date()) + 1,
							expiration_date = user_abonnement.expiration_date,
							start_date = user_abonnement.date_created,
							user_items;

							try{
								for(let index=0; month_range; month_range--, index++){
									let my_expiration = expiration_date;
									await payment_card.pay(chosen_abonement.price, chosen_abonement.currency, db_cards).catch((error)=>{
										if(error instanceof InsufficiantFound){
											if(!user_items){
												user_items = payloads.unpaids[user.email] = { operations:[], onsuccess:[] };
											}

											user_items.operations.push(
												{
													insertOne:{
														document:{
															abonnementId: chosen_abonement._id,
															abonnementType: chosen_abonement.type,
															managerId: user._id,
															email: user.email,
															due_date: my_expiration,
															price: chosen_abonement.price,
															currency: chosen_abonement.currency,
															retryTime:1,
															status:'unpaid',
															date_created: new Date()
														}
													}
												}
											);
										}
										else{
											console.error("Error while handling user paiement",error);
											throw Error(error);
										}
									}).catch((error)=>{
										throw Error(`Error while processing paiement for user ${user._id}.\n ${error.toString()}`)
									});

									let range = 2 + index;
									expiration_date = getAbonnementDates({ start: start_date, range, frequency: abonnement_frequency }).expiration_date;			
								}

								if(!user_items){
									payloads.new_order.push({
										order:{
											price: chosen_abonement.price,
											currency: chosen_abonement.currency,
											abonnementId: chosen_abonement._id,
											abonnementType: chosen_abonement.type,
											due_date: expiration_date,
											email: user.email,
											status: 'mail-sent',
											date_created: new Date()
										},
										abonnement:{
											user_id: user._id,
											expiration_date: calculateExpirationDate(user_abonnement.date_created, abonnement_frequency )
										}
									})
								}
								else{
									user_items.onsuccess.push({
										updateOne:{
											filter: { _id: user._id },
											update:{
												$set: { 
													"abonnement.missing_paiement":true,
													"abonnement.expiration_date": calculateExpirationDate(user_abonnement.date_created, abonnement_frequency)  
												}
											}
										}
									})
								}
							}
							catch(error){
								console.error(error);

								/*payloads.new_order.push({
									abonnement:{
										user_id: user._id,
										expiration_date
									}
								})*/
							}

							return payloads;
						},{ unpaids:{}, new_expiration:[], new_order:[] }).
						then(async ({ unpaids, new_expiration, new_order })=>{
							if(Object.keys(unpaids).length){
								await client.withSession(
									{ causalConsistency:false, defaultTransactionOptions: { retryWrites:true } },
									async (session)=>{
										for(let email in unpaids){
											let { operations, onsuccess } = unpaids[email];
											try{
												await session.withTransaction(async (session)=>{
													await db_orders.bulkWrite(
														operations, 
														{ session })
													.then((response)=>{
														let missed = operations.length - response.insertedCount;

														if(missed){
															console.log(`${missed} order weren't inserted. Have to retry`);

															throw Error(`${missed} order not inserted`);
														}
													});

													await db_users.bulkWrite(
														onsuccess,
														{ session }
													).then((response)=>{
														let missed = onsuccess.length - response.modifiedCount;

														if(missed){
															console.error(`${missed} operation failed to update user abonnement status`);

															throw Error(`${missed} operation failed to update user status`);
														}
													})
												})
											}
											catch(error){
												let message = error;

												console.log('OPERATIONS',operations.forEach((operation)=>{
													console.log('OP', operation.insertOne);
												}))

												if(error.code == 121){
													message = JSON.stringify(error.errInfo || error.writeErrors);
												}
												console.error("Error while trying to do operation for user",email,message);
											}
										}
									}
								)
							}

							if(new_order.length){
								new_order.reduce(async (failed, item)=>{
									let abonnement = item.abonnement,
									order = item.order;

									failed = await failed;

									await client.withSession(
										{ causalConsistency: false, defaultTransactionOptions: { retryWrites:true } },
										(session)=>{
										return session.withTransaction(async (session)=>{
											let response = await db_users.updateOne(
												{
													_id: abonnement.user_id
												},
												{
													$set:{
														"abonnement.expiration_date": abonnement.expiration_date
													}
												},
												{ session }
											);

											if(response.modifiedCount){
												if(order){
													response = await db_orders.insertOne(order, { session });

													if(response.insertedId){
														return true;
													}
													else{
														console.log("Failed to insert the new order");
														throw Error("Failed to insert the new order");
													}
												}

												return true;
											}
											else{
												console.log("Failed to update user abonnement");
												throw Error("Failed to update user abonnement");
											}
										})
									}).catch((error)=>{
										console.log(error.errInfo.details.schemaRulesNotSatisfied)
										console.log("Failed to set new_order",error);
										failed.push(abonnement.user_id);
									})

									return failed;

								},[]).then((failed)=>{
									if(failed.length){
										db_users.updateMany(
											{
												_id: { $in: failed }
											},
											{
												$set:{ "abonnement.checking":false }
											}
										).catch(console.error);
									}
								})
							}
						}).
						catch((error)=>{
							console.error("Error while running paiement operation",error);
						}).
						finally(()=>{
							db_users.updateMany(
								{ _id: { $in: user_ids } },
								{
									$set:{ "abonnement.checking": false }
								}
							).then((response)=>{
								if(!response.modifiedCount){
									console.error("User abonnement checking attribute couldn't be reset to false");
								}
							}).catch((error)=>{
								console.error("Error while resetting user abonnement checking to false");
							})
						})
					}
				}
				catch(error){
					if(run){
						console.log("Renewal abonnement error", error.toString());
						run = false;
						console.log("Searching for new client");
						console.log("With run",run);
						client = await getConnectedClient();
						console.log("new Client found");
						setDb(client);
						run = true;
					}
				}
			}
		}, RENEWAL_ABONNEMENT_SECONDS * 1000);

		setInterval(async ()=>{
			if(run){
				try{
					let insolvables = await db_orders.find({ status:'unpaid' }).limit(1000).toArray(),
					length = insolvables.length;

					if(length){
						let response = await db_orders.updateMany(
							{
								_id: { $in: insolvables.map((i)=> i._id)  }
							},
							{
								$set: { status:'processing' }
							}
						)

						if(response.modifiedCount != length){
							console.error("modified insolvables count different then insolvables count", response, insolvables);
						}

						insolvables.reduce(async (payloads, insolvable)=>{
							let payment_card;

							payloads = await payloads;

							try{
								payment_card = await getUserPaymentCard(insolvable.managerId, db_users, db_cards);

								await payment_card.pay(insolvable.price, insolvable.currency, db_cards).then(async (paid)=>{
									if(paid === true){
										SubSMTP.sendSuccessPaiementMessage({ email: insolvable.email, due_date: insolvable.due_date, price: insolvable.price, currency: insolvable.currency, type: insolvable.abonnementType }).then((response)=>{
											if(response.accepted.length){
												console.log("Successfull missing paiement mail was sent to user", insolvable.email);
											}
											else{
												console.log("Non message could be sent to user after Successfull paiement of missing order");
											}
										}).catch((error)=> console.error("Error while sening successfull missing paiement order",error));

										let user_data = payloads.paid.get(insolvable.email);

										if(!user_data){
											user_data = [];
											payloads.paid.set(insolvable.email,user_data);
										}

										user_data.push(insolvable._id);

										return;
									}

									console.log("Received non boolean as response from pay function",paid);
									throw InsufficiantFound("Payement failed " + JSON.stringify(paid));
								});
							}
							catch(error){
								if(error instanceof InsufficiantFound){
									let retryTime = insolvable.retryTime;

									if(retryTime < MAX_MISSING_PAIEMENT_RETRY){
										payloads.update_retry.push({
											updateOne:{
												filter:{ _id: insolvable._id },
												update:{ $set: { "retryTime": retryTime + 1, status:'unpaid' } }
											}
										})

										SubSMTP.sendFailedPaiementMessage({ email: insolvable.email, price: insolvable.price, currency: insolvable.currency, due_date: insolvable.due_date, type: insolvable.abonnementType });
									}
									else{
										payloads.suspendedRecord.push({
											updateOne:{
												filter:{ _id: insolvable._id },
												update:{ $set: {status: 'unpaid-suspended'} }
											}
										});
										payloads.suspendedUser.add(insolvable.managerId.toString());

										SubSMTP.sendSuspensionMessage(insolvable.email).then((response)=>{
											if(response.accepted.length){
												console.log(`Suspension email has been sent to user ${insolvable.email}`);
											}
											else{
												console.warn(`Suspension email couldn't be sent to user ${insolvable.email}`)
											}
										}).catch((error)=> console.error(`Error while sending suspension message to user ${insolvable.email}`));
									}
								}
								else{
									console.log('INSOLVABLE',insolvable);
									console.error("Error while making paiement",error);
									payloads.to_revert.add(insolvable._id)
								}
							}

							return payloads;
						},{ paid: new Map(), update_retry:[], suspendedUser: new Set(), suspendedRecord: [], to_revert:new Set() })
						.then(async ({ paid, update_retry, suspendedUser, suspendedRecord, to_revert })=>{
							suspendedUser = Array.from(suspendedUser).map((user_id)=> [
								{
									namespace: `${DB_NAME}.users`,
									name:'updateOne',
									filter:{ _id: new ObjectId(user_id) },
									update:{ $set: { suspended:true } }
								},
								{
									namespace: `${DB_NAME}.memorials`,
									name:'updateMany',
									filter: { created_by: new ObjectId(user_id) },
									update: { $set: { status:'suspended' } }
								}
							]).flat(10);

							if(paid.size){
								await client.withSession(
									{ causalConsistency:false, defaultTransactionOptions: { retryWrites:true } 
									},
									async (session)=>{
										for(let [email,data] of paid.entries()){
											try{
												await session.withTransaction(async (session)=>{
													let response = await db_orders.updateMany(
														{ _id: { $in: data } },
														{ $set: { status:'paid' } }, 
														{ session }
													),
													missed = data.length - response.modifiedCount,
													unpaid_length;

													if(missed){
														console.error(`${missed} order record of user ${email} failed to update their status to paid. Retrying`);

														throw Error(`Failed to update user order status ${email}`)
													}

													unpaid_length = await db_orders.countDocuments({ email: email, status: { $in:['unpaid','processing'] } });

													if(unpaid_length == 0){
														response = await db_users.updateOne(
															{ email },
															{ $set:{ "abonnement.missing_paiement":false } 
															},
															{ session }
														);

														if(!response.modifiedCount){
															console.error("Coudln't set the user abonnement missing_paiement field to false");
															throw Error(`Coudln't set user ${email} abonnement missing_paiement to false`);
														}
													}
												})

											}
											catch(error){
												console.error(error);
											}
										}
									}
								)
							}

							update_retry.length && db_orders.bulkWrite(update_retry).then((response)=>{
								let to_update_length = update_retry.length,
								missed = to_update_length - response.modifiedCount;

								if(missed){
									console.error(missed,"missed_payments retryTime coudln't be set to their new value");
								}
								else{
									console.log(to_update_length,"missed_payments retryTime were updated");
								}
							}).catch((error)=> console.log("Error while update retryTime of missing_paiement record"));

							if(to_revert.size){
								console.log(to_revert.size,'TO REVERT TO UNPAID');
							}

							to_revert.size && db_orders.updateMany(
								{ _id: { $in: to_revert.values().toArray() } },
								{
									$set:{ status:'unpaid' }
								}
								).then((response)=>{
								let total = to_revert.size,
								missed = total - response.modifiedCount;

								if(missed){
									console.error(missed,`missed_payments record Coudlnt' be reverted to unpaid`);
								}
								else{
									console.log(total,`missed_payments record were reverted to paid`);
								}
							})

							suspendedRecord.length && db_orders.bulkWrite(suspendedRecord).then((response)=>{
								let to_update_length = suspendedRecord.length,
								missed = to_update_length - response.modifiedCount;

								if(missed){
									console.error(missed,`missed_payments record couldn't be set to unpaid-suspended`)
								}
								else{
									console.log(to_update_length,`missed_payments record were set to unpaid-suspended`);
								}
							}).catch((error)=> {
								console.log('HUM', JSON.stringify(error.writeErrors[0].err))
								console.log("Error while writing bulkWrite suspended record",error)
							});

							suspendedUser.length && client.bulkWrite(suspendedUser).then((response)=>{
								let to_update_length = suspendedUser.length,
								missed = to_update_length - response.modifiedCount;

								if(missed){
									console.error(missed,`User and the memorials coudln't be suspended`);
								}
								else{
									console.log(to_update_length,`Users and their memorials were suspended`);
								}
							}).catch((error)=> console.log("Error while suspending users and their memorials resources", error));
						})
					}
				}
				catch(error){
					if(run){
						console.log('OGH',JSON.stringify(error.errInfo.details.schemaRulesNotSatisfied));
						console.log("Checking missing paiement error", error.toString());
						run = false;
						client = await getConnectedClient();
						setDb(client);
						run = true;
					}
				}
			}
		}, CHECKING_MISSING_PAIEMENT_INTERVAL * 1000);

		setInterval(async ()=>{
			if(run){
				try{
					let otps = await db_otps.find(
						{ status: {$ne:'processing'} }
					).limit(1000).toArray();

					if(otps.length){
						let response = await db_otps.updateMany(
							{ _id: { $in: otps.map((otp)=> otp._id) } },
							{
								$set: { status:'processing' }
							}
						)

						if(!response.modifiedCount){
							console.log("No otp record was set to processing. Maybe another process working on it");
							return;
						}

						Promise.all(otps.map(async(otp)=>{
							let code, email, _id,response;
							try{
								code = otp.code; 
								email = otp.email;
								_id = otp._id;
								response = await SubSMTP.sendOTP({code,email});

								if(response.accepted.length){
									console.log("Send email to",email);
									return;
								}

								console.log("Server didn't accept to send mail",response);

								return _id;
							}
							catch(error){
								console.error("Erorr while trying to send otp",error,code,email);
								return _id;
							}

						})).then((finished)=>{
							finished = finished.filter((f)=> f);

							//Should handle the case were an error happen and the state of the otps get locked in the processing state

							if(finished.length){
								db_otps.updateMany(
									{ _id: { $in:finished } },
									{ 
										$set: { status:'active' }
									}
								).then((response)=>{
									if(!response.modifiedCount){
										console.error("Very unusual. No otp was reverted to it previous state",finished)
									}
								}).catch((error)=>{
									console.error(error);
								})
							}
						})
					}
				}
				catch(error){
					if(run){
						console.log("Otp checking error", error.toString());
						run = false;
						client = await getConnectedClient();
						setDb(client);
						run = true;
					}
				}
			}
		}, OTP_CHECKING_INTERVAL * 1000)


		setInterval(async ()=>{
			if(run){
				try{
					let orders = await db_orders.find({ status:'new' }).limit(1000).toArray(),
					length = orders.length,
					response;

					if(length){
						response = await db_orders.updateMany(
							{ _id: { $in: orders.map((order)=> order._id) } },
							{
								$set:{ status:'processing' }
							}
						)

						if(!response.modifiedCount){
							console.error("Couldn't set orders status to processing");
							return;
						}

						orders.reduce(async (objet, { email, price, abonnementType:type, _id, currency })=>{
							try{
								objet = await objet;

								let response = await SubSMTP.sendOrderMessage({ email, price: price.toString(), type, currency });

								if(response.accepted.length){
									console.log("Order message sent to",email);
									objet.finished.push(_id);
								}
								else{
									console.log("Order message couldn't be sent",response);
									objet.to_revert.push(_id);
								}
							}
							catch(error){
								console.error("Error while sending order message",error);

								objet.to_revert.push(_id);
							}

							return objet;
						}, { to_revert:[], finished:[] }).then(function({ to_revert, finished }){

							to_revert.length && db_orders.updateMany(
							 { _id: { $in: to_revert } },
							 { $set: { status:'new' } }
							).
							then((response)=>{
								if(!response.modifiedCount){
									console.error("Order status couldn't be reverted to new",to_revert);
								}
								else{
									console.log(to_revert.length,"order were reverted to new");
								}
							})

							finished.length && db_orders.updateMany(
								{ _id: { $in: finished } },
								{ $set: { status: 'mail-sent' } }
							).
							then((response)=>{
								if(!response.modifiedCount){
									console.log("Order status couldn't be set to mail-sent", response, finished);
								}
								else{
									console.log(finished.length,'order status were set to mail-sent');
								}
							})
						}).catch((error)=>{
							console.error("Error while processing order",error)
						})
					}

				}
				catch(error){
					if(run){
						let message;

						if(error.errInfo){
							message = JSON.stringify(error.errInfo);
						}
						else{
							message = error;
						}
						console.log("order checking error", message);
						run = false;
						client = await getConnectedClient();

						run = true;
					}
				}
			}
		}, ORDER_CHECKING_INTERVAL * 1000);
	}
)();