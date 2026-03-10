import { useEffect, useState, cache } from 'react'

const computeTotal = cache((adder, price)=>{
	return adder.reduce((value,adder)=>{
		return value * adder.number;
	},price)
})

export default function Resumer({ abonnement, frequency }){
	let [price, setPrice] = useState(abonnement.price),
	[adder, setAdder] = useState([]),
	total = computeTotal(adder,price),
	currency = abonnement.currency;

	useEffect(()=>{
		if(frequency){
			switch(frequency.value){
			case 'monthly':
				setAdder([{ label:'Période', value:'1 mois', number:1 }])
				break;
			case 'yearly':
				setAdder([{ label:'Période', value:'12 mois', number:12 }])
				break;
			}
		}
	},[frequency])

	return <div className='p-4 px-10 bg-white rounded-lg'>
		<h4 className='font-semibold mb-4'>Résumé de la commande</h4>
		<div className='flex flex-col gap-3'>
			<div className='grid grid-cols-2'>
				<p>Prix unitaire:</p><p>{price} {currency}</p>
			</div>
			
			{adder.map((adder)=>{
				return <div className='grid grid-cols-2'>
					<p>{adder.label}</p>
					<p>{adder.value}</p>
				</div>
			})}

			<p className='col-span-2 border-b'></p>
			<div className='grid grid-cols-2'>
				<strong>Total:</strong><strong className='text-primary'>{total}{currency}</strong>
			</div>
		</div>
	</div>
}