# ---------- Builder: install all deps & build API ----------
    FROM node:20-alpine AS builder
    WORKDIR /app
    
    # only what’s needed to resolve workspace installs
    COPY package.json package-lock.json ./
    COPY api/package.json api/package.json
    COPY web/package.json web/package.json
    
    # install all deps for the monorepo
    RUN npm ci
    
    # bring in sources and build API
    COPY . .
    RUN npm -w api run build
    
    # ---------- Runner: slim prod image with only API ----------
    FROM node:20-alpine AS runner
    WORKDIR /app
    
    # copy root package files (some tools expect them)
    COPY --from=builder /app/package.json /app/package-lock.json ./
    
    # copy API dist & package files
    COPY --from=builder /app/api/package.json /app/api/package.json
    COPY --from=builder /app/api/package-lock.json /app/api/package-lock.json
    COPY --from=builder /app/api/dist /app/api/dist
    
    # install ONLY api prod deps inside /app/api
    WORKDIR /app/api
    RUN npm ci --omit=dev
    
    ENV NODE_ENV=production
    EXPOSE 8080
    CMD ["node", "dist/index.js"]