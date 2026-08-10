FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

RUN apk add --no-cache curl

EXPOSE 3001

CMD ["npm", "run", "start"]