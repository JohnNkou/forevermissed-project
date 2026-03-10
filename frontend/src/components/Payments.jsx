import { usersApi } from '../utils/api.js'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext';
import { usePayment } from '../contexts/PaymentContext.jsx'
import { toast } from '../hooks/use-toast';
import { Button } from './ui/button';
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectTrigger, SelectValue, SelectPortal, SelectContent, SelectItem } from './ui/select'
import { Dialog, DialogTrigger, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogClose } from './ui/dialog'
import { AddCardDialog } from './Cards'

export default function Payments(){
	let [loading, setLoading] = useState(false),
	[showAllDialog, setShowAddDialog] = useState(false),
	{ user } = useAuth(),
	{ fetch_cards, cards } = usePayment();

	useEffect(()=>{
		setLoading(true);

		fetch_cards().catch((error)=>{
			console.error(error);
			toast({
				title:"Erreur",
				description:"Une erreur est survenue lors du chargement des cartes"
			})
		}).finally(()=> setLoading(false));
	},[true])

	return <div className='mx-10'>
		{loading && <div><p>Chargement des cartes</p></div>}
		<div className='text-center flex justify-center gap-4'>
			<h1 className='text-3xl font-bold text-center'>
				Cartes
			</h1>
			<Button  onClick={()=> setShowAddDialog(true) }>Ajouter</Button>
		</div>
		<div className='text-center'>
			
			<div className='grid grid-cols-5'>
				{ cards && cards.length != 0 && cards.map((card)=>{
					return <Card card={card} key={card._id} />
				})}
				{ cards && cards.length == 0 && <p className='text-center col-span-5 mt-5'>Aucun moyen de paiement trouvé</p> }
			</div>
		</div>
		{showAllDialog && <AddCardDialog hideDialog={()=> setShowAddDialog(false)} />}
	</div>
}


export function Card({ card }){
	return <div className='from-blue-400 py-3 to-rose-800 text-white bg-gradient-to-br rounded grid grid-cols-2 border px-2'>
		<p className='col-span-2 font-bold mb-6'>{card.name}</p>
		<p className='text-start'>{"*".repeat(5)} {card.number}</p>
		<p className='text-end'>{card.expiration_date.slice(0,3)}{card.expiration_date.slice(-2)}</p>
	</div>
}