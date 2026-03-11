import { Input } from './ui/input'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { createRef, useState, useEffect } from 'react';
import { Progress } from './ui/progress'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'
import { useAuth } from '../contexts/AuthContext'
import { resizeWidth } from '../utils/img'
import { memorialsApi } from '../utils/api'
import { MAX_MINIATURE_SIZE } from '../constant.js'
 
export function FileUploader({ onUploaded, onClose, type, accept, field_name, memorial_id }){
	let [files, setFiles] = useState([]),
	[uploading, setUploading] = useState(false),
	[fileUploaded, setFileUploaded] = useState(0),
	[displayResult, setDisplayResult] = useState(false),
	[hasNewFile, setHasNewFile] = useState(),
	[errors, setErrors] = useState(),
	[id, setId] = useState(0),
	[ref] = useState(createRef());

	function addFile(event){
		let target = event.target,
		_files = target.files,
		d = [];

		for(let i=0; i < _files.length; i++){
			let file = _files[i];
			if(files.find((f)=> f.name == file.name)){
				continue;
			}

			file.title = '';
			file.key = id;

			d.push(file);
			setHasNewFile(true);
		}

		setId((id)=> id + 1);
		setFiles(files.concat(d));

		ref.current.reset();
	}

	function uploadSuccess(file){
		setFileUploaded((n)=> {
			let new_n = n + 1;

			console.log('NEW FILE',new_n);
			console.log("FILE LENGTH", files.length);

			if(new_n >= files.length){
				setDisplayResult(true);
				setUploading(false);
				onUploaded();
			}

			if(file){
				console.log("With file", file);
				setFiles((files)=> files.filter((f)=> f != file));
			}

			return new_n;
		});
	}

	function resetState(){
		setDisplayResult(false);
		setFileUploaded(0);
		setErrors(null);
	}

	function uploadError(error){
		setErrors((n)=>{
			if(!n){
				n = [];
			}
			n.push(error);

			return n;
		})
		uploadSuccess();
	}

	function handleDeleting(event){
		let target = event.target,
		index = target.getAttribute('index'),
		action = target.getAttribute('action');

		if(action == 'delete'){
			event.preventDefault();
			if(index){
				files.splice(index,1);

				setFiles([...files]);
			}
			else{
				console.log("no index given",index);
			}
		}
	}

	function setTitle(title){
		let file = files.slice(-1)[0];

		file.title = title;

		setFiles([...files]);
		setHasNewFile(false);
	}

	function onSubmit(event){
		event.preventDefault();

		resetState();
		setUploading(true);
	}

	return <Dialog defaultOpen={true} onOpenChange={onClose}>
		<DialogContent>
			<DialogTitle>Uploading des fichiers</DialogTitle>
			<form ref={ref} className={(uploading)? 'hidden':''} onSubmit={onSubmit}>
				<div onClick={handleDeleting} className='flex flex-col gap-3'>
					<p><Input className={(!hasNewFile)? '':'invisible'} accept={accept} onChange={addFile} ref={ref} type='file' /></p>
					<div className='p-3 grid grid-cols-4  gap-2'>
						{ files.map((file,index)=>{
							return <FileViewer key={file.key} file={file} index={index} type={type} />
						}) }
					</div>
					<TitleInput view={hasNewFile} onTitle={setTitle} />
					<div className='text-center'>
						<Button type='button' onClick={onClose}>Fermer</Button> <Button className={files.length && !hasNewFile ? '':'hidden'} type='submit'>Envoyer</Button>
					</div>

					{ displayResult && errors && (errors.length ? <p>Des erreurs se sont manifesté</p> : <p>Fichiers envoyés avec success</p>) }
				</div>
			</form>
			<div className='flex flex-col gap-2'>
				{ uploading && files.map((file, index)=> {
					return <Uploader memorial_id={memorial_id} key={file.key} type={type} file={file} field_name={field_name} onSuccess={uploadSuccess} onError={uploadError} />
				}) }
			</div>
		</DialogContent>
	</Dialog>
}

