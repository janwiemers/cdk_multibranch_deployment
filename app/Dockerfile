FROM node:19-alpine

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install

EXPOSE 80

CMD [ "node", "index.js" ]