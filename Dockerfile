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

# Build the application with the new configuration
RUN npm run build

# Production stage
FROM node:20-alpine as production

WORKDIR /app

# Copy package files for production
COPY package*.json ./
RUN npm install --production

# Copy built frontend files and server files
COPY --from=build /app/dist ./dist
COPY server.js ./

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=10000
ENV VITE_GOOGLE_MAPS_API_KEY=AIzaSyDzF8YuPqRvvCYF1gF8Q57hh1mVpOtYnxA

# Expose port for Render deployment
EXPOSE 10000

# Start the server
CMD ["node", "server.js"]
