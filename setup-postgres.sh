#!/bin/bash

# PostgreSQL Setup Script for Local Development
# This script helps you set up PostgreSQL for the NestJS application

echo "🚀 Setting up PostgreSQL for NestJS Application..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed."
    echo "📦 To install PostgreSQL on macOS:"
    echo "   Option 1: Using Homebrew: brew install postgresql@15"
    echo "   Option 2: Download from: https://www.postgresql.org/download/macosx/"
    echo ""
    echo "🐳 Alternative: Use Docker:"
    echo "   docker run -d --name nestjs-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15"
    exit 1
fi

echo "✅ PostgreSQL is installed"

# Check if PostgreSQL service is running
if ! pg_isready -h localhost -p 5432 &> /dev/null; then
    echo "⚠️  PostgreSQL service is not running"
    echo "🔧 To start PostgreSQL:"
    echo "   macOS (Homebrew): brew services start postgresql@15"
    echo "   macOS (App): Start PostgreSQL.app"
    echo "   Linux: sudo systemctl start postgresql"
    echo ""
    echo "Please start PostgreSQL and run this script again."
    exit 1
fi

echo "✅ PostgreSQL service is running"

# Database configuration from .env
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USERNAME=${DB_USERNAME:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_DATABASE=${DB_DATABASE:-nestjs_assignment}

echo "🗄️  Setting up database: $DB_DATABASE"

# Create database if it doesn't exist
export PGPASSWORD=$DB_PASSWORD
psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$DB_DATABASE';" | grep -q 1 || {
    echo "📋 Creating database: $DB_DATABASE"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d postgres -c "CREATE DATABASE $DB_DATABASE;"
}

echo "✅ Database $DB_DATABASE is ready"

# Check if we can connect to the application database
if psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_DATABASE -c "SELECT version();" &> /dev/null; then
    echo "✅ Successfully connected to $DB_DATABASE"
    echo ""
    echo "🎉 PostgreSQL setup complete!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Run: npm install"
    echo "   2. Run: npm run start:dev"
    echo "   3. The application will automatically create tables on first run"
    echo ""
    echo "🌐 Access your application at: http://localhost:3000"
    echo "📚 API Documentation at: http://localhost:3000/api/docs"
else
    echo "❌ Failed to connect to database $DB_DATABASE"
    echo "🔧 Please check your database configuration in .env file"
    exit 1
fi