function TitleInput({ view, onTitle }){
	let [showButton, setShowButton] = useState(false),
	[ref] = useState(createRef());

	function onInput(event){
		let target = event.target;

		if(target.value){
			setShowButton(true);
		}
		else{
			setShowButton(false);
		}
	}

	function setTitle(){
		onTitle(ref.current.value);
	}

	return <div className={(view)? 'flex flex-col gap-2':'invisible'}>
		<p>
			<Label>Titre du fichier</Label>
			<Input ref={ref} onInput={onInput} />
		</p>
		<Button className={showButton ? '':'invisible'} type='button' onClick={setTitle}>ajouter</Button>
	</div>
}

function FileViewer({type, file, index}){
	let [url, setUrl] = useState( type == 'picture' && URL.createObjectURL(file) || ''),
	ComponentViewer = ()=> null;

	if(type == 'picture'){
		ComponentViewer = (props)=> <img {...props} /> 
	}

	return <div key={index + file.title} className='border rounded p-1 flex flex-col gap-2'>
		<ComponentViewer style={{maxWidth:'100px'}} src={url} />
		<p className='flex text-xs overflow-hidden'><span>{file.title.slice(0,40)}..</span><span>{file.size}</span></p>
		<a action='delete' className='text-sm font-semibold mt-auto' index={index} href="#">supprimer</a>
	</div>
}

function Uploader({file, onError, field_name, memorial_id,  onSuccess, type}){
	let [percent, setPercent] = useState(0),
	[choseIcon, setChoseIcon] = useState(false),
	[iconFile, setIconFile] = useState(),
	[error, setError] = useState(),
	{ token } = useAuth();

	function onProgress(event){
		let total = event.total,
		loaded = event.loaded,
		percent = Math.floor((loaded / total) * 100);

		console.log(file.name, "Percent is",percent);

		setPercent(percent);
	}

	useEffect(()=>{
		let data = new FormData(),
		p = Promise.resolve(),
		controller = new AbortController(),
		method;

		if(type == 'video'){
			method = memorialsApi.addVideo
		}
		else if(type == 'picture'){
			method = memorialsApi.addPicture
		}
		else{
			throw Error("Unknown type: "+type);
		}

		setChoseIcon((x)=> false);
		setError(null);

		data.append(field_name, file, file.name);
		data.append('title', file.title);

		if(!iconFile){
			p = resizeWidth(file,400, MAX_MINIATURE_SIZE, type == 'video').
			then((blob)=>{
				data.append('picture_mini', blob);
			});
		}
		else{
			data.append('picture_mini', iconFile);
		}

		p.then(()=>{
			if(controller.signal.aborted){
				console.log("OPERATION ABORTED", file);
				return;
			}

			method(memorial_id, data, { onProgress, signal: controller.signal }).then((response)=>{
				if(response.status == 201){
					console.log("Successfully sent file", file.name);
					onSuccess(file);
				}
				else{
					console.warn("Non 201 status code received", response.status);
					console.log(response.data);
					onError(new Error("Returned a non 201 status"));
				}
			}).catch((error)=>{
				console.error("Error",error);
				onError(error);
				setError(error);
			}).finally(()=>{
				controller = null;
			});
		}).catch((error)=>{
			console.error("Une erreur est survenue",error);
			if(error.code == MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED){
				if(choseIcon){
					setChoseIcon((x)=> false);
				}

				setChoseIcon((x)=> true);
				setError(error);

				return;
			}
			onError(error);
		});

		return ()=>{
			if(controller && !controller.signal.aborted){
				console.log("Aborting request");
				controller.abort();
			}
		}

	},[iconFile])

	return <div className='flex gap-2 flex-col'>
		<div className='flex gap-2'>
			<span className='text-xs'>{file.title}</span>
			<Progress className='self-center' value={percent} />
			<div className={`text-destructive text-xs ${!error ? 'invisible':''}`}>Echec</div>
		</div>
		<div className={choseIcon? 'grid grid-cols-5 gap-2 border-b pb-2':'hidden'}>
			<Label className='col-span-3 self-center'>Choisir une icone pour la video</Label>
			<Input accept='.jpeg,.jpg,.png' className='overflow-hidden' onChange={(event)=> setIconFile(event.target.files[0])} type='file' />
			<Button type='button' onClick={(event)=> onError(error)}>fermer</Button>
		</div>
	</div>
}