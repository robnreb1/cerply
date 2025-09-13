# --- build stage ---
    FROM node:20-alpine AS build
    WORKDIR /app
    
    # Only install api workspace deps
    COPY api/package*.json ./
    RUN npm ci
    
    # Copy the api source and build it
    COPY api/ ./
    RUN npm run build
    
    # --- runtime stage ---
    FROM node:20-alpine
    ENV NODE_ENV=production
    WORKDIR /app
    
    # Bring over the built app and package files
    COPY --from=build /app/dist ./dist
    COPY --from=build /app/package*.json ./
    
    # Install only production deps
    RUN npm ci --omit=dev
    
    # Render listens on 10000 in Node services/containers
    EXPOSE 10000
    CMD ["node","dist/index.js"]