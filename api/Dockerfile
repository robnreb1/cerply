# syntax=docker/dockerfile:1

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
RUN npm run build

# 3) Slim runtime with only prod deps
FROM node:20-bullseye-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
ENV CI=true
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist

EXPOSE 8080
CMD ["node", "dist/index.js"]