import { Dialog, DialogTitle, DialogContent } from './ui/dialog'

export default function AbonnementView({abonnement, onClose}){
	return <Dialog open={true} onOpenChange={onClose}>
		<DialogContent className='grid grid-cols-2 gap-2'>
			<h4 className='font-semibold'>Type</h4><span>{abonnement.type}</span>
			<h4 className='font-semibold'>Price</h4><div className='flex gap-2'>
				<span>{abonnement.price}</span>
				<span>{abonnement.currency}</span>
			</div>
			<h4 className='font-semibold'>Maximum memorial</h4><span>{abonnement.maxMemorial}</span>
			<h4 className='font-semibold'>Maximum tribute</h4><span>{abonnement.maxTribute}</span>
			<div className='col-span-2'>
				<h3 className='font-semibold'>Video</h3>
				<div className='grid grid-cols-2 ps-4'>
					<h4 className='font-semibold'>Maximum</h4><span>{abonnement.maxVideo.number}</span>
					<h4 className='font-semibold leading-none'>Temps par video(second)</h4><span>{abonnement.maxVideo.time}</span>
				</div>
			</div>
			<div className='col-span-2'>
				<h3 className='font-semibold'>Photo</h3>
				<div className='grid grid-cols-2 ps-4'>
					<h4 className='font-semibold'>Maximum</h4><span>{abonnement.maxPicture.number}</span>
					<h4 className='font-semibold'>Taille par video(bytes)</h4><span>{abonnement.maxPicture.size}</span>
				</div>
			</div>
		</DialogContent>
	</Dialog>
}