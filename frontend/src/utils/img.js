import { MAX_MINIATURE_SIZE } from '../constant.js'

function toBlob(canvas,type,quality){
	if(quality == undefined){
		throw Error("No quality given");
	}

	let source = canvas.source,
	isVideo = source.tagName.toLowerCase() == 'video' && quality == 1;

	console.log('toBlob with quality', quality);

	return new Promise((resolve,reject)=>{
		let action;
		canvas.toBlob((blob)=>{
			if(blob.size > MAX_MINIATURE_SIZE && quality > 0){
				return toBlob(canvas, type, Number((quality - 0.1).toFixed(1))).then(resolve);
			}

			if(quality == 0){
				console.log("Even with quality 0.1 the file size coudln't be less than the one required");
			}

			resolve(blob);

		},type, quality)
	})
}

export function resizeWidth(file, width, video=false){
	window.file = file;
	return new Promise((resolve,reject)=>{
		let source,
		canvas = document.createElement('canvas'),
		context = canvas.getContext('2d');

		if(!video){
			source = new Image();
			source.src = URL.createObjectURL(file);
			source.onload = onLoad;
		}
		else{
			source = document.createElement('video');
			source.src = URL.createObjectURL(file);

			source.onloadeddata = ()=>{
				console.log("Changing currentTime");
				source.currentTime = 30.0;
				source.onseeked = ()=> {
					console.log("Current time changed");
					console.log('VIDEO DIMENSION', source.videoWidth, source.videoHeight);
					console.log("Video currentTime", source.currentTime);
					source.onseeked = null;
					onLoad();
				};

				source.onloadedmetadata = null;
			}
		}

		function onLoad(){
			let sourceWidth = source.naturalWidth || source.videoWidth,
			sourceHeight = source.naturalHeight || source.videoHeight,
			ratio = sourceWidth / sourceHeight,
			height = Math.round(width / ratio);

			console.log("sourceWidth", sourceWidth);
			console.log("sourceHeight", sourceHeight);
			console.log("width", width);
			console.log("height", height);

			canvas.width = width;
			canvas.height = height;
			canvas.source = source;

			context.drawImage(source, 0,0, width, height);

			toBlob(canvas,'image/jpeg',1).then(resolve).catch(reject);
		}

		source.onerror = (error)=>{
			if(source.error){
				error = source.error;
			}
			console.error("Failed to resize file",file);
			reject(error);
		}
	})
}