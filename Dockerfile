# ==============================
# 1️⃣ Build stage (typescript -> js)
# ==============================
FROM node:20-alpine AS builder

# Set working directory inside the image
WORKDIR /app

# Copy only package files first – leverage layer caching
COPY package*.json ./
# Install **all** dependencies (including dev) because we need TypeScript to compile
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the TypeScript project (tsc will output to ./dist)
RUN npm run build

# ==============================
# 2️⃣ Production stage (runtime only)
# ==============================
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy only the compiled output and production deps from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
# Install ONLY production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Expose the port Render will assign (default 10000)
EXPOSE 10000

# The command Render will run (it passes PORT automatically)
CMD ["node", "dist/server.cjs"]
