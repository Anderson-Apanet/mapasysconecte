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
COPY --from=build /app/public ./public
COPY server.js ./
COPY .env ./

# Create directory for fonts if it doesn't exist
RUN mkdir -p dist/type-font

# Copy fonts if they exist in public
COPY --from=build /app/public/type-font ./dist/type-font

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=10000

# Expose port
EXPOSE 10000

# Start the server
CMD ["node", "server.js"]
