# Quick Start Guide

## 🚀 Deploy in 5 Minutes

### 1. Prerequisites
```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 2. Clone and Setup
```bash
# Clone repository
git clone https://github.com/yourusername/grading-system.git
cd grading-system

# Copy environment file
cd deployment
cp .env.example .env

# Edit configuration
nano .env
# Update at minimum:
# - DOMAIN=yourdomain.com
# - DB_PASSWORD=secure_password
# - JWT_SECRET=32+ random characters
```

### 3. Deploy
```bash
# Run deployment script
./scripts/deploy.sh

# Or manually with Docker Compose
docker-compose -f docker/docker-compose.prod.yml up -d
```

### 4. Setup SSL (Optional)
```bash
# Run as root
sudo ./scripts/setup-ssl.sh
```

### 5. Verify Deployment
```bash
# Check health
curl -f http://localhost/api/health

# View logs
docker-compose -f docker/docker-compose.prod.yml logs -f

# Run health check
./scripts/health-check.sh
```

## 📋 Default URLs

- **Application**: http://localhost
- **API**: http://localhost/api
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Kibana**: http://localhost:5601

## 🔧 Common Commands

```bash
# Start all services
docker-compose -f docker/docker-compose.prod.yml up -d

# Stop all services
docker-compose -f docker/docker-compose.prod.yml down

# View logs
docker-compose -f docker/docker-compose.prod.yml logs -f [service-name]

# Restart service
docker-compose -f docker/docker-compose.prod.yml restart [service-name]

# Update deployment
./scripts/deploy.sh

# Create backup
./scripts/backup.sh

# Check health
./scripts/health-check.sh
```

## 🛠️ Troubleshooting

### Port Already in Use
```bash
# Find process using port
sudo lsof -i :80
sudo lsof -i :443

# Kill process or change ports in docker-compose.yml
```

### Database Connection Failed
```bash
# Check PostgreSQL logs
docker-compose -f docker/docker-compose.prod.yml logs postgres

# Verify environment variables
docker-compose -f docker/docker-compose.prod.yml exec postgres env
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates
sudo certbot renew --dry-run
```

### Memory Issues
```bash
# Check memory usage
free -h

# Add swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 📊 Monitoring Setup

### Enable Monitoring
```bash
# Start with monitoring
./scripts/setup-monitoring.sh
docker-compose -f docker/docker-compose.prod.yml -f docker/docker-compose.monitoring.yml up -d
```

### Default Dashboards
- System Metrics: CPU, Memory, Disk
- Application Metrics: Requests, Errors, Latency
- Business Metrics: Users, Ratings, Scores

## 🔐 Security Checklist

- [ ] Change default passwords
- [ ] Update JWT secrets
- [ ] Configure firewall
- [ ] Enable SSL/TLS
- [ ] Review security checklist: `SECURITY_CHECKLIST.md`

## 📞 Support

### Getting Help
1. Check logs: `docker-compose logs -f`
2. Review documentation
3. Check GitHub issues
4. Contact support: support@yourdomain.com

### Useful Resources
- [Full Documentation](../README.md)
- [API Documentation](api/openapi.yml)
- [Security Guide](SECURITY_CHECKLIST.md)
