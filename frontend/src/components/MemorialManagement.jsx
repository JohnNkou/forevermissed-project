import { useState, useEffect } from 'react';
import { memorialsApi } from '../utils/api'
import { toast } from '../hooks/use-toast'
import { Tabs, TabsTrigger, TabsList, TabsContent } from './ui/tabs'
import { Button } from './ui/button'
import { FileUploader } from './FileUploader'
import { memorialVideoEndpoint, memorialPictureEndpoint } from '../endpoint.js'
import { useParams } from 'react-router-dom'
import { Storage } from '../utils/storage'
import { useUserAbonnement } from '../contexts/UserAbonnementContext'
import { useViewer } from '../contexts/ResourceViewerContext'
import { Edit, Play, Trash } from 'lucide-react'

const TAB_STORAGE_NAME='memorial-tab-value';

export default function MemorialManagement(){
	let { id } = useParams(),
	[memorial, setMemorial] = useState(),
	[loading, setLoading] = useState(false),
	[storage] = useState(new Storage()),
	[tabValue, setTabValue] = useState(storage.get(TAB_STORAGE_NAME) || 'detail'),
	{ user_abonnement } = useUserAbonnement(),
	viewer = useViewer();

	async function fetch_memorial(){
		let response = await memorialsApi.get(id);

		response.data.birth_date = new Date(response.data.birth_date);
		response.data.death_date = new Date(response.data.death_date);

		setMemorial(response.data);
	}

	async function reload_memorial(){
		try{
			let response = await memorialsApi.get(id);

			response.data.birth_date = new Date(response.data.birth_date);
			response.data.death_date = new Date(response.data.death_date);

			setMemorial(response.data);
		}
		catch(error){
			console.error(error);

			toast({
				title:'Erreur',
				description:"Erreur lors du chargement de memorial"
			})
		}
	}

	function changeTabValue(new_value){
		storage.set(TAB_STORAGE_NAME, new_value);

		setTabValue(new_value);
	}

	function actionClickHandler(event){
		event.preventDefault();

		let target = event.target,
		action = target.getAttribute('action'),
		parent,index,type,resource,resources;

		if(!action){
			for(let i=0; i < 5 && !action; i++){
				target = target.parentNode;

				if(target && target.getAttribute){
					action = target.getAttribute('action');
				}
				else{
					break;
				}
			}
		}

		if(action){
			for(let i=0; i < 5; i++){
				parent = target.parentNode;
				index = parent.getAttribute('index');

				if(index){
					break;
				}

				target = parent;
			}
			if(!index){
				return console.warn("Find action but without index",index);
			}

			type = parent.getAttribute('type');

			switch(type){
			case 'picture':
				resources = memorial.gallery;

				resource = resources[index];
				break;
			case 'video':
				resources = memorial.videos;
				resource = resources[index];
				break;
			default:
				throw Error("Unknwon type in actionClickHandler "+ type);
			}

			if(!type){
				throw Error("No type provided for the action "+type);
			}

			switch(action){
			case 'delete':
				if(confirm("Etes vous sur de vouloir supprimer cette resource")){
					let method;

					if(type == 'video'){
						method = 'deleteVideo';
					}
					else if(type == 'picture'){
						method = 'deletePicture';
					}
					else{
						throw Error("Unknwown type: "+ type);
					}

					setLoading(true);

					memorialsApi[method](id, resource.src).then((response)=>{
						if(response.status == 201){
							reload_memorial();
						}
						else{
							console.log(response.status);
							console.log(response.data);
							alert("La resource n'a pas pu etre supprimé");
						}
					}).catch((error)=>{
						console.error(error);
						alert("Une erreur est survenue");
					}).finally(()=>{
						setLoading(false);
					})

				}
				break;
			case 'show':
				viewer.startViewing({
					resources, index, type, id
				})
				break;
			default:
				console.log("Unhandled");
			}
		}
	}

	useEffect(()=>{
		if(id){
			setLoading(true);
			fetch_memorial().catch((error)=>{
				console.error(error);

				toast({
					title:"Erreur",
					description:"Une erreur est survenue lors du chargement du memorial"
				})
			}).finally(()=> setLoading(false));
		}
		else{
			toast({
				title:"Erreur",
				description:"No id was found"
			})
			console.error("No params given",id);
		}
	},[id]);

	if(loading){
		return <div>Chargment...</div>
	}

	if(memorial){
		return <div className='py-5'>
			<div className='mb-5'>
				<h1 className='text-center'>Memorial de {memorial.name}</h1>
			</div>
			<div className='px-10'>
				<Tabs value={tabValue} onValueChange={changeTabValue} className='border min-w-50' justify='center'>
					<TabsList className='flex justify-center p-5 tabs'>
						<TabsTrigger className='' value='detail'><h3>Details</h3></TabsTrigger>
						<TabsTrigger value='video'><h3>Videos</h3></TabsTrigger>
						<TabsTrigger value='photo'><h3>Photos</h3></TabsTrigger>
					</TabsList>
					<TabsContent value='detail' className='px-5 py-3 bg-zinc-100 flex gap-4 items-start'>
						<div className='flex flex-col gap-5 p-6 rounded-sm bg-zinc-200'>
							<div className='max-w-60 max-h-60 bg-white p-6'>
								<img className='w-40 h-40 object-cover' src={memorial.image + '?memorial_id=' + memorial._id} />
								<p className='text-center'>Profile</p>
							</div>
							<div className='max-w-60 max-h-60 p-6 bg-white'>
								<img className='w-40 h-40 object-cover' src={memorial.background_image + '?memorial_id=' + memorial._id} />
								<p className='text-center'>Image de fond</p>
							</div>
							<div className='max-w-60 p-6 bg-white text-center'>
								<audio className='w-full inline-block border text-center' controls src={memorial.background_sound + '?memorial_id=' + memorial._id} />
								<p className='text-center'>Music de fond</p>
							</div>
						</div>
						<div className='flex-1 p-6 grid grid-cols-2 gap-2 bg-zinc-200'>
							<div className='bg-white p-6 rounded-lg'>
								<div className='grid grid-cols-3 items-center'>
									<h4 className='col-span-2 font-bold text-primary'>Information du défunt</h4>
									<p className='text-end'><Edit className='inline-block' /></p>
								</div>
								<div className='grid grid-cols-2 mt-4 gap-4'>
									<div>
										<label className='font-semibold'>Nom</label>
										<p>{memorial.name}</p>
									</div>
									<div>
										<label className='font-semibold'>date de naissance</label>
										<p>{memorial.birth_date.toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}</p>
									</div>
									<div>
										<label className='font-semibold'>Lieu de naissance</label>
										<p>{memorial.birth_place}</p>
									</div>
									<div>
										<label className='font-semibold'>Date de deces</label>
										<p>{memorial.death_date.toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}</p>
									</div>
									<div>
										<label className='font-semibold'>Lieu de deces</label>
										<p>{memorial.death_place}</p>
									</div>
								</div>
							</div>
							<div className='bg-white p-6 rounded-lg'>
								<div className='grid grid-cols-2 mb-4'>
									<h4 className='text-nowrap font-semibold text-primary'>Information supplementaire</h4>
									<p className='text-end'><Edit className='inline-block' /></p>
								</div>
								<div className='grid grid-cols-2 gap-4'>
									<div className='flex flex-col col-span-2'>
										<strong>Biographie</strong>
										<p>{memorial.biography}</p>
									</div>
									<div className='flex flex-col'>
										<strong>Nécrologie</strong>
										<p>{memorial.obituary}</p>
									</div>
								</div>
							</div>
						</div>
					</TabsContent>
					<TabsContent value='video' className='px-5 py-3'>
						<MemorialResource accept=".mp4, .mov" title='video' type='video' id={memorial._id} max={ user_abonnement ? user_abonnement.maxVideo.number : 0} resources={memorial.videos} actionElement={<ResourceActionElement remove={true} />} remove={true} onUploaded={reload_memorial} actionClickHandler={actionClickHandler} />
					</TabsContent>
					<TabsContent value='photo' className='px-5 py-3'>
						<MemorialResource accept=".jpg,.jpeg,.png" remove={true} title='photo' type='picture' id={memorial._id} max={user_abonnement ? user_abonnement.maxPicture.number : 0} resources={memorial.gallery} actionElement={<ResourceActionElement remove={true} />} onUploaded={reload_memorial} actionClickHandler={actionClickHandler} />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	}
	else{
		return null;
	}
}

