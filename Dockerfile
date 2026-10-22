# Build stage: download dependencies once, build the frontend, then drop dev dependencies
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Tuned for slow connections (e.g. a Raspberry Pi on Wi-Fi at ~60 KB/s): fewer parallel downloads so each
# package gets enough bandwidth, a 20-minute per-request timeout instead of npm's 5 minutes, and a cache
# mount that keeps already downloaded packages between attempts.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --maxsockets=3 --fetch-timeout=1200000 \
      --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000
COPY . .
RUN npm run build && npm prune --omit=dev

# Production stage: reuses the pruned node_modules, so nothing is downloaded twice
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/services ./services
# Collection.dek is optional: pairing the glob with package.json keeps COPY from failing when it is absent
COPY --from=builder /app/package.json /app/Collection.de[k] ./

EXPOSE 3001
CMD ["node", "server.js"]
