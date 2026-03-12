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
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs'
import { ordersApi } from '../utils/api.js'

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

	return <Tabs defaultValue='transaction'>
		<TabsList className='w-full bg-transparent'>
			<TabsTrigger value='transaction'>Transaction</TabsTrigger>
			<TabsTrigger value='carte'>Cartes</TabsTrigger>
		</TabsList>
		<TabsContent value='transaction'>
			<Transaction />
		</TabsContent>
		<TabsContent value='carte'>
			<div className='mx-10'>
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
		</TabsContent>
	</Tabs>
}

function Transaction(){
	let [message, setMessage] = useState('Chargement'),
	[orders, setOrders] = useState();

	useEffect(()=>{
		ordersApi.list().then((response)=>{
			console.log('RESPONSE',response);
			let data = response.data.orders;

			setOrders(data);
		}).catch((error)=>{
			console.error(error);
			setMessage('Une erreur est survenue lors du chargement des transactions');
		}).finally(()=>{
			setMessage('');
		})
	},[]);

	return <div className='p-6'>
		<p></p>
		<table className='table-fixed w-full text-center'>
			{ orders && orders.length &&
				<>
					<thead>
						<tr className='bg-primary text-white'>
							<th>Periode</th>
							<th>Prix</th>
							<th>Status</th>
							<th>Date</th>
						</tr>
					</thead>
					<tbody>
						{ orders.map((order)=>{
							let due_date = new Date(order.due_date).toLocaleDateString('fr-FR', { weekday:'short', month:'long', day:'numeric', year:'numeric' }),
							date_created = new Date(order.date_created).toLocaleDateString('fr-FR', { weekday: 'short', month:'long', day:'numeric', year:'numeric' });

							return <tr className='border-b text-gray-900 bg-white text-base' key={order._id}>
								<td>{due_date}</td>
								<td className='font-semibold'>{order.price} {order.currency}</td>
								<td>{order.status}</td>
								<td>{date_created}</td>
							</tr>
						}) }
					</tbody>
				</>
			}
		</table>
	</div>
}


export function Card({ card }){
	return <div className='from-blue-400 py-3 to-rose-800 text-white bg-gradient-to-br rounded grid grid-cols-2 border px-2'>
		<p className='col-span-2 font-bold mb-6'>{card.name}</p>
		<p className='text-start'>{"*".repeat(5)} {card.number}</p>
		<p className='text-end'>{card.expiration_date.slice(0,3)}{card.expiration_date.slice(-2)}</p>
	</div>
}