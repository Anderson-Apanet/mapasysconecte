# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Set environment variables for build
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}
ENV NODE_ENV=production
ENV VITE_API_URL=/api

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine as production

WORKDIR /app

# Copy package files for production
COPY package*.json ./
RUN npm install --production

# Copy built frontend files and server files
COPY --from=build /app/dist ./dist
COPY src/server ./src/server

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=10000

# Expose port for Render deployment
EXPOSE 10000

# Start the server
CMD ["node", "src/server/index.js"]
