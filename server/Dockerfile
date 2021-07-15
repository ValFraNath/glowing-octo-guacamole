FROM node:14-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY . .

ENV PORT 5035

EXPOSE 5035

CMD ["node", "index.js"]
