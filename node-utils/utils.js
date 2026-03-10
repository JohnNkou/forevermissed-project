export function getNumber(n){
	n = Number(n);

	if(n.toString() == 'NaN'){
		throw Error("Value passed couldn't be set to number " + n);
	}

	return n;
}

export function getUTCNow(){
	return new Date((new Date()).toISOString());
}

export function getAbonnementDates({ start_offset_month=0, start, start_offset_year=0, date, range=1, frequency } = {}){
	let start_date = start || new Date(), 
	month = start_date.getMonth() + start_offset_month,
	year = start_date.getFullYear() + start_offset_year,
	expiration_date;

	if(date){
		start_date.setDate(date);
	}

	if(start_offset_month){}
		start_date.setMonth(month);

	if(start_offset_year)
		start_date.setFullYear(year);

	expiration_date = new Date(start_date);

	switch(frequency){
	case 'monthly':
		expiration_date.setMonth(start_date.getMonth() + range);
		break;
	case 'yearly':
		console.log("FINKA");
		expiration_date.setFullYear(start_date.getFullYear() + range);
		break;
	default:
		throw Error("Unknown frequency "+ frequency);
	}

	if(expiration_date.getDate() != start_date.getDate()){
		expiration_date.setDate(0);
	}

	return {start_date, expiration_date}
}

export function calculateExpirationDate(date_start, frequency){
	let date = new Date(),
	month = date.getMonth(),
	yeear = date.getFullYear();

	switch(frequency){
	case 'monthly':
		date.setMonth(month + 1);
		break;

	case 'yearly':
		date.setFullYear(year + 1);
		break;
	default:
		throw Error("Unknown frequency "+ frequency);
	}

	date.setHours(date_start.getHours());
	date.setMinutes(date_start.getMinutes());
	date.setSeconds(date_start.getSeconds());
	date.setMilliseconds(date_start.getMilliseconds());
	date.setDate(date_start.getDate());

	if(date.getUTCDate() != date_start.getUTCDate()){
		date.setDate(0);
	}

	return date;
}

export function getMonthBetweenDate(startDate, endDate){
	const start = startDate,
	end = endDate;

	let months = (end.getFullYear() - start.getFullYear()) * 12;
	months += end.getMonth() - start.getMonth();

	if(start.getDate() < end.getDate()){
		months--;
	}
	else if(end.getHours() < start.getHours()){
		months--;
	}

	return months <= 0 ? 0: months
}