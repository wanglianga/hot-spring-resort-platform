FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN cd backend && npm ci --production=false
RUN cd frontend && npm ci --production=false

COPY backend ./backend
COPY frontend ./frontend

RUN cd frontend && npm run build

FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=./data/hotspring.db

COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/build ./frontend/build

RUN cd backend && npm ci --production

EXPOSE 3001

WORKDIR /app/backend

CMD ["node", "server.js"]
