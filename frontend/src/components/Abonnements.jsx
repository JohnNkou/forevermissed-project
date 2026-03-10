import { abonnementsApi } from '../utils/api.js'
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext'
import { toast } from '../hooks/use-toast';
import { Button } from '../components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useCart, CartContext } from '../contexts/CartContext.jsx'
import { Video, BookOpenText, Heart, Camera, CalendarSync, CalendarFold } from 'lucide-react'

export default function Abonements(){
	let [abonnements, setAbonnements] = useState(),
	{ user }  = useAuth(),
	[myAbonnement, setMyAbonnement] = useState(),
	[loading, setLoading] = useState(true),
	{ chooseAbonnement } = useCart(CartContext),
	navigate = useNavigate(),
	frequency;

	if(myAbonnement){
		switch(myAbonnement.frequency){
		case 'monthly':
			frequency = 'mensuel'
			break;
		case 'yearly':
			frequency = 'annuel';
			break;
		default:
			throw Error("Unknwon frequency");
		}

	}

	useEffect(()=>{
		if(user && user.abonnement){
			setMyAbonnement(user.abonnement);
			setLoading(false);
		}
		else{
			abonnementsApi.list().then((response)=>{
				setAbonnements(response.data.abonnements);
			}).catch((error)=>{
				toast({
					title:"Erreur",
					description:"Une erreur est survenue lors des chargements des abonnements"
				})
			}).finally(()=>{
				setLoading(false);
			})
		}
	},[true])

	function order(event){
		event.preventDefault();

		let target = event.target,
		id = target.getAttribute('abonnementId');

		if(id){
			let abonnement = abonnements.find((ab)=> ab._id == id);

			if(!abonnement){
				toast({
					title:"Abonnement couldn't be found",
					description:"Abonnement chosen coudln't be found"
				})
			}
			else{
				chooseAbonnement(abonnement);
			}


			navigate(`/cart/${id}`);
		}
		else{
			console.error("No id given");
		}
	}


	if(loading){
		return <p>Chargements des abonnements</p>
	}

	if(myAbonnement){
		myAbonnement.expiration_date = new Date(myAbonnement.expiration_date);

		return <div className='bg-white mx-auto max-w-xl border rounded p-6'>
			<h4 className='font-bold text-gray-500'>Plan actuel</h4>
			<h3 className='capitalize font-bold leading-0'>{myAbonnement.type}</h3>
			<div className=''>
				<div className='grid col-span-2 grid-cols-2 gap-2 items-top'>
					<div className='flex gap-2 items-start'>
						<CalendarSync className='text-primary' size={40} />
						<div>
							<p className='text-gray-500'>Fréquence</p>
							<p className='capitalize font-semibold'>{frequency}</p>
						</div>
					</div>
					<div className='flex gap-2'>
						<CalendarFold  size={40} className='text-primary' />
						<div>
							<p className='text-gray-500'>Expire le</p>
							<p className='font-semibold'>{myAbonnement.expiration_date.toLocaleDateString('fr-FR')}</p>
						</div>
					</div>
				</div>
				<div className='mt-4 text-center hidden'>
					<Button>Annuler</Button>
				</div>
			</div>
		</div>
	}

	if(abonnements && abonnements.length){
		return <div onClick={order} className='grid grid-cols-4 gap-3 px-4'>
			{abonnements.map(({ _id, type, maxVideo, maxMemorial, maxPicture, price, currency, maxTribute })=>{
				return <div key={_id} className='bg-white border rounded-3xl pb-4'>
						<div className='flex flex-col pt-2 gap-2'>
							<div className='flex bg-white flex-col'>
								<div className='text-center mb-3'>
									<h3 className='font-bold  capitalize'>{type}</h3>
									<span>{price}{currency}</span>
								</div>
								<div className='px-10 flex flex-col gap-3'>
									<div className='flex gap-3'>
										<Video className='text-primary' />
										<div>
											<p className='font-semibold'>{maxVideo.number} Vidéos</p>
											<p className='text-gray-600 text-base'>({maxVideo.time} sec/vidéo)</p>
										</div>
										
									</div>
									
									<p className='flex gap-3'>
										<BookOpenText className='text-primary' />
										<span>{maxMemorial} Memorials</span>
									</p>
									<p className='flex gap-3'>
										<Heart className='text-primary' />
										<span>{maxTribute} Hommages</span>
									</p>
									<div className='flex gap-3'>
										<Camera className='text-primary' />
										<div>
											<p>{maxPicture.number} Photos</p>
											<p>{maxPicture.size} b / photo</p>
										</div>
									</div>
								</div>
							</div>
							<div className='text-center mt-3 bg-blue-500 text-white'>
								
							</div>
							<div className='text-center mt-auto'><Button abonnementId={_id}>choisir</Button></div>
						</div>
				</div>
			})}

		</div>
	}
}