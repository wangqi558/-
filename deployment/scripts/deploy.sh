#!/bin/bash

# Production Deployment Script
# This script deploys the grading system to production

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEPLOYMENT_DIR="${PROJECT_DIR}/deployment"
BACKUP_DIR="${DEPLOYMENT_DIR}/backups"
LOG_FILE="${DEPLOYMENT_DIR}/deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

info() {
    log "${BLUE}INFO${NC}" "$@"
}

warn() {
    log "${YELLOW}WARN${NC}" "$@"
}

error() {
    log "${RED}ERROR${NC}" "$@"
}

success() {
    log "${GREEN}SUCCESS${NC}" "$@"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    local commands=("docker" "docker-compose" "git" "curl")
    for cmd in "${commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "$cmd is required but not installed"
            exit 1
        fi
    done
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
        exit 1
    fi
    
    success "All prerequisites met"
}

# Load environment variables
load_env() {
    if [[ -f "${DEPLOYMENT_DIR}/.env" ]]; then
        info "Loading environment variables..."
        set -a
        source "${DEPLOYMENT_DIR}/.env"
        set +a
    else
        error "Environment file not found: ${DEPLOYMENT_DIR}/.env"
        error "Please copy .env.example to .env and configure it"
        exit 1
    fi
}

# Create necessary directories
create_directories() {
    info "Creating necessary directories..."
    
    local dirs=(
        "${BACKUP_DIR}"
        "${DEPLOYMENT_DIR}/uploads"
        "${DEPLOYMENT_DIR}/logs"
        "${DEPLOYMENT_DIR}/nginx/logs"
        "${DEPLOYMENT_DIR}/letsencrypt"
    )
    
    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
    done
    
    success "Directories created"
}

# Backup database
backup_database() {
    info "Creating database backup..."
    
    local backup_file="${BACKUP_DIR}/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if docker-compose -f "${DEPLOYMENT_DIR}/docker/docker-compose.prod.yml" exec -T postgres pg_dump -U "${DB_USER}" "${DB_NAME}" > "${backup_file}"; then
        success "Database backup created: ${backup_file}"
        
        # Compress backup
        gzip "${backup_file}"
        success "Backup compressed: ${backup_file}.gz"
    else
        error "Failed to create database backup"
        exit 1
    fi
}

# Build and deploy
build_and_deploy() {
    info "Building and deploying application..."
    
    cd "${PROJECT_DIR}"
    
    # Pull latest code
    if [[ "${SKIP_GIT_PULL:-false}" != "true" ]]; then
        info "Pulling latest code..."
        git pull origin main
    fi
    
    # Build and start services
    docker-compose -f "${DEPLOYMENT_DIR}/docker/docker-compose.prod.yml" build --no-cache
    docker-compose -f "${DEPLOYMENT_DIR}/docker/docker-compose.prod.yml" up -d
    
    success "Application deployed successfully"
}

# Run database migrations
run_migrations() {
    info "Running database migrations..."
    
    docker-compose -f "${DEPLOYMENT_DIR}/docker/docker-compose.prod.yml" exec backend npx prisma migrate deploy
    
    success "Database migrations completed"
}

# Health check
health_check() {
    info "Performing health check..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "http://localhost/api/health" > /dev/null; then
            success "Health check passed"
            return 0
        fi
        
        warn "Health check attempt $attempt failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
    exit 1
}

# Clean up old resources
cleanup() {
    info "Cleaning up old Docker resources..."
    
    # Remove unused images
    docker image prune -f &> /dev/null || true
    
    # Remove unused volumes
    docker volume prune -f &> /dev/null || true
    
    # Remove unused networks
    docker network prune -f &> /dev/null || true
    
    success "Cleanup completed"
}

# Setup SSL certificates
setup_ssl() {
    info "Setting up SSL certificates..."
    
    if [[ ! -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ]]; then
        warn "SSL certificates not found. Please run certbot to obtain certificates:"
        warn "certbot certonly --nginx -d ${DOMAIN} -d www.${DOMAIN}"
    else
        success "SSL certificates found"
    fi
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    # You can add Slack, email, or other notification methods here
    info "Deployment $status: $message"
}

# Rollback function
rollback() {
    error "Deployment failed. Initiating rollback..."
    
    # Restore from backup
    local latest_backup=$(ls -t "${BACKUP_DIR}"/backup_*.sql.gz | head -1)
    if [[ -n "$latest_backup" ]]; then
        info "Restoring database from backup: $latest_backup"
        zcat "$latest_backup" | docker-compose -f "${DEPLOYMENT_DIR}/docker/docker-compose.prod.yml" exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}"
        success "Database restored"
    fi
    
    # Stop new containers
    docker-compose -f "${DEPLOYMENT_DIR}/docker/docker-compose.prod.yml" down
    
    error "Rollback completed"
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    info "Starting deployment..."
    
    # Trap errors for rollback
    trap 'rollback' ERR
    
    check_root
    check_prerequisites
    load_env
    create_directories
    backup_database
    build_and_deploy
    run_migrations
    health_check
    cleanup
    setup_ssl
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    success "Deployment completed successfully in ${duration} seconds"
    send_notification "SUCCESS" "Deployment completed successfully"
}

# Handle script arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    backup)
        load_env
        create_directories
        backup_database
        ;;
    health)
        health_check
        ;;
    cleanup)
        cleanup
        ;;
    rollback)
        load_env
        rollback
        ;;
    *)
        echo "Usage: $0 {deploy|backup|health|cleanup|rollback}"
        exit 1
        ;;
esac
