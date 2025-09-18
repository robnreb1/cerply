# syntax=docker/dockerfile:1.7

# 1) Install only root + api workspaces deterministically
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY api/package.json api/package.json
# Install just what's needed to build API (skip web)
RUN npm ci --include-workspace-root -w api

# 2) Build API
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/api/node_modules ./api/node_modules
COPY --from=deps /app/package.json ./package.json
# Copy only API sources (faster, cleaner)
COPY api ./api
ENV PATH="/app/api/node_modules/.bin:/app/node_modules/.bin:${PATH}"
RUN npm -w api run build

# 3) Runtime: minimal, with image metadata for /api/version + x-image-* headers
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# --- image metadata (populated by CI build-args) ---
ARG IMAGE_TAG=dev
ARG GIT_SHA=local
ARG IMAGE_CREATED=unknown
ENV IMAGE_TAG="${IMAGE_TAG}" \
    IMAGE_REVISION="${GIT_SHA}" \
    IMAGE_CREATED="${IMAGE_CREATED}"
# ---------------------------------------------------

# App code
COPY --from=builder /app/api/dist ./api/dist
COPY api/package.json ./api/package.json

# Production node_modules only
# (Reinstall in a clean layer to avoid dev deps)
COPY package.json package-lock.json ./
COPY api/package.json api/package.json
RUN npm ci --omit=dev --include-workspace-root -w api

EXPOSE 8080

# Healthcheck without adding curl/wget
HEALTHCHECK --interval=30s --timeout=5s \
  CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "api/dist/index.js"]