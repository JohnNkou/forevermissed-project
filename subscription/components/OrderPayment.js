import { main_style } from '../main_css.js'

export function orderPaymentToString({ price, currency, type, dueDate, missing }){
	let title = missing ? 'Avis concernant votre abonnement': 'Confirmation de renouvellement de votre abonnement',
	message = missing ? "Nous n'avons pas pu traiter votre dernier paiement pour Eternal Memories. Cela est souvent dû à une carte expirée ou à des fonds insuffisants sur votre compte.":"Votre paiement a bien été reçu. Vous pouvez continuer à préserver et à partager vos précieux souvenirs sans interruption.";

	return `
		<!DOCTYPE html>
		<html>
		<head>
		    <meta charset="utf-8">
		    <meta name="viewport" content="width=device-width, initial-scale=1">
		    <title></title>
		    <style>
				${main_style}
		        #main{
		            padding:2em;
		        }
		        section{
		            padding:0.5em;
		            border:1px solid silver;
		            border-radius: 20px 20px 20px 20px;
		        }
		        section span{
		            padding:0.3em 0em;
		            display:inline-block;
		        }
		        section p{
		            border-bottom: 1px solid #e8e8e8;
		        }
		        section p:nth-child(3){
		            border:none;
		        }
		        .h8{
		            width:80%;
		        }
		        .h2{
		            width:20%;
		        }
		    </style>
		</head>
		<body>
		    <div id='header'>
		        <h2>${title}</h2>
		    </div>
		    <div id='main'>
		        <div>
		            <p>${message}</p>
		        </div>
		        <section>
		            <p>
		                <span class="h8 subtle capitalize">Plan</span><span class='h2'>${type}</span>
		            </p>
		            <p>
		                <span class="h8 subtle">Prix</span><span class='h2 text-primary'>${price}${currency}</span>
		            </p>
		            <p>
		                <span class="h8 subtle">Periode</span><span>${dueDate}</span>
		            </p>
		        </section>
		    </div>
		</body>
		</html>
	`
}