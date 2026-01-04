# SeismiStats API Server
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files and install production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/dist ./dist

# OCI Labels for GitHub Container Registry
LABEL org.opencontainers.image.source="https://github.com/DLarsen395/seismistats"
LABEL org.opencontainers.image.description="SeismiStats API - Earthquake data aggregation and chart endpoints"
LABEL org.opencontainers.image.licenses="MIT"

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start server
CMD ["node", "dist/server.js"]
