# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS deps
WORKDIR /app

# 1) Copy root manifests FIRST (for deterministic cache + npm ci)
COPY package.json package-lock.json ./

# 2) Copy workspace manifests to improve layer cache
COPY api/package.json api/package.json
COPY web/package.json web/package.json

# 3) Install ALL workspaces with the lockfile
RUN npm ci --workspaces --include-workspace-root

# 4) Builder: bring in sources and build API
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm -w api run build

# 5) Runtime: only what we need to run the API
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# app code
COPY --from=builder /app/api/dist ./api/dist
COPY api/package.json ./api/package.json
# production deps (root + api workspace)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/api/node_modules ./api/node_modules
EXPOSE 8080
CMD ["node", "api/dist/index.js"]