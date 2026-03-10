import { Dialog, DialogTitle, DialogContent } from './ui/dialog'
import { abonnementsApi } from '../utils/api'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { useState } from 'react'
import { toast } from '../hooks/use-toast'
import { useLoading } from '../contexts/LoadingContext'

export default function AbonnementAdd({ onClose, onSuccess, abonnement }){
	let [payload, setPayload] = useState({
		frequency:['monthly','yearly']
	}),
	defaultType = abonnement && abonnement.type || '',
	defaultPrice = abonnement && abonnement.price || '',
	defaultCurrency = abonnement && abonnement.currency || '',
	defaultMaxVideoNumber = abonnement && abonnement.maxVideo.number || '',
	defaultMaxVideoTime = abonnement && abonnement.maxVideo.time || '',
	defaultMaxPictureNumber = abonnement && abonnement.maxPicture.number || '',
	defaultMaxPictureSize = abonnement && abonnement.maxPicture.size || '',
	defaultMaxMemorial = abonnement && abonnement.maxMemorial || '',
	defaultMaxTribute = abonnement && abonnement.maxTribute || '',
	loader = useLoading();

	function handleSubmit(event){
		event.preventDefault();

		let target = event.target,
		method = !abonnement ? 'add': 'update',
		message = !abonnement ? 'Abonnement ajouté' : 'Abonnement modifié';

		loader.showMessage("Envoi");

		abonnementsApi[method](payload).then((response)=>{
			if(response.status == 201){
				toast({
					title:message
				})

				target.reset();
				onSuccess();
			}
			else{
				console.log(response);
				toast({
					title:"Echec",
					description:`L'abonnement n'as pas pu etre ${!abonnement ? 'ajouté':'modifié'}`
				})
			}
		}).catch((error)=>{
			console.error(error);
			toast({
				title:"Erreur",
				description:`Une erreur est survenue lors de ${!abonnement ? "l'ajout":"la modification"} de l'abonnement`
			})
		}).finally(()=>{
			loader.showMessage('');
		})
	}

	function onChange(event){
		let target = event.target,
		value = target.value,
		name = target.name;

		setPayload((x)=>{
			let [key_1, key_2] = name.split('-');

			if(!key_2){
				x[name] = value;
			}
			else{
				if(!x[key_1]){
					x[key_1] = {};
				}

				x[key_1][key_2] = value;
			}

			return x;
		})
	}

	function updateAbonnement(event){
		let target = event.target,
		name = target.name,
		value = target.value,
		keys;

		if(name.indexOf('-') != -1){
			keys = name.split('-');

			if(abonnement[keys[0]][keys[1]] == value){
				return;
			}
		}
		else if(abonnement[name] == value){
			return;
		}

		setPayload((x)=>{
			if(keys){
				let [key_1, key_2] = keys;

				if(!x[key_1]){
					x[key_1] = {};
				}

				x[key_1][key_2] = value
			}
			else{
				x[name] = value;
			}

			return x;
		})
	}

	console.log('AB',abonnement);

	return <Dialog open={true} onOpenChange={onClose}>
		<DialogContent className='max-h-full overflow-scroll'>
			<DialogTitle>Ajout abonnement</DialogTitle>
			<form onSubmit={handleSubmit} onInput={!abonnement ? onChange : updateAbonnement}>
				<div className='grid grid-cols-2 gap-2'>
					<Label>Type</Label><Input required name='type' defaultValue={defaultType} />
					<Label>Prix</Label>
					<div className='grid grid-cols-2 gap-2'>
						<Input required type='number' name='price' defaultValue={defaultPrice} /> 
						<select required name='currency' defaultValue={defaultCurrency}>
							<option></option>
							<option>USD</option>
							<option>CDF</option>
						</select>
					</div>
					<div className='col-span-2 border-t mt-4'>
						<h4 className='mb-4 font-semibold'>Video</h4>
						<div className='grid grid-cols-2 gap-2'>
							<Label>Maximum</Label><Input required type='number' name='maxVideo-number' defaultValue={defaultMaxVideoNumber} />
							<Label>Nombre de seconde par video</Label><Input required type='number' name='maxVideo-time' defaultValue={defaultMaxVideoTime} />
						</div>
					</div>
					<div className='col-span-2 border-t mt-4 border-b pb-4'>
						<h3 className='mb-4 font-semibold'>Photo</h3>
						<div className='grid grid-cols-2 gap-2'>
							<Label>Maximum</Label><Input required type='number' name='maxPicture-number' defaultValue={defaultMaxPictureNumber} />
							<Label>Taille maximum par photo (byte)</Label><Input required type='number' name='maxPicture-size' defaultValue={defaultMaxPictureSize} className='justify-self-start' />
						</div>
					</div>
					<Label>Maximum memorial</Label><Input required type='number' name='maxMemorial' defaultValue={defaultMaxMemorial} />
					<Label>MaxTribute</Label><Input type='number' required name='maxTribute' defaultValue={defaultMaxTribute} />
				</div>
				<div className='flex justify-center gap-2 mt-4'>
					<Button type='submit'>{!abonnement ? 'Ajouter': 'Modifier'}</Button>
					<Button type='button' onClick={onClose}>Fermer</Button>
				</div>
			</form>
		</DialogContent>
	</Dialog>
}