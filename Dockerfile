# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Set environment variables for build
ENV NODE_ENV=production
ENV VITE_API_URL=/api

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine as production

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy built frontend files and server
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/.env.production ./.env

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=10000

# MySQL Configuration
ENV MYSQL_HOST=201.76.1.124
ENV MYSQL_PORT=3306
ENV MYSQL_USER=root
ENV MYSQL_PASSWORD=bk134
ENV MYSQL_DATABASE=radius

# Supabase Configuration
ENV VITE_SUPABASE_URL=https://aunfucsmyfbdyxfgvpha.supabase.co
ENV VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bmZ1Y3NteWZiZHl4Zmd2cGhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY1MTk4NjYsImV4cCI6MjAzMjA5NTg2Nn0.EuPJTwjeqpTWK3YIRhq981FTRwSAHsjCqsvrB0AMnGM

# Google Maps API Key
ENV VITE_GOOGLE_MAPS_API_KEY=AIzaSyDzF8YuPqRvvCYF1gF8Q57hh1mVpOtYnxA

# Expose port for Render deployment
EXPOSE 10000

# Start the server
CMD ["node", "server/index.js"]
