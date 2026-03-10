FROM node:alpine3.20

WORKDIR /home/subscription

COPY index.js .
COPY package.json .
COPY utils.js .

RUN npm install

ENTRYPOINT node --watch index.js