# Rating Platform

A modern, scalable rating platform that allows users to rate and review various objects (products, services, etc.) with support for both authenticated and anonymous ratings.

## Features

- ✅ User authentication with JWT
- ✅ Rate and review system with 1-5 star ratings
- ✅ Anonymous rating support
- ✅ Admin panel for content moderation
- ✅ Rate limiting and security features
- ✅ Redis caching for performance
- ✅ PostgreSQL for data persistence
- ✅ Docker support for easy deployment
- ✅ TypeScript for type safety
- ✅ Comprehensive testing setup

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **ORM**: Knex.js
- **Authentication**: JWT
- **Validation**: Joi & express-validator

### Development Tools
- **Testing**: Jest with Supertest
- **Linting**: ESLint with TypeScript
- **Formatting**: Prettier
- **Process Management**: Nodemon
- **Containerization**: Docker & Docker Compose

## Project Structure

```
rating-platform/
└── backend/              # Backend API
    ├── src/              # Source code
    ├── tests/            # Test files
    ├── migrations/       # Database migrations
    └── seeds/            # Database seeds
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL 15 or higher
- Redis 7 or higher
- Docker (optional)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd rating-platform
   ```

2. Navigate to the backend directory:
   ```bash
   cd backend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Start PostgreSQL and Redis (or use Docker):
   ```bash
   docker-compose up -d postgres redis
   ```

6. Run database migrations:
   ```bash
   npm run migrate
   ```

7. Seed the database (optional):
   ```bash
   npm run seed
   ```

8. Start the development server:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Objects (Items to Rate)
- `POST /api/objects` - Create rating object
- `GET /api/objects` - List all public objects
- `GET /api/objects/:id` - Get object with statistics

### Ratings
- `POST /api/objects/:id/ratings` - Submit rating
- `GET /api/objects/:id/ratings` - Get ratings with pagination

### Admin
- `GET /api/admin/reports` - List reports
- `POST /api/admin/objects/:id/block` - Block object
- `DELETE /api/admin/ratings/:id` - Delete rating

## Testing

Run all tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Docker Deployment

Build and run all services:
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis cache
- Backend API

## Environment Variables

See `.env.example` for a complete list of environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT secret key
- `PORT` - Server port (default: 3000)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
