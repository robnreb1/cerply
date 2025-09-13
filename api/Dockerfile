# syntax=docker/dockerfile:1

# 1) Install ALL deps (incl dev) for building
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# include dev deps explicitly so tsup et al are present even if NODE_ENV is set
RUN npm ci --include=dev

# 2) Build with the dev toolchain
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# 3) Slim runtime with only prod deps
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

EXPOSE 10000
CMD ["node", "dist/index.js"]