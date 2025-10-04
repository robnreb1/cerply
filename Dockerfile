# syntax=docker/dockerfile:1.7

# 1) Install only root + api workspaces deterministically
FROM node:20-alpine AS deps
WORKDIR /app
# Install libc6-compat for Prisma query engine
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
COPY api/package.json api/package.json
# Install just what's needed to build API (skip web)
# Copy Prisma schema first so it's available during npm ci
COPY api/prisma ./api/prisma
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
# Use Debian Bullseye for OpenSSL 1.1 compatibility with Prisma
FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Install OpenSSL 1.1 for Prisma query engine compatibility
RUN apt-get update && apt-get install -y --no-install-recommends libssl1.1 libssl-dev && rm -rf /var/lib/apt/lists/*
# Debug: List OpenSSL libraries
RUN find /usr/lib -name "*ssl*" -type f | head -10
# Create symlink for libssl.so.1.1 in case Prisma looks in /lib
RUN ln -sf /usr/lib/x86_64-linux-gnu/libssl.so.1.1 /lib/x86_64-linux-gnu/libssl.so.1.1 || echo "Symlink creation failed or already exists"

# --- image metadata (populated by CI build-args) ---
ARG IMAGE_TAG=dev
ARG GIT_SHA=local
ARG IMAGE_CREATED=unknown
# Debug: print build args
RUN echo "Build args received: IMAGE_TAG=${IMAGE_TAG}, GIT_SHA=${GIT_SHA}, IMAGE_CREATED=${IMAGE_CREATED}"
ENV IMAGE_TAG="${IMAGE_TAG}" \
    IMAGE_REVISION="${GIT_SHA}" \
    IMAGE_CREATED="${IMAGE_CREATED}"
# Debug: print environment variables after setting
RUN echo "Environment variables set: IMAGE_TAG=${IMAGE_TAG}, IMAGE_REVISION=${IMAGE_REVISION}, IMAGE_CREATED=${IMAGE_CREATED}"
# ---------------------------------------------------

# App code
COPY --from=builder /app/api/dist ./api/dist
COPY api/package.json ./api/package.json

# Production node_modules only
# (Reinstall in a clean layer to avoid dev deps)
COPY package.json package-lock.json ./
COPY api/package.json api/package.json
# Copy Prisma schema for production dependencies
COPY api/prisma ./api/prisma
# Install production dependencies and generate Prisma client for Debian/glibc
RUN npm ci --omit=dev --include-workspace-root -w api
# Regenerate Prisma client for Debian runtime (ensures correct query engine)
RUN npx prisma generate --schema=./api/prisma/schema.prisma
# Debug: List available query engines
RUN ls -la /app/node_modules/.prisma/client/ | grep -E "(query_engine|libquery)" || echo "No query engines found"

EXPOSE 8080

# Healthcheck without adding curl/wget
HEALTHCHECK --interval=30s --timeout=5s \
  CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "api/dist/index.js"]