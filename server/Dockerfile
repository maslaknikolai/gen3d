# Image for the server on Railway. The build context is the repo root, because the server
# also serves ../client.
FROM node:24-slim

WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/server.ts ./
COPY client /app/client

# Railway sets PORT, RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID as env vars, so no .env here.
CMD ["node", "server.ts"]
