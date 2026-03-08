# Database and Redis Configuration

This document describes the database and Redis configuration setup for the scoring system.

## Prerequisites

Install the required dependencies:
```bash
npm install pg redis joi dotenv
```

## Environment Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Update the `.env` file with your actual configuration values.

## Configuration Files

### 1. Database Configuration (`src/config/database.js`)
- Implements connection pooling using PostgreSQL
- Configurable pool size, timeouts, and SSL support
- Automatic connection monitoring and logging
- Query performance tracking

### 2. Redis Configuration (`src/config/redis.js`)
- Redis client with automatic reconnection
- Configurable retry strategy
- JSON serialization/deserialization for values
- Connection state monitoring

### 3. Environment Validation (`src/config/index.js`)
- Validates all required environment variables using Joi
- Provides default values where appropriate
- Throws clear errors for missing required configuration

### 4. Health Checks (`src/database/health.js`)
- Provides health check endpoints for monitoring
- Checks database and Redis connectivity
- Measures connection latency
- Supports Kubernetes-style liveness and readiness probes

### 5. Migration Runner (`src/scripts/migrate.js`)
- Manages database schema migrations
- Tracks executed migrations in `schema_migrations` table
- Supports up/down migrations
- Transaction-safe execution

## Usage

### Initialize Database Connections
```javascript
const dbInitializer = require('./src/database/init');

// Initialize connections
await dbInitializer.initialize();

// Test connections
await dbInitializer.testConnections();

// Create database if needed
await dbInitializer.createDatabaseIfNotExists();
```

### Run Migrations
```bash
# Run all pending migrations
node src/scripts/migrate.js up

# Rollback last migration
node src/scripts/migrate.js down

# List all migrations
node src/scripts/migrate.js list

# List pending migrations
node src/scripts/migrate.js pending
```

### Health Check Endpoints
```javascript
const { 
  healthCheckMiddleware,
  readinessCheckMiddleware,
  livenessCheckMiddleware 
} = require('./src/database/health');

// Add to your Express app
app.get('/health', healthCheckMiddleware);
app.get('/ready', readinessCheckMiddleware);
app.get('/alive', livenessCheckMiddleware);
```

### Connection Recovery
```javascript
const { connectionRecoveryMiddleware } = require('./src/database/recovery');

// Add to Express app to auto-recover connections
app.use(connectionRecoveryMiddleware);
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` file to version control
2. **Database Credentials**: Use strong passwords and limit permissions
3. **SSL/TLS**: Enable SSL for production database connections
4. **Connection Limits**: Configure appropriate pool sizes based on your load
5. **Redis Security**: Enable password authentication for Redis in production

## Monitoring

The system provides detailed logging for:
- Connection establishment and failures
- Query execution times
- Health check results
- Migration execution

## Error Handling

All modules include comprehensive error handling:
- Connection errors are logged with context
- Failed operations are retried with exponential backoff
- Graceful degradation when services are unavailable
- Clear error messages for debugging

## Performance Optimization

1. **Connection Pooling**: Reuses database connections
2. **Query Optimization**: Logs slow queries for analysis
3. **Redis Caching**: Reduces database load
4. **Health Check Caching**: Prevents excessive checks

## Troubleshooting

### Database Connection Issues
1. Check database server is running
2. Verify credentials in `.env`
3. Check network connectivity
4. Review connection pool settings

### Redis Connection Issues
1. Check Redis server is running
2. Verify Redis credentials
3. Check Redis configuration
4. Review retry strategy settings

### Migration Issues
1. Check migration file syntax
2. Ensure migrations are in correct order
3. Verify database permissions
4. Check for conflicting schema changes
