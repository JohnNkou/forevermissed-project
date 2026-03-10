FROM mongo:noble

WORKDIR /home/ubuntu

COPY keyfile .

RUN chown -R mongodb . && chmod 400 keyfile