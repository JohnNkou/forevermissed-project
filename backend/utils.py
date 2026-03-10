from datetime import datetime
from pathlib import PurePath
import tempfile
import shutil
import os
import secrets
import constants

DOMAIN = os.environ['APP_DOMAIN']

if DOMAIN == 'missed.local':
    DOMAIN = os.environ['DOMAIN']

def get_expiration_date(date,range):
	throwed = False
	offset = 0
	while True:
		try:
			args = { 'year': date.year, 'month': date.month, 'day': date.day, 'hour': date.hour, 'minute': date.minute, 'second': date.second }

			if throwed:
				args['day'] = args['day'] - offset
				throwed = False

			if range == 'monthly':
				args['month'] = date.month + 1
			elif range == 'yearly':
				args['year'] = date.year + 1
			else:
				raise Exception("Unknown range %s" % (range))

			date = date.replace(**args)
		except ValueError as e:
			throwed = True
			offset += 1
			continue;

		return date


def handleUploadedFiles(files):
	res = []
	for file in files:
		suffix = PurePath(file.filename).suffix
		file.file.seek(0)

		with tempfile.NamedTemporaryFile(delete=False, dir="/home/backend/resources/", suffix=suffix) as tmp:
			shutil.copyfileobj(file.file,tmp.file)

		filename = "http://localhost:8000/api/resources/%s" % (PurePath(tmp.name).name)
		res.append(filename)

	return res

def hasFileSizesGreaterThan(files,size):
	for file in files:
		if file.size > size:
			return True

	return False

def generate_session_id():
	return secrets.token_hex(5)

def generate_otp():
	return secrets.token_hex(3)

def set_session_cookie(session_id,response):
	response.set_cookie(key=constants.SESSION_ID, value=session_id, secure=False, samesite="lax")