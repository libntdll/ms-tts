FROM node:slim AS builder

WORKDIR /app

COPY ./package*.json ./
RUN npm install
COPY ./ ./
RUN npm run build

FROM node:slim AS production

WORKDIR /app

COPY ./package*.json ./
RUN npm install --production

COPY ./public ./public
COPY --from=builder /app/dist ./dist
ENV PORT=3000

EXPOSE 3000

CMD [ "node", "./dist/app.js" ]
