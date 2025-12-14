# Stage 1: Builder - Build the React frontend
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application, creating the /dist folder
RUN npm run build

# ---

# Stage 2: Runner - Run the Node.js server
FROM node:20-alpine AS runner

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install ONLY production dependencies
RUN npm install --omit=dev

# Copy the built frontend assets from the 'builder' stage
COPY --from=builder /app/dist ./dist

# Copy the server file that will run the application
COPY server.js .

# Expose the port the server will run on (e.g., 3001)
# Make sure this matches the port in your server.js
EXPOSE 3001

# The command to start the server
CMD ["node", "server.js"]
