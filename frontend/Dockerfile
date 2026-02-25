FROM node:20-slim

WORKDIR /app

COPY package*.json ./

COPY . .

CMD ["sh", "-c", "npm install && npm run dev"]
