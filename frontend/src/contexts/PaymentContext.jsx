import { createContext, useState, useContext } from 'react'
import axios from 'axios'
import { userCardEndpoint } from '../endpoint.js'
import { useAuth } from './AuthContext.jsx'
import { toast } from '../hooks/use-toast';
import { usersApi } from '../utils/api.js'

const PaymentContext = createContext();

export function PaymentProvider({children}){
	let [cards, setCards] = useState(),
	{ user } = useAuth();

	async function fetch_cards(){
		let response = await usersApi.list_cards(user.id);

		setCards(response.data.data);
	}

	return <PaymentContext.Provider value={{ cards, fetch_cards }}>
		{children}
	</PaymentContext.Provider>
}

export function usePayment(){
	let context = useContext(PaymentContext);

	if(!context){
		throw Error("userPayement should be use inside a PaymentContext Provider");
	}

	return context;
}