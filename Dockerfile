# Multi-stage Dockerfile for API + Web monorepo (build API only)

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/package.json
COPY web/package.json web/package.json
RUN npm ci
COPY . .
RUN npm -w api run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/api/package.json /app/api/package.json
COPY --from=builder /app/api/dist /app/api/dist
RUN npm ci --omit=dev --workspaces=false
EXPOSE 8080
CMD ["node","api/dist/index.js"]


