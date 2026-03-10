import { main_style } from '../main_css.js'

export function orderMail({ type, amount, currency }){
	return `<html>
	<head>
	    <meta charset="utf-8" />
	    <meta name="viewport" content="width=device-width, initial-scale=1" />
	    <title></title>
	    <style>
	    	${main_style}
	        #main{
	            padding:2em;
	        }
	        span{
	            display:inline-block;
	        }
	        .h8, .h2{
	            padding:0.5em 0em;
	        }
	        .h8{
	            width:80%;
	        }
	        .h2{
	            width:20%;
	        }
			.capitalize{
				text-transform:capitalize;
			}
	    </style>
	</head>
	<body>
	    <div id='header'>
	        <h2>Merci</h2>
	        <p class='subtle'>Votre abonnement a été confirmé.</p>
	        <p class='subtle'>C’est un honneur pour nous de vous accompagner dans la préservation de ces précieux souvenirs, en toute dignité</p>
	    </div>
	    <div id='main'>
	        <h3 class='text-primary'>Récapitulatif de la commande</h3>
	        <div>
	            <div>
	                <span class='h8 subtle'>Plan</span><span class='h2 capitalize'>${type}</span>
	            </div>
	            <div>
	                <span class='h8 subtle'>Montant payé</span><span class='h2'>${amount}${currency}</span>
	            </div>
	        </div>
	    </div>
	</body>
	</html>`
}