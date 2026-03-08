#!/bin/bash

# Database Backup Script
# Creates automated backups of the PostgreSQL database

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${DEPLOYMENT_DIR}/backups"
LOG_FILE="${DEPLOYMENT_DIR}/backup.log"
RETENTION_DAYS=30

# Load environment variables
if [[ -f "${DEPLOYMENT_DIR}/.env" ]]; then
    set -a
    source "${DEPLOYMENT_DIR}/.env"
    set +a
fi

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

# Create backup
log "Creating database backup..."
if docker-compose -f "${DEPLOYMENT_DIR}/docker/docker-compose.prod.yml" exec -T postgres pg_dump -U "${DB_USER}" -d "${DB_NAME}" > "${BACKUP_FILE}"; then
    # Compress backup
    gzip "${BACKUP_FILE}"
    log "Backup created successfully: ${BACKUP_FILE}.gz"
    
    # Upload to S3 (optional)
    if [[ -n "${AWS_S3_BUCKET:-}" ]]; then
        log "Uploading backup to S3..."
        aws s3 cp "${BACKUP_FILE}.gz" "s3://${AWS_S3_BUCKET}/backups/"
        log "Backup uploaded to S3"
    fi
    
    # Send notification (optional)
    if [[ -n "${WEBHOOK_URL:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Backup completed successfully: ${BACKUP_FILE}.gz\"}" \
            "${WEBHOOK_URL}"
    fi
else
    log "ERROR: Failed to create backup"
    exit 1
fi

# Clean up old backups
log "Cleaning up old backups..."
find "${BACKUP_DIR}" -name "backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
log "Old backups cleaned up"
