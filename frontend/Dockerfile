# Frontend Dockerfile
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace config and lockfile from root
COPY pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy frontend package.json
COPY frontend/package.json ./frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter travian-tools-frontend

# Copy frontend source code
COPY frontend/ ./frontend/

# Build-time settings (Vite inlines them into the bundle).
# VITE_API_URL must be the full backend API base, e.g.
# https://tt-api-138672009807.asia-east1.run.app/api/v1
ARG VITE_API_URL
ARG VITE_EXTENSION_ID
ENV VITE_API_URL=$VITE_API_URL \
    VITE_EXTENSION_ID=$VITE_EXTENSION_ID

# Build the application
WORKDIR /app/frontend
RUN pnpm build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port (Cloud Run default)
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
