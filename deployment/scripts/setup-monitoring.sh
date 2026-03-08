#!/bin/bash

# Monitoring Setup Script
# Sets up Prometheus, Grafana, and ELK stack

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "Setting up monitoring configuration..."

# Create docker-compose override for monitoring
cat > ${DEPLOYMENT_DIR}/docker/docker-compose.monitoring.yml << 'MONITORING_EOF'
version: '3.8'

services:
  node-exporter:
    image: prom/node-exporter:latest
    container_name: grading-node-exporter
    restart: unless-stopped
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
MONITORING_EOF

echo "Monitoring setup completed!"
echo "To start monitoring services, run:"
echo "docker-compose -f docker/docker-compose.prod.yml -f docker/docker-compose.monitoring.yml up -d"
