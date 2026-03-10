import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom'
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useState, useContext, createRef } from 'react'
import { toast } from '../hooks/use-toast';
import axios from 'axios'

export default function Otp(){
	let number = new Array(6).fill(undefined),
	navigate = useNavigate(),
	[counter] = useState({ c:0, fill:{} }),
	[showButton, setShowButton] = useState(false),
	[otpValue, setOtpValue] = useState(),
	{ sendOTP, registerData } = useAuth(),
	ref = createRef();

	function handleKey(event){
		event.preventDefault();
		
		let target = event.target,
		value = target.value,
		key = Number(target.getAttribute('index'));

		if(event.key.toLowerCase() == 'backspace'){
			if(value){
				target.value = '';
				counter.c--;
			}
			else{
				if(key > 0){
					let prevNode = document.querySelector('.input-' + --key);

					if(prevNode){
						prevNode.focus();
					}
					else{
						console.error("coudln't find prevnode");
					}
				}
			}
		}
		else{
			if(event.key.length == 1){
				target.value = event.key;

				if(key < (number.length - 1)){
					let nextNode = document.querySelector('.input-' + ++key);

					if(nextNode){
						nextNode.focus();
					}
					else{
						console.error("Coudln't find nextNode");
					}
				}

				if(!value){
					console.log("__");
					counter.c++;
				}
				else{
					console.log(value);
				}
			}
		}

		console.log(counter,number.length);

		if(counter.c == number.length){
			setShowButton(true);
		}
		else{
			setShowButton(false);
		}
	}

	async function handleOtp(event){
		event.preventDefault();

		try{
			let parentNode = ref.current,
			otp = Array.prototype.reduce.call(parentNode.querySelectorAll('.otp-input'),function(x,node){
				console.log('NODE VALUE',node.value);
				console.log("X", x);
				return x + node.value;
			},""),
			response = await sendOTP(otp);

			toast({
				title:"Enregistrement effectué"
			});

			navigate("/");
		}
		catch(error){
			console.error(error);
			toast({
				title:'Error',
				description:"Une erreur est survenue lors de l'envoi de l'OTP",
				variant: "destructive"
			})
		}
	}

	return <div ref={ref}>
		<div onKeyDown={handleKey} className='grid grid-cols-6 gap-2 justify-items-end text-center'>
			{ number.map((_,index)=>{
				return <Input index={index} className={`text-center otp-input input-${index}`} key={index} />;
			}) }

		</div>
		<div className='flex justify-center mt-4'>
			{ showButton && <Button onClick={handleOtp}>Envoyer</Button>}
		</div>
	</div>
}