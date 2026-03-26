import { Card, CardContent } from '../components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function MemorialCard({memorial}){
	const navigate = useNavigate();
	
	return <Card
        className="cursor-pointer hover:shadow-lg transition-shadow duration-300"
        onClick={() => navigate(`/memorial/${memorial._id}`)}>
		<CardContent className="p-0">
			<div className="aspect-square bg-gray-200 rounded-t-lg overflow-hidden">
				<img src={memorial.image + '?memorial_id='+memorial._id} alt={memorial.name}
	className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"/>
			</div>
			<div className="p-4">
				<h3 className="font-semibold text-gray-900 text-sm mb-1 leading-7">
					{memorial.name}</h3>
				<p className="text-xs text-gray-600">
					{memorial.birth_date && new Date(memorial.birth_date).getFullYear()} - {memorial.death_date && new Date(memorial.death_date).getFullYear()}
				</p>
				{(memorial.birth_place || memorial.death_place) && (
					<p className="text-xs text-gray-500 mt-1">{memorial.death_place || memorial.birth_place}</p>
				)}
				<div className="mt-3 grid grid-cols-3 items-center justify-between text-xs text-gray-500">
					<span>{memorial.tributes_count || 0} hommages</span>
	                <span className='justify-self-center'>{memorial.gallery || 0} photos</span>
	                <span className='justify-self-end'>{memorial.videos || 0} videos</span>
                 </div>
			</div>
		</CardContent>
	</Card>
}