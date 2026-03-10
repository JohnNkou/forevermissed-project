import { Dialog, DialogContent, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { useState } from 'react';
import { toast } from '../hooks/use-toast';
import { usersApi } from '../utils/api.js'

export default function UserAdd({ onClose, onSuccess }){
	let [payload, setPayload] = useState({}),
	[message, setMessage] = useState();

	function updatePayload(event){
		let target = event.target,
		value = target.value;

		setPayload((x)=> {
			x[target.name] = value;

			return x;
		})
	}

	function handleSubmit(event){
		event.preventDefault();

		let target = event.target;

		if(payload.name && payload.email && payload.password){
			setMessage('ajout');

			usersApi.add(payload).then((response)=>{
				if(response.status == 201){
					target.reset();
					toast({
						title:'Operation successfull'
					});
					onSuccess();
				}
				else{
					console.log("BAd status", response.status);
					console.log(response.data);
					toast({
						title:"User couldn't be added"
					})
				}
			}).catch((error)=>{
				console.log(error);
				toast({
					title:"An error occured"
				})
			}).finally(()=>{
				setMessage('');
			})
		}
		else{
			toast({
				title:"Erreur",
				description:"Veuillez completez tout les champs"
			})
		}
	}

	return <Dialog open={true} onOpenChange={onClose}>
		<DialogContent>
			<DialogTitle>Ajout administrateur</DialogTitle>
			<form onInput={updatePayload} onSubmit={handleSubmit}>
				<p>{message}</p>
				<div className='grid grid-cols-2 gap-2'>
					<Label>Nom</Label><Input required type='text' name='name' />
					<Label>Email</Label><Input required type='email' name='email' />
					<Label>Mot de passe</Label><Input required type='password' name='password' />
				</div>
				<div className='flex gap-2 justify-center mt-3'>
					<Button>Ajouter</Button>
					<Button onClick={onClose}>Fermer</Button>
				</div>
			</form>
		</DialogContent>
	</Dialog>
}