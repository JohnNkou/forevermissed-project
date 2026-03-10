import { createContext, useContext, useState } from 'react';

export const CartContext = createContext();

export function CartProvider({ children }){
	let [chosenAbonnement, setChosenAbonnement] = useState();

	function chooseAbonnement(abonnement){
		console.log("Chosing abonnement",abonnement);
		setChosenAbonnement(abonnement);
	}

	function chooseFrequency(frequency){
		setFrequency(frequency);
	}

	return <CartContext.Provider value={{ chosenAbonnement, chooseAbonnement }}>
		{children}
	</CartContext.Provider>
}

export function useCart(){
	let context = useContext(CartContext);

	if(!context){
		throw Error("useCart didn't find a CartProvider")
	}

	return context;
}