# syntax=docker/dockerfile:1

# Global image metadata (populated via build args)
ARG IMAGE_TAG=unset
ARG GIT_SHA=unset
ARG IMAGE_CREATED=unset

# 1) Install ALL deps (incl dev) for building
FROM node:20-bullseye-slim AS deps
WORKDIR /app
COPY package*.json ./
# include dev deps explicitly so tsup et al are present even if NODE_ENV is set
ENV CI=true
RUN npm ci --include=dev --no-audit --no-fund

# 2) Build with the dev toolchain
FROM node:20-bullseye-slim AS build
WORKDIR /app
# Install deps in the build stage to ensure scripts and bins are present
COPY package*.json ./
ENV CI=true
RUN npm ci --include=dev --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
# Rollup native binary may be unavailable in minimal containers; force JS fallback
ENV ROLLUP_SKIP_NODEJS_NATIVE=true
RUN npm run build

# 3) Slim runtime with only prod deps
FROM node:20-bullseye-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
ENV CI=true
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist

# Re-declare build args in final stage and expose as envs & labels
ARG IMAGE_TAG=""
ARG GIT_SHA=""
ARG IMAGE_CREATED=""
ENV IMAGE_TAG="${IMAGE_TAG}" \
    IMAGE_REVISION="${GIT_SHA}" \
    IMAGE_CREATED="${IMAGE_CREATED}"
LABEL org.opencontainers.image.version="${IMAGE_TAG}" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.created="${IMAGE_CREATED}"

EXPOSE 8080
CMD ["node", "dist/index.js"]