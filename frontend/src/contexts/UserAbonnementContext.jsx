import { createContext, useEffect, useState, useContext } from 'react'
import { useAuth } from './AuthContext';
import { abonnementsApi } from '../utils/api'
import { toast } from '../hooks/use-toast'

export const UserAbonnementContext = createContext();

export function UserAbonnementProvider({children}){
	let [user_abonnement, setAbonnement] = useState(),
	{ user } = useAuth();

	useEffect(()=>{
		if(user){
			if(!user.abonnement){
				return console.warn("Not user abonnement found");
			}
			abonnementsApi.get(user.abonnement.id).then((response)=>{
				setAbonnement(response.data.data);
			}).catch((error)=>{
				console.error(error);
				toast({
					title:"Erreur",
					description:"Abonnment de l'utilisateur n'a pas pu être chargé"
				})
			})
		}
	},[true]);

	return <UserAbonnementContext.Provider value={{ user_abonnement }}>
		{children}
	</UserAbonnementContext.Provider>
}

export function useUserAbonnement(){
	let context = useContext(UserAbonnementContext);

	if(!context){
		throw Error("useUserAbonnement should be called inside the UserAbonnementContext Provider");
	}

	return context;
}