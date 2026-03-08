# Rating Platform Test Suite

This comprehensive test suite covers all aspects of the rating platform including unit tests, integration tests, performance tests, and security tests.

## Test Structure

```
tests/
├── config/                 # Test configuration files
│   ├── jest.config.js     # Jest configuration
│   ├── test-database.ts   # Test database setup
│   └── coverage.config.js # Coverage reporting configuration
├── fixtures/              # Test data fixtures
│   ├── user.fixture.ts
│   ├── rating.fixture.ts
│   ├── item.fixture.ts
│   └── category.fixture.ts
├── factories/             # Test data factories
│   ├── user.factory.ts
│   ├── rating.factory.ts
│   ├── item.factory.ts
│   └── category.factory.ts
├── unit/                  # Unit tests
│   ├── auth/
│   ├── rating/
│   ├── user/
│   └── admin/
├── integration/           # Integration tests
│   ├── auth/
│   ├── rating/
│   ├── user/
│   └── admin/
├── performance/           # Performance tests
│   └── rating-stats.performance.spec.ts
├── security/              # Security tests
│   ├── sql-injection.security.spec.ts
│   ├── xss.security.spec.ts
│   └── rate-limiting.security.spec.ts
└── utils/
    └── test-utils.ts      # Test utilities and helpers
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test suites
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Performance tests only
npm run test:performance

# Security tests only
npm run test:security
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run tests in watch mode
```bash
npm run test:watch
```

## Test Categories

### Unit Tests
- Test individual services and components in isolation
- Mock external dependencies
- Focus on business logic
- Fast execution

### Integration Tests
- Test API endpoints end-to-end
- Use real database (test database)
- Test request/response cycles
- Verify authentication and authorization

### Performance Tests
- Test system under load
- Measure response times
- Test concurrent requests
- Identify bottlenecks

### Security Tests
- SQL injection prevention
- XSS protection
- Rate limiting
- Input validation
- Authentication/authorization

## Test Data Management

### Fixtures
Fixtures provide static test data for consistent testing:
```typescript
const user = await createTestUser({
  email: 'test@example.com',
  role: UserRole.ADMIN
});
```

### Factories
Factories generate dynamic test data:
```typescript
const users = await UserFactory.createMany(10);
const rating = await RatingFactory.create(user, item, { score: 5 });
```

## Database Testing

Tests use a separate test database to avoid affecting development/production data. The test database is:
- Automatically created before tests
- Cleaned between test runs
- Destroyed after all tests complete

## Coverage Requirements

Minimum coverage thresholds:
- Global: 80% for all metrics
- Auth module: 90% for all metrics
- Rating module: 85% for all metrics
- User module: 85% for all metrics
- Admin module: 90% for all metrics

## Performance Benchmarks

- API response time: < 200ms for simple queries
- Statistics calculation: < 1s for 10,000 ratings
- Concurrent requests: Handle 100+ concurrent requests
- Database queries: < 500ms for complex queries

## Security Test Cases

### SQL Injection
- Test all input parameters
- Verify parameterized queries
- Check error handling

### XSS Protection
- Test all user inputs
- Verify output encoding
- Check Content-Type headers

### Rate Limiting
- Test brute force protection
- Verify progressive delays
- Check IP-based limits

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Descriptive Names**: Test names should describe the scenario
3. **Arrange-Act-Assert**: Structure tests clearly
4. **One Assertion Per Test**: Keep tests focused
5. **Use Factories**: Generate test data dynamically
6. **Clean Up**: Always clean up test data
7. **Mock External Services**: Don't depend on external APIs

## Continuous Integration

Tests run automatically on:
- Every pull request
- Main branch commits
- Nightly builds

All tests must pass before merging is allowed.
