#!/bin/bash

# Production startup script for Python Tiling Server
set -e

echo "Starting Python Tiling Server in Production Mode..."

# Set environment variables for production
export ENVIRONMENT=production
export LOG_LEVEL=${LOG_LEVEL:-INFO}
export BACKEND_BASE_URL=${BACKEND_BASE_URL:-"http://localhost:8080"}
export PORT=${PORT:-8000}
export WORKERS=${WORKERS:-4}

# Create logs directory if it doesn't exist
mkdir -p logs

# Start the production server with Gunicorn
echo "Starting production server with $WORKERS workers on port $PORT..."
gunicorn main:app \
    --bind 0.0.0.0:$PORT \
    --workers $WORKERS \
    --worker-class uvicorn.workers.UvicornWorker \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --preload \
    --access-logfile logs/access.log \
    --error-logfile logs/error.log \
    --capture-output \
    --enable-stdio-inheritance 