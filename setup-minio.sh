#!/bin/bash

# MinIO Setup Script for Local Development
echo "🚀 Setting up MinIO for local development..."

# Check if MinIO is running
if ! curl -f http://localhost:9000/minio/health/live &>/dev/null; then
    echo "📦 Starting MinIO..."
    docker-compose up -d minio
    
    # Wait for MinIO to be ready
    echo "⏳ Waiting for MinIO to be ready..."
    until curl -f http://localhost:9000/minio/health/live &>/dev/null; do
        sleep 2
    done
fi

echo "✅ MinIO is running!"
echo "🌐 MinIO Console: http://localhost:9001"
echo "🔑 Username: minioadmin"
echo "🔑 Password: minioadmin"
echo ""
echo "🎯 You can now start the application with: npm run start:dev"
