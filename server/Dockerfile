# Image for the server on Railway. The build context is the repo root, because the server
# also serves the built page from ../client/dist.
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
COPY server/server.ts ./
COPY --from=client /app/client/dist /app/client/dist

# Railway sets PORT and the variables from .env.example, so no .env here.
CMD ["node", "server.ts"]
