const primary = 'rgb(255,29,72)';

export const main_style = `
	html,body{
		margin:0;
        padding:0;
        font-size:1.1em;
        box-sizing:border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen",
            "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue",
            sans-serif;
    }
    #header{
        padding:1em;
        text-align: center;
        background-color: #E91E63;
		color:white;
    }
    #header p{
        font-size:0.8em;
		color:#e7e6e6;
    }
    .subtle{
        color:#808080;
    }
    .text-primary{
        color: ${primary}
	}
	.border-primary{
		border-color: ${primary}
	}
	.capitalize{
		text-transform: capitalize;
	}
`