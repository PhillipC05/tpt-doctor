# TPT Doctor — Cloud Deployment Guide

## Overview

TPT Doctor supports deployment on AWS, Azure, and GCP. This guide covers infrastructure provisioning, application deployment, and configuration.

## Prerequisites

- Terraform 1.5+
- Docker & Docker Compose
- pnpm 9+
- Node.js 20+
- Cloud provider CLI (AWS CLI, Azure CLI, or gcloud)
- Auth0 tenant (production or development)

## AWS Deployment

### Infrastructure Provisioning

```bash
# Initialize Terraform
cd infrastructure/cloud/aws
terraform init

# Review plan
terraform plan -var-file="environments/prod.tfvars"

# Apply infrastructure
terraform apply -var-file="environments/prod.tfvars"
```

This provisions:
- VPC with public/private subnets across 3 AZs
- ECS Fargate cluster with auto-scaling
- RDS PostgreSQL 16 (Multi-AZ, encrypted)
- ElastiCache Redis 7 (Multi-AZ with auto-failover)
- S3 buckets with KMS encryption
- Application Load Balancer with WAF
- Route53 DNS records
- ECR repositories for container images

### CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/deploy-aws.yml`):

1. **Build & Test:** Run linting, type checking, and unit tests
2. **Docker Build:** Build and push images to ECR
3. **Immutable Tags:** Images tagged with git commit SHA
4. **Deploy:** Update ECS service with new task definition
5. **Health Check:** Verify deployment via health endpoint

### Environment Configuration

```bash
# Set up environment variables
cp .env.production.example .env.production
# Edit with your values:
# - DATABASE_URL (RDS endpoint)
# - REDIS_URL (ElastiCache endpoint)
# - AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_AUDIENCE
# - ENCRYPTION_MASTER_KEY (see key generation below)
# - STORAGE_* (S3 bucket configuration)
# - STRIPE_* / AIRWALLEX_* (payment gateway keys)
```

### Generating Encryption Keys

```bash
# Generate a 256-bit master encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Azure Deployment

### Infrastructure Provisioning

```bash
cd infrastructure/cloud/azure
terraform init
terraform plan -var-file="environments/prod.tfvars"
terraform apply -var-file="environments/prod.tfvars"
```

This provisions:
- AKS cluster + App Service (dual option)
- Azure SQL Database (TDE encrypted, geo-redundant)
- Azure Cache for Redis (Premium with persistence)
- Blob Storage with KMS encryption
- Azure Key Vault with RBAC
- Front Door + WAF

### Application Deployment

1. Build container images
2. Push to Azure Container Registry
3. Deploy to AKS with `kubectl apply -f k8s/`
4. Or deploy to App Service via GitHub Actions

## GCP Deployment

### Infrastructure Provisioning

```bash
cd infrastructure/cloud/gcp
terraform init
terraform plan -var-file="environments/prod.tfvars"
terraform apply -var-file="environments/prod.tfvars"
```

This provisions:
- Cloud Run services (serverless)
- Cloud SQL PostgreSQL 16 (IAM auth)
- Memorystore Redis 7 (HA)
- Cloud Storage with KMS encryption
- Cloud KMS (automatic key rotation)
- Cloud Armor WAF

### Application Deployment

```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/$PROJECT_ID/tpt-api

# Deploy to Cloud Run
gcloud run deploy tpt-api \
  --image gcr.io/$PROJECT_ID/tpt-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

## DNS Configuration

### Route53 (AWS)
```
Type: A Alias
Name: api.tptdoctor.com
Alias Target: [ALB DNS Name]
```

### Custom Domain (Azure/GCP)
Configure custom domain in Front Door / Cloud Armor pointing to your service endpoint.

## SSL/TLS

- **AWS:** ACM certificate auto-provisioned via Terraform
- **Azure:** Front Door manages TLS termination
- **GCP:** Cloud Run provides managed TLS certificates
- **Auto-renewal:** All platforms support automatic certificate renewal

## Monitoring Setup

### Prometheus & Grafana
```bash
# Deploy monitoring stack
cd infrastructure/monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Access Grafana at http://localhost:3000
# Default credentials: admin/admin
```

### Sentry
```bash
# Configure Sentry DSN in environment
SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

## Backup & Disaster Recovery

### Database Backups
- **RDS:** Automated daily backups with 35-day retention
- **Azure SQL:** Geo-redundant backup storage
- **Cloud SQL:** Automated backups with PITR

### Disaster Recovery Plan
1. **RTO:** 4 hours
2. **RPO:** 1 hour
3. **Multi-region:** Active-passive configuration
4. **Failover:** Automated health check triggers failover
5. **Restore:** Point-in-time recovery for database

## Scaling

### Auto-scaling Configuration

| Metric | Target | Scale Out | Scale In |
|--------|--------|-----------|----------|
| CPU Utilization | 70% | +2 tasks | -1 task |
| Memory Utilization | 80% | +2 tasks | -1 task |
| Request Count | 1000/min/task | +1 task | Pending |

### Database Scaling
- **Read replicas:** Add replicas for read-heavy workloads
- **Connection pooling:** PgBouncer configured for efficient connections
- **Vertical scaling:** Increase instance size as needed (minimal downtime)

## Security Hardening

### Network Security
1. Private subnets for all application and database services
2. NAT Gateway for outbound internet access from private subnets
3. Security groups restrict traffic to necessary ports only
4. WAF with OWASP top 10 rules enabled

### Data Security
1. All data encrypted at rest (AES-256 via KMS)
2. TLS 1.2+ for all data in transit
3. Column-level encryption for PHI fields
4. Immutable audit logging with tamper detection

### Access Control
1. IAM roles with least privilege principle
2. Secrets rotation via KMS / Key Vault
3. MFA required for all management access
4. Audit logging for all infrastructure changes