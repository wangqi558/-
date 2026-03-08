#!/bin/bash

# Health Check Script
# Monitors the health of all services

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_FILE="${DEPLOYMENT_DIR}/health-check.log"
ALERT_THRESHOLD=3

# Load environment variables
if [[ -f "${DEPLOYMENT_DIR}/.env" ]]; then
    set -a
    source "${DEPLOYMENT_DIR}/.env"
    set +a
fi

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

# Function to check service health
check_service() {
    local service=$1
    local url=$2
    local expected_status=${3:-200}
    
    local status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [[ "$status" == "$expected_status" ]]; then
        log "✓ $service is healthy (status: $status)"
        return 0
    else
        log "✗ $service is unhealthy (status: $status, expected: $expected_status)"
        return 1
    fi
}

# Function to check Docker container health
check_container() {
    local container=$1
    local status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
    
    if [[ "$status" == "healthy" ]]; then
        log "✓ Container $container is healthy"
        return 0
    else
        log "✗ Container $container is unhealthy (status: $status)"
        return 1
    fi
}

# Main health check
main() {
    log "Starting health check..."
    
    local failed_checks=0
    
    # Check API health
    if ! check_service "API" "http://localhost/api/health"; then
        ((failed_checks++))
    fi
    
    # Check frontend
    if ! check_service "Frontend" "http://localhost" "200"; then
        ((failed_checks++))
    fi
    
    # Check database connection
    if ! docker-compose -f "${DEPLOYMENT_DIR}/docker/docker-compose.prod.yml" exec -T postgres pg_isready -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; then
        log "✗ Database connection failed"
        ((failed_checks++))
    else
        log "✓ Database connection is healthy"
    fi
    
    # Check Redis
    if ! docker-compose -f "${DEPLOYMENT_DIR}/docker/docker-compose.prod.yml" exec -T redis redis-cli ping > /dev/null 2>&1; then
        log "✗ Redis connection failed"
        ((failed_checks++))
    else
        log "✓ Redis connection is healthy"
    fi
    
    # Check container health
    for container in grading-frontend grading-backend grading-postgres grading-redis; do
        if ! check_container "$container"; then
            ((failed_checks++))
        fi
    done
    
    # Check disk space
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 90 ]]; then
        log "✗ Disk usage is critical: ${disk_usage}%"
        ((failed_checks++))
    else
        log "✓ Disk usage is healthy: ${disk_usage}%"
    fi
    
    # Check memory usage
    local memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
    if [[ $memory_usage -gt 90 ]]; then
        log "✗ Memory usage is high: ${memory_usage}%"
        ((failed_checks++))
    else
        log "✓ Memory usage is healthy: ${memory_usage}%"
    fi
    
    # Summary
    if [[ $failed_checks -eq 0 ]]; then
        log "Health check completed: All services are healthy"
        exit 0
    else
        log "Health check completed: $failed_checks checks failed"
        
        # Send alert if threshold is exceeded
        if [[ $failed_checks -ge $ALERT_THRESHOLD ]]; then
            log "CRITICAL: Multiple health checks failed. Sending alert..."
            # Add your alerting mechanism here (email, Slack, etc.)
        fi
        
        exit 1
    fi
}

# Run health check
main
