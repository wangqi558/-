# Grading System

A comprehensive, production-ready grading and rating system with secure authentication, real-time scoring, and analytics capabilities.

## Features

- 🔐 **Secure Authentication**: JWT-based authentication with refresh tokens
- 👥 **User Management**: Role-based access control (Admin, User)
- 📊 **Rating System**: Create and manage rating criteria
- ⭐ **Scoring**: Real-time score calculation with weighted criteria
- 📈 **Analytics**: Comprehensive analytics and reporting
- 🚀 **Production Ready**: Dockerized deployment with monitoring
- 🔒 **Security**: Rate limiting, input validation, and security headers
- 📱 **Responsive**: Mobile-friendly interface

## Tech Stack

### Backend
- Node.js with Express.js
- PostgreSQL database
- Redis for caching
- JWT authentication
- Prisma ORM
- Winston logging

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- Axios for API calls
- React Router for navigation
- React Query for state management

### Infrastructure
- Docker & Docker Compose
- Nginx reverse proxy
- SSL/TLS with Let's Encrypt
- Prometheus & Grafana monitoring
- ELK stack for logging

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js (v18 or higher)
- PostgreSQL (v15 or higher)
- Redis (v7 or higher)

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/grading-system.git
cd grading-system
```

2. Install dependencies:
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables:
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

4. Run database migrations:
```bash
cd backend
npx prisma migrate dev
```

5. Start development servers:
```bash
# Start backend (port 3000)
npm run dev

# Start frontend (port 5173)
cd frontend
npm run dev
```

### Production Deployment

1. Configure environment variables:
```bash
cd deployment
cp .env.example .env
# Edit .env with production values
```

2. Run the deployment script:
```bash
./scripts/deploy.sh
```

3. Access the application:
- Frontend: https://yourdomain.com
- API: https://api.yourdomain.com
- Grafana: https://yourdomain.com:3001
- Prometheus: https://yourdomain.com:9090

## API Documentation

The API documentation is available in OpenAPI format at `/docs/api/openapi.yml`.

You can also view the interactive documentation by running the development server and visiting:
- Swagger UI: http://localhost:3000/api/docs
- ReDoc: http://localhost:3000/api/redoc

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Server port | `3000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `grading_system` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `EMAIL_HOST` | SMTP host | - |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USER` | SMTP user | - |
| `EMAIL_PASS` | SMTP password | - |

## Deployment

### Docker Deployment

The application can be deployed using Docker Compose:

```bash
# Build and start all services
docker-compose -f deployment/docker/docker-compose.prod.yml up -d

# View logs
docker-compose -f deployment/docker/docker-compose.prod.yml logs -f

# Stop all services
docker-compose -f deployment/docker/docker-compose.prod.yml down
```

### Manual Deployment

1. **Server Setup**
   - Ubuntu 20.04+ or CentOS 8+
   - Install Docker and Docker Compose
   - Configure firewall (UFW/CentOS Firewall)

2. **SSL Setup**
   ```bash
   # Install Certbot
   sudo apt install certbot python3-certbot-nginx
   
   # Obtain SSL certificate
   sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
   ```

3. **Nginx Configuration**
   - Copy nginx configuration files to `/etc/nginx/`
   - Test configuration: `sudo nginx -t`
   - Reload nginx: `sudo systemctl reload nginx`

4. **Application Deployment**
   - Clone repository
   - Configure environment variables
   - Run deployment script

## Monitoring

### Prometheus Metrics

The application exposes metrics at `/api/metrics` including:
- HTTP request duration
- Request count by status code
- Database query performance
- Cache hit/miss ratio
- Active user sessions

### Grafana Dashboards

Pre-configured dashboards for:
- System metrics (CPU, memory, disk)
- Application metrics (requests, errors, latency)
- Database metrics (connections, queries, performance)
- Business metrics (users, ratings, scores)

### Alerts

Configured alerts for:
- High CPU/memory usage
- Database connection failures
- API response time > 2s
- Error rate > 10%
- Disk space < 15%

## Security

### Authentication
- JWT tokens with refresh mechanism
- Password hashing with bcrypt (12 rounds)
- Rate limiting on authentication endpoints
- Session management

### Data Protection
- Input validation and sanitization
- SQL injection prevention (Prisma ORM)
- XSS protection
- CSRF tokens

### Infrastructure Security
- SSL/TLS encryption
- Security headers (CSP, HSTS, X-Frame-Options)
- Nginx rate limiting
- Fail2ban integration

## Backup and Recovery

### Automated Backups
- Daily database backups at 2 AM
- 30-day retention policy
- Optional S3 upload

### Manual Backup
```bash
# Create backup
./scripts/backup.sh

# Restore from backup
docker exec -i grading-postgres psql -U grading_user -d grading_system < backup.sql
```

## Performance Optimization

### Database Optimization
- Indexed frequently queried columns
- Connection pooling
- Query optimization
- Read replicas (optional)

### Caching Strategy
- Redis for session storage
- API response caching
- Static asset caching (CDN ready)

### Frontend Optimization
- Code splitting
- Lazy loading
- Image optimization
- Gzip compression

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running
   - Verify connection string
   - Check firewall settings

2. **JWT Token Invalid**
   - Verify JWT_SECRET matches
   - Check token expiration
   - Clear browser cache

3. **Docker Containers Not Starting**
   - Check Docker daemon status
   - Verify port availability
   - Check Docker logs

### Debug Mode

Enable debug logging:
```bash
# Set log level
echo "LOG_LEVEL=debug" >> .env

# View debug logs
npm run dev:debug
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@yourdomain.com or join our Slack channel.

## Roadmap

- [ ] Mobile applications (iOS/Android)
- [ ] Machine learning for score prediction
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] WebSocket real-time updates
- [ ] GraphQL API
- [ ] Microservices architecture
- [ ] Kubernetes deployment

## Acknowledgments

- Built with modern web technologies
- Security best practices implemented
- Scalable architecture design
- Comprehensive testing coverage
