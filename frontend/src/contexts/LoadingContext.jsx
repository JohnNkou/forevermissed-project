import { createContext, useContext, useState } from 'react'
import { Loader } from 'lucide-react'

export const LoadingContext = createContext();

export function LoadingProvider({children}){
	let [message, setMessage] = useState('');

	return <LoadingContext.Provider value={{ showMessage: setMessage }}>
		<div className={`fixed z-50 w-full h-full flex justify-center items-center ${message ? '':'hidden'}`}>
			<div className='w-full h-full absolute bg-zinc-900 opacity-90 '></div>
			<div className='flex flex-col gap-2 relative text-white'>
				<p className='text-center'><Loader size='100' className='animate-spin text-white inline-block' /></p>
				<p className=''>{message}</p>
			</div>
		</div>
		{children}
	</LoadingContext.Provider>
}

export function useLoading(){
	let context = useContext(LoadingContext);

	if(!context){
		throw Error("No LoadingContextProvider found");
	}

	return context;
}