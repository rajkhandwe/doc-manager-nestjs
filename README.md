# NestJS Assignment - Document Management System

A comprehensive backend application built with NestJS featuring user authentication, document management, and ingestion controls.

## Features

- 🔐 JWT Authentication & Role-based Access Control
- 📄 Document Upload/Download with File Validation
- 🔄 Document Ingestion Jobs with Progress Tracking
- 📚 Swagger API Documentation
- 🐳 Docker Support for Easy Setup
- 🧪 Comprehensive Test Coverage

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment and database
cp .env.example .env
docker-compose up -d postgres minio

# Start the application
npm run start:dev
```

**Access Points:**

- API: http://localhost:3000/api
- Swagger Docs: http://localhost:3000/api/docs
- MinIO Console: http://localhost:9001 (admin/admin)

## Prerequisites

- Node.js (v18+)
- PostgreSQL (v12+) OR Docker
- MinIO (for local development) OR AWS S3 (for production)
- npm or yarn

## Setup

### Database Setup

**Option 1: Docker (Recommended)**

```bash
docker-compose up -d postgres
```

**Option 2: Local PostgreSQL**

```bash
# macOS
brew install postgresql@15 && brew services start postgresql@15
createdb nestjs_assignment

# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb nestjs_assignment
```

### Environment Configuration

```bash
cp .env.example .env
# Edit .env with your database credentials if needed
```

### Storage Setup

The application supports two storage backends:

**MinIO (Local Development - Default)**

```bash
# MinIO is included in docker-compose.yml
docker-compose up -d minio

# Access MinIO Console at http://localhost:9001
# Username: minioadmin
# Password: minioadmin
```

**AWS S3 (Production)**

```bash
# Set environment variables in .env
STORAGE_TYPE=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=your-bucket-name
```

## Running the Application

```bash
# Development
npm run start:dev

# Production
npm run build && npm run start:prod

# Seed sample data
npm run seed
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test with coverage
npm run test:cov

# Manual API testing
chmod +x test-api.sh && ./test-api.sh
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile

### Documents

- `POST /api/documents` - Upload document
- `GET /api/documents` - Get documents (with filtering)
- `GET /api/documents/:id` - Get document by ID
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/:id/download` - Download document

### Ingestion Jobs

- `POST /api/ingestion` - Create ingestion job
- `GET /api/ingestion` - Get all ingestion jobs
- `GET /api/ingestion/:id` - Get ingestion job by ID
- `POST /api/ingestion/:id/trigger` - Trigger ingestion
- `PUT /api/ingestion/:id/cancel` - Cancel ingestion job

### Users (Admin only)

- `GET /api/users` - Get all users
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile

## Project Structure

```
src/
├── auth/           # Authentication module
├── users/          # User management
├── documents/      # Document CRUD operations
├── ingestion/      # Document ingestion jobs
├── entities/       # TypeORM entities
├── dto/           # Data Transfer Objects
├── guards/        # Authentication & authorization guards
├── config/        # Configuration files
└── database/      # Database utilities and seeding
```

## Development

```bash
# Code quality
npm run lint
npm run format

# Add new feature
npx nest g module feature-name
npx nest g service feature-name
npx nest g controller feature-name
```

## Environment Variables

| Variable      | Description        | Default             | Required |
| ------------- | ------------------ | ------------------- | -------- |
| `NODE_ENV`    | Environment        | `development`       | No       |
| `PORT`        | Server port        | `3000`              | No       |
| `JWT_SECRET`  | JWT signing secret | -                   | **Yes**  |
| `DB_HOST`     | Database host      | `localhost`         | **Yes**  |
| `DB_PORT`     | Database port      | `5432`              | **Yes**  |
| `DB_USERNAME` | Database username  | `postgres`          | **Yes**  |
| `DB_PASSWORD` | Database password  | -                   | **Yes**  |
| `DB_DATABASE` | Database name      | `nestjs_assignment` | **Yes**  |

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps
pg_isready -h localhost -p 5432

# Reset database (development)
docker-compose down -v
docker-compose up -d postgres
npm run seed
```

### Port Issues

```bash
# Change port in .env
echo "PORT=3001" >> .env

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### File Upload Issues

```bash
# Check uploads directory
mkdir -p uploads
chmod 755 uploads
```

## Production Deployment

### Basic Production Setup

```bash
# Build application
npm run build

# Use PM2 for process management
npm install -g pm2
pm2 start dist/main.js --name nestjs-assignment

# Environment
NODE_ENV=production
JWT_SECRET=your-production-secret-32-chars-min
```

### Docker Production

```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

## Sample Test Data

After running `npm run seed`:

| Role  | Email             | Password     |
| ----- | ----------------- | ------------ |
| Admin | admin@example.com | Password123! |
| User  | user@example.com  | Password123! |

## License

MIT License - see [LICENSE](LICENSE) file for details.
