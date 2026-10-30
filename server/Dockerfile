# Build context: the repo root (the image also needs client/).
FROM node:24-slim AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client ./
RUN npm run build

FROM node:24-slim
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/*.ts ./
COPY --from=client /app/client/dist /app/client/dist

CMD ["node", "server.ts"]
