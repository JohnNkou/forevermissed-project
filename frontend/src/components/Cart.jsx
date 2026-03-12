import { useParams, useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { usePayment } from '../contexts/PaymentContext'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from '../components/ui/select'
import { Label } from './ui/label'
import { Button } from './ui/button'
import { toast } from '../hooks/use-toast'
import Resumer from './Resumer'
import { CardChooser } from './Cards'
import { ordersApi } from '../utils/api'
import { useLoading } from '../contexts/LoadingContext'

export default function Cart(){
	let [frequency, setFrequency] = useState(),
	[selectedCard, setSelectedCard] = useState(),
	loader = useLoading(),
	params = useParams(),
	{ chosenAbonnement } = useCart(),
	{ fetch_cards, cards } = usePayment(),
	{ reload_user } = useAuth(),
	navigate = useNavigate();

	if(!chosenAbonnement){
		toast({
			title:"Erreur",
			description:"Aucun abonnement trouvé"
		});

		setTimeout(()=>{
			navigate('/');
		},5000)

		return;
	}

	function chooseFrequency(frequency){
		let data;
		if(frequency == 'yearly'){
			data = { label:'Par année', value: frequency };
		}
		else if(frequency == 'monthly'){
			data = { label:'Par mois', value: frequency };
		}
		else{
			console.error("Unknwon frequency",frequence);
		}

		if(data){
			setFrequency(data);

			if(!cards){
				fetch_cards().catch((error)=>{

				})
			}
		}
	}

	async function makePayment(){
		try{
			loader.showMessage("Traitement de la commande");

			let data = {
				abonnement:{
					id: chosenAbonnement._id,
					frequency: frequency.value
				},
				payment_data:{
					_id: selectedCard._id
				}
			},
			response = await ordersApi.add(data);

			toast({
				title:'Abonnement effectué',
				description:"Felicitation"
			})

			response = await reload_user().catch((error)=> ({error}));

			if(!response){
				setTimeout(()=>{
					navigate('/profile');
				},3000)
			}
			else{
				console.error(response.error);

				toast({
					title:"Erreur Utilisateur",
					description:"Une erreur est survenue das"
				})
			}
		}
		catch(error){
			console.error(error);
			let response = error.response,
			message = "Une erreur est survenue lors de la transaction";

			if(response){
				message = response.data.detail || message;
			}
			toast({
				title:'Erreur',
				description: message
			})
		}

		loader.showMessage("");
	}

	return <div className='p-5 bg-gray-100'>
		<div>
			<h1 className='font-bold text-center'>Paiement</h1>
		</div>
		<div className='flex gap-20 items-top'>
			<div className='flex flex-1 flex-col gap-5'>
				<div className='bg-white rounded-lg p-4'>
					<h4 className='mb-4'>
						<p className='font-bold'>Type d'abonnement</p> 
						<span className='capitalize'>{chosenAbonnement.type}</span>
					</h4>
					<div>
						<p>Fréquence de facturation</p>
						<div className='flex gap-4 items-center'>
							<div style={{maxWidth:'200px'}}>
								<Select  onValueChange={chooseFrequency}>
									<SelectTrigger>
										<SelectValue placeholder='periode' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='monthly'>Par mois</SelectItem>
										<SelectItem value='yearly'>Par année</SelectItem>
									</SelectContent>
								</Select>
							</div>
							{frequency && <div className='text-base flex gap-3'>
								<span className='text-gray-600'>Frequence:</span>
								<span>{frequency.label}</span>
							</div>}
						</div>
					</div>
				</div>
				<div className='bg-white rounded-lg p-4'>
					{ frequency && cards && 
					<div>
						<h4 className='font-bold'>Moyen de paiement</h4>
						<CardChooser onSelected={(card)=> setSelectedCard(card) } />
					</div>}
				</div>

			</div>
			<div className='ms-auto'>
				<div className='mb-4'>
					<Resumer abonnement={chosenAbonnement} frequency={frequency} />
				</div>
				<div className='text-center'>
					{ selectedCard && <Button onClick={makePayment} className='w-50 px-24'>Payer</Button> }
				</div>
			</div>
		</div>
	</div>
}