FROM python:3.14.2

WORKDIR /home/backend

COPY routes routes
COPY auth.py .
COPY models.py .
COPY requirements.txt .
COPY server.py .

RUN pip install -r requirements.txt && pip install --force-reinstall "fastapi[standard]"

ENTRYPOINT fastapi dev server.py --host 0.0.0.0