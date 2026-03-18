#!/bin/bash

function remove_unused_file(){
	path=`pwd`
	
	if [[ $path =~ tests/resources$ ]]; then
		find -E . ! -iregex ".*/resources/(p|bg|[1-4])(-[1-4](-min)?)?\.(jpg|mov)" -delete
	else
		echo "Remove_unused_file should only be called inside the resources directory"
	fi
		
}