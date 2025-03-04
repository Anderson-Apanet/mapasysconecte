# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . .

# Set environment variables for build
ENV NODE_ENV=production
ENV VITE_API_BASE_URL=/api

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine as production

WORKDIR /app

# Copy package files and install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy built frontend files and server
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/.env.production ./.env

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=10000

# MySQL Configuration
ENV MYSQL_HOST=187.103.249.49
ENV MYSQL_PORT=3306
ENV MYSQL_USER=root
ENV MYSQL_PASSWORD=bk134
ENV MYSQL_DATABASE=radius

# Supabase Configuration
ENV VITE_SUPABASE_URL=https://dieycvogftvfoncigvtl.supabase.co
ENV VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZXljdm9nZnR2Zm9uY2lndnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0ODU4NzUsImV4cCI6MjA1NjA2MTg3NX0.5StyYMsrRVhSkcHjR-V7vSgcqU5q0lYbyc9Q7kLvZIQ
ENV VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZXljdm9nZnR2Zm9uY2lndnRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDQ4NTg3NSwiZXhwIjoyMDU2MDYxODc1fQ.mvt3u-dHTKDCvy1snH5u11YjPls1nFig_MYwlGZ1L-g

# Asaas Configuration
ENV ASAAS_API_KEY=$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ6OjAwMDAwMDAwMDAwMDAzODg5NjM6OiRhYWNoX2QxZDhjNDM3LWQ1NGEtNDFlZi1hMmMzLWRhNzYyMzI4NDk4YQ==
ENV ASAAS_API_URL=https://api.asaas.com/v3

# Google Maps API Key
ENV VITE_GOOGLE_MAPS_API_KEY=AIzaSyDzF8YuPqRvvCYF1gF8Q57hh1mVpOtYnxA

# Expose port for Render deployment
EXPOSE 10000

# Start the server
CMD ["node", "server/index.js"]
