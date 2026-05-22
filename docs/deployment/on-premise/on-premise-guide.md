# TPT Doctor — On-Premise Deployment Guide

## Overview

This guide covers deploying TPT Doctor in an on-premise environment using Docker Compose. This deployment is suitable for clinics that require complete data sovereignty or have regulatory requirements preventing cloud deployment.

## Architecture

The on-premise stack consists of:

```
[Nginx (TLS termination)]
    |
[NestJS API] [React Web App] [React Patient Portal]
    |              |                  |
[PostgreSQL]  [Redis]  [MinIO (S3)]  [Jitsi Meet]
    |              |                  |
[Monitoring: Prometheus + Grafana]
```

## Prerequisites

- Docker Engine 24+ and Docker Compose 2.20+
- 4 CPU cores, 16GB RAM minimum (8 CPU, 32GB RAM recommended)
- 100GB+ SSD storage (expandable)
- Ubuntu 22.04 LTS or RHEL 9 (recommended)
- Domain name with DNS configured
- TLS certificates (Let's Encrypt or commercial CA)
- Network: Ports 80, 443, 3478 (TURN/STUN) open

## Installation

### Step 1: System Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Configure Environment

```bash
# Clone the repository
git clone https://github.com/your-org/tpt-doctor.git
cd tpt-doctor

# Copy environment configuration
cp .env.production.example .env

# Edit configuration
nano .env
```

### Key Configuration Values

```env
# Database
DATABASE_URL=postgresql://tpt:tpt_password@postgres:5432/tpt_doctor
DATABASE_SSL=false

# Redis
REDIS_URL=redis://redis:6379

# Encryption (IMPORTANT: Generate a unique key)
ENCRYPTION_MASTER_KEY=<generate-with-node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Storage (MinIO S3-compatible)
STORAGE_PROVIDER=s3
STORAGE_ENDPOINT=http://minio:9000
STORAGE_ACCESS_KEY_ID=tpt-admin
STORAGE_SECRET_ACCESS_KEY=<generate-strong-password>
STORAGE_BUCKET=tpt-doctor-files
STORAGE_FORCE_PATH_STYLE=true

# Auth0 Configuration
AUTH0_DOMAIN=<your-tenant>.auth0.com
AUTH0_CLIENT_ID=<your-client-id>
AUTH0_CLIENT_SECRET=<your-client-secret>
AUTH0_AUDIENCE=https://api.tptdoctor.com

# Payment Gateways
STRIPE_SECRET_KEY=<sk_live_...>
AIRWALLEX_API_KEY=<your-api-key>

# Telemedicine
TELEMEDICINE_PROVIDER=jitsi
JITSI_DOMAIN=meet.your-clinic.com

# Monitoring
PROMETHEUS_ENABLED=true
SENTRY_DSN=<your-sentry-dsn>
```

### Step 3: Deploy the Stack

```bash
# Start all services
docker compose -f docker-compose.production.yml up -d

# Run database migrations
docker compose exec api pnpm run db:migrate

# Seed initial data
docker compose exec api pnpm run db:seed

# Verify deployment
curl https://your-domain.com/api/v1/health
```

## Service Configuration

### Nginx Reverse Proxy

The `docker-compose.production.yml` includes an Nginx container configured for:
- TLS termination with automatic Let's Encrypt certificates
- Reverse proxy to API, Web app, and Patient Portal
- Static asset caching
- WebSocket support for telemedicine

### PostgreSQL

```yaml
postgres:
  image: postgres:16-alpine
  volumes:
    - postgres_data:/var/lib/postgresql/data
  environment:
    POSTGRES_DB: tpt_doctor
    POSTGRES_USER: tpt
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  deploy:
    resources:
      limits:
        memory: 4G
```

### Redis

```yaml
redis:
  image: redis:7-alpine
  volumes:
    - redis_data:/data
  command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
```

### MinIO (S3-compatible Storage)

```yaml
minio:
  image: minio/minio:latest
  volumes:
    - minio_data:/data
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
    MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
```

### Jitsi Meet (Telemedicine)

```yaml
jitsi:
  image: jitsi/web:latest
  ports:
    - "4443:443"
  environment:
    JITSI_DOMAIN: ${JITSI_DOMAIN}
    ENABLE_AUTH: 1
    TURN_CREDENTIALS: ${TURN_CREDENTIALS}
```

## Backup & Restore

### Automated Backup (pgBackRest)

```bash
# Configure pgBackRest
sudo apt install pgbackrest

# Configure backup schedule (daily at 2 AM)
0 2 * * * pgbackrest --stanza=tpt backup --type=full

# Verify backups
pgbackrest --stanza=tpt check
```

### Manual Backup

```bash
# Database backup
docker compose exec postgres pg_dump -U tpt tpt_doctor > backup_$(date +%Y%m%d).sql

# File storage backup
docker compose exec minio mc mirror /data /backup/minio

# Redis backup
docker compose exec redis redis-cli SAVE
cp /var/lib/docker/volumes/tpt_redis_data/_data/dump.rdb backup_redis.rdb
```

### Restore

```bash
# Database restore
cat backup.sql | docker compose exec -T postgres psql -U tpt tpt_doctor

# File storage restore
docker compose exec minio mc mirror /backup/minio /data
```

## Monitoring

### Prometheus Metrics

Enable Prometheus metrics in your environment:

```env
PROMETHEUS_ENABLED=true
METRICS_PORT=9464
```

### Grafana Dashboards

1. Access Grafana at `https://your-domain.com/grafana`
2. Login with default credentials (change immediately)
3. Add Prometheus data source
4. Import provided dashboards from `infrastructure/monitoring/grafana-dashboards/`

### Alerting

Alert rules configured in `infrastructure/monitoring/alerting-rules.yml`:
- API availability checks every 30 seconds
- Database connection monitoring
- Disk space alerts at 80% and 90%
- Memory usage monitoring
- Certificate expiry notifications

## Security Hardening

### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (redirect)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3478/udp  # TURN/STUN (Jitsi)
sudo ufw enable
```

### TLS Configuration

```bash
# Auto-configure Let's Encrypt certificates
docker compose exec nginx certbot --nginx -d your-domain.com

# Certificate auto-renewal (cron)
0 3 * * * docker compose exec nginx certbot renew
```

### Database Encryption

```bash
# Enable PostgreSQL TDE or use encrypted filesystem
# LUKS encryption for /var/lib/docker/volumes
sudo cryptsetup luksFormat /dev/sdb1
sudo cryptsetup luksOpen /dev/sdb1 encrypted-vol
sudo mkfs.ext4 /dev/mapper/encrypted-vol
sudo mount /dev/mapper/encrypted-vol /var/lib/docker/volumes
```

## Maintenance

### Updating the Stack

```bash
# Pull latest images
docker compose -f docker-compose.production.yml pull

# Recreate containers with new images
docker compose -f docker-compose.production.yml up -d --force-recreate

# Run new migrations if any
docker compose exec api pnpm run db:migrate

# Verify health
curl https://your-domain.com/api/v1/health
```

### Log Management

```bash
# View API logs
docker compose logs -f api

# View Nginx access logs
docker compose logs -f nginx

# Log rotation (configured in docker-compose)
# Logs are rotated daily with 30-day retention
```

### Performance Tuning

| Component | Recommendation |
|-----------|---------------|
| PostgreSQL | shared_buffers = 1GB, effective_cache_size = 3GB |
| Redis | maxmemory 2GB, maxmemory-policy allkeys-lru |
| Nginx | worker_processes auto, worker_connections 4096 |
| Node.js | NODE_OPTIONS="--max-old-space-size=2048" |

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Container won't start | Check logs: `docker compose logs <service>` |
| Database connection refused | Verify POSTGRES_USER/PASSWORD in .env |
| MinIO access denied | Check MINIO_ACCESS_KEY / MINIO_SECRET_KEY |
| TLS certificate error | Run certbot renew, check DNS propagation |
| High memory usage | Adjust Node.js memory limits, check for memory leaks |
| Jitsi connection failure | Verify TURN server configuration, firewall rules |

### Support

- **Email:** support@tptdoctor.com
- **Documentation:** docs.tptdoctor.com
- **Issue Tracker:** github.com/your-org/tpt-doctor/issues