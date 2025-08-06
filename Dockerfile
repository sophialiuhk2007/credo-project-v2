# Use official Node.js image
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY certs ./certs

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]