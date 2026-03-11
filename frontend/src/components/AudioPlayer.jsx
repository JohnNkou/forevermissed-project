import { useEffect, createRef, useState } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

export function AudioPlayer({ src, autoplay, onPlay, isPlaying, onStop, volume, loop=true, className='' }){
	let [ref] = useState(createRef()),
	[initialized, setInitialized] = useState(false);

	useEffect(()=>{
		if(autoplay){
			let audio = ref.current,
			currentTime = audio.currentTime,
			c = setInterval(()=>{
				if(currentTime == audio.currentTime){
					audio.play().then(()=>{
						setInitialized(true);
					}).catch((error)=>{
						console.log("Failed to start playback",error);
						console.log("Retrying");
					});
				}
				else{
					clearInterval(c);
				}
			},1000);

			return ()=>{
				clearInterval(c);
				audio.pause();
			}
		}
		else{
			setInitialized(true);
		}
	},[autoplay]);

	useEffect(()=>{
		ref.current.volume = volume;
	},[volume])

	useEffect(()=>{
		if(initialized){
			if(isPlaying){
				if(ref.current.paused){
					ref.current.play();
				}
			}
			else{
				if(!ref.current.paused){
					ref.current.pause();
				}
			}
		}
	},[isPlaying, initialized])

	return <audio onPause={onStop} onPlay={onPlay} className={className} ref={ref} src={src} loop={loop} />
}

export function AudioControl({ src, autoplay, loop=true, className='' }){
	let [isPlaying, setIsPlaying] = useState(false),
	[volume, setVolume] = useState(0.3);

	console.log('SRC',src);

	if(!src){
		return null;
	}

	function toggleAudio(){
		setIsPlaying(!isPlaying);
	}

	function onPlay(){
		setIsPlaying(true);
	}

	function onStop(){
		setIsPlaying(false)
	}

	return <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
        <button onClick={toggleAudio} className="hover:scale-110 transition-transform">
            {isPlaying ? <Pause className="w-5 h-5 text-purple-700" /> : <Play className="w-5 h-5 text-purple-700" />}
        </button>
        <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20"
        />
        <Volume2 className="w-4 h-4 text-gray-600" />
        <AudioPlayer onPlay={onPlay} isPlaying={isPlaying} onStop={onStop} volume={volume} autoplay={autoplay} src={src} loop className={className} />
    </div>
}