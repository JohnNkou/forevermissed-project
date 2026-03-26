import { Button } from './ui/button'

export function Navigation({ current, total, limit, onNavigation }){
	let next = current + limit,
	prev = current - limit;

	console.log(`current=${current}, total=${total}, limit=${limit}`);

	function handleNavigation(event){
		event.preventDefault();

		let target = event.target,
		index = target.getAttribute('index');

		if(index !== null && index !== undefined){
			onNavigation(Number(index));
		}
		else{
			console.log("Received navigation click without index",index);
		}
	}

	return <div onClick={handleNavigation} className='flex justify-center gap-3'>
		<Button style={{width:'100px'}} index={prev} className={current == 0 ? 'invisible':''}>Precedent</Button>
		<Button style={{width:'100px'}} index={next} className={next <= total ? '':'invisible'}>Suivant</Button>
	</div>
}