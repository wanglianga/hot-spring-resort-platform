FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=./data/hotspring.db

COPY package*.json ./
RUN npm ci --production

COPY . .

RUN mkdir -p ./data

EXPOSE 3001

CMD ["node", "server.js"]
