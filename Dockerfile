# Multi-stage build for SeismiStats - The Seismic Energy Explorer

# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# OCI Labels for GitHub Container Registry linking
LABEL org.opencontainers.image.source="https://github.com/DLarsen395/seismistats"
LABEL org.opencontainers.image.description="SeismiStats - The Seismic Energy Explorer - Interactive earthquake visualization and analysis"
LABEL org.opencontainers.image.licenses="MIT"

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script for runtime env injection
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Health check using the /health endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Use entrypoint script to inject runtime config, then start nginx
ENTRYPOINT ["/docker-entrypoint.sh"]
