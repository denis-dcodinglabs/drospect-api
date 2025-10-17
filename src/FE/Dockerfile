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

# Expose the application port
EXPOSE 3000

# Command to serve the React app
CMD ["npx", "serve", "-s", "build"]