import { main_style } from '../main_css.js'

export function otpToString(code){
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
		            text-align:center;
		            padding:1em;
		        }
		        section span{
		            font-size:2em;
		            border:1px solid black;
		            padding:1rem;
		            border-radius: 30px 30px 30px 30px;
		            font-weight: 600;
		        }
		        section p{
		            margin-top:2em;
		        }
		    </style>
		</head>
		<body>
		    <div id='header'>
		        <h2>Memoir Eternelle</h2>
		        <p>Préserver l'héritage de ceux que nous aimons.</p>
		    </div>
		    <div id='main'>
		        <h4>Contrôle de sécurité</h4>

		        <div>
		            <p>Pour garantir la sécurité de votre compte mémorial et de vos souvenirs partagés, nous devons vérifier votre identité. Veuillez utiliser le code de vérification ci-dessous pour finaliser votre connexion.</p>
		        </div>
		        <section>
		            <span class='text-primary border-primary'>${code}</span>
		            <p>Ce code expirera dans 5 minutes</p>
		        </section>
		    </div>
		</body>
		</html>
	`
}