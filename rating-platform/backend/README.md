# Rating Platform Backend

A TypeScript-based backend API for a public rating platform built with Express.js, PostgreSQL, and Redis.

## Features

- User authentication with JWT
- Rate and review system
- Admin panel for content moderation
- Rate limiting and security features
- Caching with Redis
- PostgreSQL database with proper indexing
- Docker support

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

## Installation

1. Clone the repository
2. Navigate to the backend directory:
   ```bash
   cd rating-platform/backend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a `.env` file based on `.env.example` and configure your environment variables

5. Set up the database:
   ```bash
   npm run migrate
   npm run seed
   ```

## Development

Start the development server:
```bash
npm run dev
```

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Docker

Build and run with Docker Compose:
```bash
docker-compose up -d
```

## API Documentation

API documentation will be available at `http://localhost:3000/api-docs` when the server is running.

## Project Structure

```
src/
├── config/         # Configuration files
├── controllers/    # Route controllers
├── middlewares/    # Express middlewares
├── models/        # Data models
├── routes/        # API routes
├── services/      # Business logic
└── utils/         # Utility functions
```
