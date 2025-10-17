# Use the official Node.js 20 image as the base
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Build the React app
RUN npm run build

# Expose the application port (CapRover sets PORT)
EXPOSE 8080

# Command to serve the React app, binding to PORT env or 8080
CMD ["npx", "serve", "-s", "build", "-l", "${PORT:-8080}"]