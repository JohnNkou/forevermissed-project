import { createContext, useState, useContext } from 'react'
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from '../components/ui/alert-dialog'
import { Button } from '../components/ui/button'
import { ArrowBigRight, ArrowBigLeft } from 'lucide-react'

export const ResourceViewerContext = createContext();

export function ResourceViewerProvider({children}){
	let [resources, setResources] = useState(),
	[index, setIndex] = useState(),
	[type, setType] = useState(),
	[src, setSrc] = useState(),
	[id, setId] = useState(),
	ViewComponent = (type)? (type == 'picture')? (props)=> <img {...props} /> : (props)=> <video autoplay {...props} controls /> : ()=> null;

	function startViewing({ resources, index, type, id }){
		setResources(resources);
		setIndex(Number(index));
		setType(type);
		setSrc(resources[index].src + `?memorial_id=${id}`);
		setId(id);
	}

	function reset(){
		setType();
		setResources();
		setIndex();
		setSrc();
		setId();
	}

	function navigate(event){
		event.preventDefault();

		let target = event.target,
		index;

		for(let i=0; i < 10 && target && target.getAttribute ; i++){
			index = target.getAttribute('index');
			
			if(index){
				break;
			}
			else{
				target = target.parentNode;
			}
		}

		if(index != undefined || index != null){
			setIndex(Number(index));
			setSrc(()=> resources[index].src + `?memorial_id=${id}`);
		}
	}

	return <ResourceViewerContext.Provider value={{ startViewing }}>
		<div className={`fixed flex flex-col w-full h-full z-50 bg-black ${(resources)? '':'hidden'}`}>
			<div onClick={navigate} className='grid grid-cols-5 h-full items-center'>
				<span index={index - 1} className={`cursor-pointer text-white text-center font-bold ${(index > 0)? '':'invisible'}`}><ArrowBigLeft width='100%' className='text-white' size='50' /></span>
				<div className='col-span-3 bg-slate-900 h-full overflow-hidden text-center'>
					<ViewComponent className='h-full inline-block' src={src} />
				</div>
				<span index={index + 1} className={`cursor-pointer text-center text-white font-bold ${(resources && index < (resources.length - 1)) ? '':'invisible'}`}><ArrowBigRight width='100%' size='50' className='text-white' /></span>
				<div className='text-center col-span-5 bottom-0 text-center w-full p-2'>
					<Button onClick={reset}>Fermer</Button>
			</div>
			</div>
		</div>
		{children}
	</ResourceViewerContext.Provider>
}

export function useViewer(){
	let context = useContext(ResourceViewerContext);

	if(!context){
		throw Error("userViewer should only be called inside a ResourceViewerContext Provider");
	}

	return context;
}