export function ResourceActionElement({ show=true, remove=false }){
	let className = 'text-center border border-t-0';

	if(show && remove){
		className += ' grid grid-cols-2'
	}

	return <div className={className}>
		{show && <p className='text-xs p-1 hover:bg-zinc-200 cursor-pointer' action='show'>
			<Play className='inline-block' />
		</p>}
		{remove && <p action='delete' className='text-xs border-s p-1 hover:bg-zinc-200 cursor-pointer '>
			<Trash className='inline-block' />
		</p>}
	</div>
}

export function MemorialResource({ id, resources, max, onUploaded, accept, type, title, showAdd=true, actionElement, actionClickHandler }){
	let [showDialog, setShowDialog] = useState(false),
	[loading, setLoading] = useState(false),
	ResourceComponent;

	return <>
		<div className='flex gap-2 items-center'>
			<h4 className='capitalize font-semibold'>{title}</h4>
			<p className={`text-base me-5 ${!max ? 'hidden':''}`}>{resources.length}/{max}</p>
			 { showAdd && <Button className='bg-black text-white' onClick={()=>{ setShowDialog(true)}}>Ajouter</Button> }
		</div>
		{ loading && <p>Chargment....</p>  }
		<div onClick={actionClickHandler} className='grid grid-cols-6 gap-2 mt-5 overflow-hidden'>
			{ !resources.length && <p>Aucune resource</p> }
			{ resources.map((resource, key)=>{
				let src_min = resource.src_min + '?memorial_id=' + id;

				return <div className='flex flex-col' index={key} type={type} key={key}>
					<div style={{height:'200px'}}>
						<img className='object-cover bg-black w-full h-full' key={resource.src_min} src={src_min} />
					</div>
					<p className='col-span-3 text-center text-sm bg-black text-white'>{resource.title}</p>
					{ actionElement && actionElement }
				</div>
			}) }
		</div>
		{ showDialog && <FileUploader memorial_id={id} field_name={type} type={type} accept={accept} onUploaded={onUploaded} onClose={()=> setShowDialog(false)} /> }
	</>
}