#!/bin/bash

# Development startup script for Python Tiling Server
set -e

echo "Starting Python Tiling Server in Development Mode..."

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install/upgrade dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Set environment variables for development
export ENVIRONMENT=development
export LOG_LEVEL=DEBUG
export BACKEND_BASE_URL=${BACKEND_BASE_URL:-"http://localhost:8080"}
export PORT=${PORT:-8000}

# Create logs directory if it doesn't exist
mkdir -p logs

# Start the development server with auto-reload
echo "Starting development server on port $PORT..."
uvicorn main:app \
    --host 0.0.0.0 \
    --port $PORT \
    --reload \
    --log-level debug \
    --access-log \
    --use-colors 