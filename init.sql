-- PostgreSQL initialization script for NestJS Assignment
-- This script will run when the PostgreSQL container starts for the first time

-- Create the database (already handled by POSTGRES_DB env var, but keeping for reference)
-- CREATE DATABASE IF NOT EXISTS nestjs_assignment;

-- Create a test database for running tests
CREATE DATABASE nestjs_assignment_test;

-- You can add any additional database setup here
-- For example, creating specific users, extensions, etc.

-- Enable UUID extension (useful for some applications)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a read-only user for reporting (optional)
-- CREATE USER nestjs_readonly WITH PASSWORD 'readonly_password';
-- GRANT CONNECT ON DATABASE nestjs_assignment TO nestjs_readonly;
-- GRANT USAGE ON SCHEMA public TO nestjs_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO nestjs_readonly;
-- GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO nestjs_readonly;

-- Set default privileges for future tables
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO nestjs_readonly;
