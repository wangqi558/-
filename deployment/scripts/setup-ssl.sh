#!/bin/bash

# SSL Setup Script
# Automates SSL certificate setup with Let's Encrypt

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_FILE="${DEPLOYMENT_DIR}/ssl-setup.log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Logging
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

info() {
    log "${GREEN}[INFO]${NC} $*"
}

error() {
    log "${RED}[ERROR]${NC} $*"
}

success() {
    log "${GREEN}[SUCCESS]${NC} $*"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
        exit 1
    fi
}

# Main function
main() {
    check_root
    
    # Get domain and email
    read -p "Enter your domain (e.g., example.com): " DOMAIN
    read -p "Enter your email (for Let's Encrypt): " EMAIL
    
    info "Starting SSL setup for ${DOMAIN}..."
    
    # Install certbot
    info "Installing Certbot..."
    apt update && apt install -y certbot python3-certbot-nginx
    
    # Obtain certificate
    info "Obtaining SSL certificate..."
    certbot certonly --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --email "${EMAIL}" --agree-tos
    
    # Setup auto-renewal
    info "Setting up auto-renewal..."
    (crontab -l 2>/dev/null; echo "0 2 * * * certbot renew --quiet") | crontab -
    
    success "SSL setup completed!"
    info "Your site should now be accessible at https://${DOMAIN}"
}

# Run main function
main
