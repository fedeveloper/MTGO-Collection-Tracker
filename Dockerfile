# Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/services ./services
# Collection.dek is optional: pairing the glob with package.json keeps COPY from failing when it is absent
COPY --from=builder /app/package.json /app/Collection.de[k] ./

EXPOSE 3001
CMD ["node", "server.js"]
