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

# Accept build-time variables (CapRover Build Args)
ARG CORS_ORIGIN
ARG DATABASE_URL
ARG JWT_SECRET
ARG JWT_EXPIRES_IN
ARG STRIPE_SERVER_SECRET_KEY
ARG GCS_PROJECT_ID
ARG GCS_BUCKET_NAME
ARG GCS_KEYFILE_PATH
ARG MAPBOX_TOKEN
ARG GEOAPIFY_API_KEY
ARG TILING_SERVER_URL
ARG EMAIL
ARG DESTINATION_EMAIL
ARG API_KEY
ARG APP_PASSWORD
ARG CAPROVER_GIT_COMMIT_SHA

# Export them as ENV so app can read via process.env at runtime
ENV CORS_ORIGIN=$CORS_ORIGIN \
    DATABASE_URL=$DATABASE_URL \
    JWT_SECRET=$JWT_SECRET \
    JWT_EXPIRES_IN=$JWT_EXPIRES_IN \
    STRIPE_SERVER_SECRET_KEY=$STRIPE_SERVER_SECRET_KEY \
    GCS_PROJECT_ID=$GCS_PROJECT_ID \
    GCS_BUCKET_NAME=$GCS_BUCKET_NAME \
    GCS_KEYFILE_PATH=$GCS_KEYFILE_PATH \
    MAPBOX_TOKEN=$MAPBOX_TOKEN \
    GEOAPIFY_API_KEY=$GEOAPIFY_API_KEY \
    TILING_SERVER_URL=$TILING_SERVER_URL \
    EMAIL=$EMAIL \
    DESTINATION_EMAIL=$DESTINATION_EMAIL \
    API_KEY=$API_KEY \
    APP_PASSWORD=$APP_PASSWORD \
    CAPROVER_GIT_COMMIT_SHA=$CAPROVER_GIT_COMMIT_SHA

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
CMD ["node", "dist/src/main.js"]
