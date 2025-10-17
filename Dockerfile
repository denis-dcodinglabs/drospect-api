# Use the official Node.js 20 image as the base
FROM node:20-alpine

# Install system dependencies including GDAL
RUN apk add --no-cache \
    openssl \
    libssl3 \
    gdal \
    gdal-dev \
    proj \
    proj-dev \
    geos \
    geos-dev \
    build-base \
    python3 \
    python3-dev \
    py3-pip \
    py3-setuptools \
    py3-wheel \
    py3-numpy

# Set GDAL environment variables
ENV GDAL_CONFIG=/usr/bin/gdal-config
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

# Install Python dependencies for COG processing fallback
# Use --break-system-packages to override PEP 668 restriction
RUN pip3 install --no-cache-dir --break-system-packages rio-cogeo

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose the port
EXPOSE 8080

# Start the application
CMD ["node", "dist/src/main"]
