import { Card, CardContent } from '../components/ui/card';

export default function TributeCard({ tribute }){
	return <Card className="border-0 shadow-none">
	<CardContent className="p-3">
		<div className="flex items-start gap-4 items-start">
			<div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
				<span className="text-white text-xl font-semibold">
				{tribute.author_name.charAt(0).toUpperCase()}
				</span>
			</div>
			<div className="flex-1">
				<div className="flex items-center justify-between mb-3">
					<div className='flex w-full items-center'>
						<h4 className="font-bold text-purple-900 leading-8">{tribute.author_name}</h4>
						<p className="text-sm text-gray-600 ms-auto">{new Date(tribute.date_created).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
					</div>
				</div>
				<div className="prose ms-2 max-w-none bg-grey-900 py-2 px-6 rounded-xl border-t border-grey-100 shadow">
					<p className="leading-relaxed whitespace-pre-line">
					{tribute.text}
					</p>
				</div>
			</div>
		</div>
	</CardContent>
</Card>
}