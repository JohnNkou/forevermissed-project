import { main_style } from '../main_css.js'

export function suspensionToString(){
	return `<!DOCTYPE html>
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
	        }
	        .box div{
	            display:inline-block;
	            vertical-align:top;
	            max-width: 90%;
	        }
	        .box{
	            margin-bottom:1em;
	        }
	        .box p{
	            margin:0;
	        }
	        .little-text{
	            font-size:0.7em;
	        }
	    </style>
	</head>
	<body>
	    <div id='header'>
	        <h2>Action requise : votre abonnement est suspendu</h2>
	    </div>
	    <div id='main'>
	        <div>
	            <p>Suite à un défaut de paiement, votre abonnement est suspendu et vos mémoriaux sont masqués. Vos données restent en sécurité. Merci de mettre à jour vos informations de paiement pour rétablir l'accès public.</p>
	        </div>
	        <section>
	            <h4 class='text-primary'>Procédure de réactivation</h4>
	            <div class='box'>
	                <div>
	                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-credit-card-icon lucide-credit-card text-primary"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
	                </div>
	                <div>
	                    <p>Mettre à jour le mode de paiement</p>
	                    <p class='subtle little-text'>Ajoutez une carte de crédit valide dans les paramètres de votre compte</p>
	                </div>
	            </div>
	            <div class='box'>
	                <div>
	                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wallet-cards-icon lucide-wallet-cards text-primary"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2"/><path d="M3 11h3c.8 0 1.6.3 2.1.9l1.1.9c1.6 1.6 4.1 1.6 5.7 0l1.1-.9c.5-.5 1.3-.9 2.1-.9H21"/></svg>
	                </div>
	                <div>
	                    <p>Payer le solde</p>
	                    <p class='subtle little-text'>Finaliser le paiement en attente</p>
	                </div>
	            </div>
	            <div class="box">
	                <div>
	                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wallet-cards-icon lucide-wallet-cards text-primary"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2"/><path d="M3 11h3c.8 0 1.6.3 2.1.9l1.1.9c1.6 1.6 4.1 1.6 5.7 0l1.1-.9c.5-.5 1.3-.9 2.1-.9H21"/></svg>
	                </div>
	                <div>
	                    <p>L'abonnement est rétablie et les mémoriaux sont automatiquement réactivé.</p>
	                    <p class='subtle little-text'>Votre page sera de nouveau en ligne instantanément.</p>
	                </div>
	            </div>
	        </section>
	    </div>
	</body>
	</html>`
}