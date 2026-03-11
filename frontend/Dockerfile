FROM node:alpine3.20

WORKDIR /home/frontend

ARG REACT_APP_BACKEND_URL

COPY plugins plugins
COPY public public
COPY src src
COPY components.json .
COPY craco.config.js .
COPY jsconfig.json .
COPY package.json package.json
COPY postcss.config.js postcss.config.js
COPY tailwind.config.js tailwind.config.js

RUN yarn install && yarn run build && yarn global add serve

ENTRYPOINT serve -s build