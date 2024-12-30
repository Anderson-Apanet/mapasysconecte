# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy all files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine as production

WORKDIR /app

# Copy package files for production
COPY package*.json ./
RUN npm install --production

# Copy built frontend files
COPY --from=build /app/dist ./dist

# Copy server files
COPY server.js ./
COPY .env ./

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
