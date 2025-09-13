# --- deps stage: install deps incl. dev for build ---
    FROM node:20-alpine AS deps
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci
    
    # --- build stage: build TypeScript to dist/ ---
    FROM deps AS build
    WORKDIR /app
    COPY tsconfig.json ./
    COPY src ./src
    RUN npm run build
    
    # --- prod runtime: copy built app + production deps ---
    FROM node:20-alpine AS runtime
    WORKDIR /app
    ENV NODE_ENV=production
    # copy node_modules from deps (already resolved via npm ci)
    COPY --from=deps /app/node_modules ./node_modules
    # copy built JS
    COPY --from=build /app/dist ./dist
    # if you have any runtime-only assets (emails/templates/etc), copy them here:
    # COPY assets ./assets
    
    # Fastify on Render listens on $PORT; default in code is often 10000.
    ENV PORT=10000
    EXPOSE 10000
    
    CMD ["node", "dist/index.js"]