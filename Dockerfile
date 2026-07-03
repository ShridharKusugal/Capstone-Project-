# Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package descriptors and install all dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy application source code
COPY . .

# Build both frontend static assets (Vite) and backend bundle (esbuild server.ts)
RUN npm run build

# Production Runner Stage
FROM node:18-alpine AS runner

WORKDIR /app

# Define production environment
ENV NODE_ENV=production

# Copy package descriptors and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built bundles from the builder stage
COPY --from=builder /app/dist ./dist

# Expose server port
EXPOSE 3000

# Start the application using the esbuild bundled server script
CMD ["node", "dist/server.cjs"]
