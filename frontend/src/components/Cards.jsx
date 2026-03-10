import { usePayment } from '../contexts/PaymentContext'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Dialog, DialogTitle, DialogContent } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from '../components/ui/select'
import { useState } from 'react'
import { Card } from './Payments'
import { toast } from '../hooks/use-toast'
import { usersApi } from '../utils/api.js'

export function CardChooser({ onSelected=()=>{} }){
	let { cards, fetch_cards } = usePayment(),
	[showDialog, setShowDialog] = useState(false),
	[paymentCard, setPaymentCard] = useState(),
	[message, setMessage] = useState();

	async function onCardAdded(new_card){
		try{
			setMessage('Chargement...');
			await fetch_cards();
		}
		catch(error){
			console.error(error);
			toast.error({
				title:"Erreur",
				description:"Une erreur est survenue lors de la recherche de moyen de paiement"
			})
		}
		setMessage('');
	}

	function selectCard(event){
		let target = event.target,
		id = target.value,
		card = cards.find((card)=> card._id == id);

		if(card){
			onSelected(card);
		}
	}

	function onAdded(){
		fetch_cards().catch((error)=>{
			console.error(error);

			toast({
				title:"Erreur",
				description:"Une erreur est survenue lors de la recherche des cartes"
			})
		})
	}

	return <form onChange={selectCard} className='flex flex-col gap-2'>
		<p>{message}</p>
		<p><Button type='button' onClick={(event)=> setShowDialog(true)}>Ajouter une carte</Button></p>
		{cards.map((card)=>{
			return <div key={card._id} className='flex gap-2 items-center'>
				<Card card={card} />
				<input type='radio' value={card._id} name='card' />
			</div>
		})}
		{ !cards.length && <p>Aucune carte trouvé</p> }

		{ showDialog && <AddCardDialog onAdded={onAdded} hideDialog={()=> setShowDialog(false)} /> }
	</form>
}


export function AddCardDialog({ hideDialog, onAdded }){
	let { user } = useAuth(),
	[message, setMessage] = useState('');

	function handleSubmit(event){
		event.preventDefault();

		let form = new FormData(event.target),
		payloads = {},
		message;

		for(let [name,value] of form.entries()){
			payloads[name] = value;
		}

		payloads.expiration_date = payloads.expiration_month + "/" + payloads.expiration_year;
		delete payloads.expiration_month; delete payloads.expiration_year;

		setMessage('');

		usersApi.add_card(user.id,payloads).then((response)=>{
			if(response.status == 201){
				message = "Carte ajouté";
				event.target.reset();
				
				if(onAdded){
					onAdded(payloads);
				}
			}
			else{
				console.error(response.data);
				message = response.data?.detail || "La carte n'as pas pu etre ajoutée";
			}

		}).catch((error)=>{
			let response = error.response;

			if(response && response.status == 400){
				message = "Carte invalide";
			}
			else{
				message = "Une erreur est survenue lors de l'ajout de la carte";
				console.error(error);
			}
		}).finally(()=>{ setMessage(message)})
	}

	return <Dialog onClose={hideDialog} defaultOpen="true">
		<DialogContent>
			<p className='mb-2'>{message}</p>
			<form onSubmit={handleSubmit} className='grid grid-cols-3'>
				<div className='col-span-3'>
					<Label>id</Label>
					<Input name='id' required />
				</div>
				<div className='col-span-3 mb-3'>
					<Label>Nom sur la carte</Label>
					<Input name='name' required />
				</div>
				<div className='col-span-3 grid grid-cols-6 gap-2'>
					<div className='col-span-5 mb-3'>
						<Label>Numero</Label>
						<Input required name='number' />
					</div>
					<div className='mb-3'>
						<Label>ccv</Label>
						<Input name='ccv' />
					</div>
				</div>
				<div className='col-span-3 mb-3'>
					<CardExpireField />
				</div>
				<div className="col-span-3 flex justify-center gap-4">
					<Button type='submit'>Ajouter</Button>
					<Button className='bg-secondary text-black' type='button' onClick={hideDialog}>Fermer</Button>
				</div>
			</form>
		</DialogContent>
	</Dialog>
}

function CardExpireField(){
	let months = "0".repeat(12).split('').map((_,index)=> String(Number(index) + 1)),
	current_year = (new Date()).getFullYear(),
	years = "0".repeat(10).split('').map((_,index)=> String(current_year + Number(index)));

	return <div className='flex flex-col gap-1'>
		<Label>Date d'expiration</Label>
		<div className='grid grid-cols-5 gap-2'>
			<Select name="expiration_month" required>
				<SelectTrigger>
					<SelectValue placeholder="Mois" />
				</SelectTrigger>
				<SelectContent>
					{months.map((month)=> {
						month = month.padStart(2,0);

						return <SelectItem key={month} value={month}>
						{month} </SelectItem> 
					}
					)}
				</SelectContent>
			</Select>
			<Select name='expiration_year'>
				<SelectTrigger>
					<SelectValue placeholder="Année" />
				</SelectTrigger>
				<SelectContent>
					{years.map((year)=> <SelectItem key={year} value={year}>
						{year}
					</SelectItem> )}
				</SelectContent>
			</Select>
		</div>
	</div>
}