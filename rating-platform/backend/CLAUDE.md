# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a public rating platform backend API built with Node.js, Express, TypeScript, PostgreSQL, and Redis. The platform allows users to create rating objects (products/services) and submit ratings with optional comments.

## Essential Commands

### Development
```bash
# Install dependencies (run from backend directory)
npm install

# Start development server with auto-reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server (requires build first)
npm start
```

### Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/auth.test.ts

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Code Quality
```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# TypeScript type checking
npm run type-check
```

### Database
```bash
# Run database migrations (requires build)
npm run migrate

# Seed database with test data (requires build)
npm run seed

# Start database services with Docker
docker-compose up -d postgres redis
```

### Docker
```bash
# Build Docker image
npm run docker:build

# Start all services (PostgreSQL, Redis, Backend)
npm run docker:up

# Stop all services
npm run docker:down
```

## Architecture

### Layer Structure
The application follows a layered architecture pattern:

1. **Routes** (`src/routes/`) - Express route definitions
2. **Middlewares** (`src/middlewares/`) - Authentication, error handling, validation
3. **Controllers** (`src/controllers/`) - HTTP request/response handling
4. **Services** (`src/services/`) - Business logic (rating calculations, caching)
5. **Config** (`src/config/`) - Database, Redis, and environment configuration

### Key Design Patterns

1. **Transaction-Based Operations**: Rating submissions use PostgreSQL transactions to ensure data consistency. See `src/services/ratingService.ts:submitRating()`

2. **Caching Strategy**: Redis is used for caching object statistics with TTL. Cache keys follow pattern: `stats:{objectId}`, `object:{objectId}`

3. **Authentication**: JWT-based with role-based access control. Admin routes require 'admin' role.

4. **Rate Limiting**: Configurable per-IP rate limiting (default: 60 requests/minute). See `src/app.ts`

### Database Schema

**Core Tables:**
- `users` - User accounts with role (user/admin)
- `rating_objects` - Items to rate with visibility settings
- `ratings` - User ratings (1-5) with optional comments
- `reports` - Content reports for moderation

**Key Constraints:**
- Unique rating per user per object
- Unique anonymous rating per IP per object
- Score validation (1-5 range)
- Foreign key constraints with cascade deletes

### API Structure

**Base URL**: `/api`

**Authentication Routes:**
- POST `/signup` - Register new user
- POST `/login` - User login
- GET `/me` - Get current user (requires auth)

**Object Routes:**
- POST `/objects` - Create rating object (requires auth)
- GET `/objects` - List all public objects
- GET `/objects/:id` - Get object with statistics

**Rating Routes:**
- POST `/objects/:id/ratings` - Submit rating (auth optional for anonymous)
- GET `/objects/:id/ratings` - Get ratings with pagination

**Admin Routes:** (requires admin role)
- GET `/admin/reports` - List reports
- POST `/admin/objects/:id/block` - Block object
- DELETE `/admin/ratings/:id` - Delete rating
- POST `/admin/users/:id/suspend` - Suspend user

### Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string (must start with `postgresql://`)
- `JWT_SECRET` - JWT secret (minimum 32 characters)
- `REDIS_URL` - Redis connection string

Optional with defaults:
- `PORT` - Server port (default: 3000)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (default: 60000)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 60)

### Testing Approach

Tests use Jest with TypeScript support. Key test patterns:

1. **Database Setup**: Tests create their own test data and clean up after
2. **Authentication**: Tests login to get JWT tokens for authenticated endpoints
3. **Isolation**: Each test file is independent and can run in parallel
4. **Coverage**: Tests cover controllers, services, integration flows, and edge cases

### Performance Considerations

1. **Caching**: Object statistics are cached in Redis with 5-minute TTL
2. **Database Indexes**: Optimized indexes on frequently queried columns
3. **Connection Pooling**: PostgreSQL connection pool configured for production
4. **Transaction Usage**: Critical operations use transactions for consistency

### Security Features

1. **Helmet**: Security headers
2. **Input Validation**: Joi schema validation on all inputs
3. **SQL Injection Protection**: Parameterized queries only
4. **Password Hashing**: bcrypt with 10 rounds
5. **IP Hashing**: Anonymous user IPs are SHA-256 hashed
6. **JWT Expiration**: 7-day token expiration

### Common Development Tasks

**Adding a New Endpoint:**
1. Define route in `src/routes/`
2. Create controller in `src/controllers/`
3. Add validation schema if needed
4. Write tests in `tests/`
5. Update this documentation

**Modifying Database Schema:**
1. Create new migration file in `migrations/`
2. Run `npm run migrate` to apply
3. Update TypeScript types if needed
4. Update tests to handle schema changes

**Debugging Database Issues:**
- Check PostgreSQL logs: `docker-compose logs postgres`
- Verify connection string format
- Ensure migrations are run: `npm run migrate`
- Check for unique constraint violations

**Cache Debugging:**
- Redis CLI: `docker-compose exec redis redis-cli`
- Check cache keys: `KEYS *`
- Monitor cache hits/misses in service logs