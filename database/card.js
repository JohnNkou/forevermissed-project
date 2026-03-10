let date_1 = new Date(),
date_2 = new Date();

date_1.setMonth(date_1.getMonth() + 4);
date_2.setFullYear(date_2.getFullYear() + 3);

function dd(date){
	let month = String(date.getMonth() + 1),
	year = date.getFullYear();

	return `${month.padStart(2,0)}/${year}`
}

db.cards.insertMany([
	{
		number:'1023-20391-2039281',
		ccv:121,
		expiration_date:dd(date_1),
		name:"Aliezar Donavant",
		amount:new Decimal128("50"),
		currency:'USD'
	},
	{
		number:'3034-2032-12329',
		ccv:400,
		expiration_date:dd(date_2),
		name:"Campagnard Justec",
		amount:new Decimal128("50"),
		currency:'USD'
	}
])