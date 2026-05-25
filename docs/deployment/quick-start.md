# TPT Doctor — Quick Start Guide

> Get TPT Doctor running in under 5 minutes for evaluation or small clinic use.

---

## Option 1: Docker Compose (Easiest — Single Server)

This is the recommended way to try TPT Doctor or deploy for a single clinic.

### Step 1: Prerequisites

- [Docker](https://docs.docker.com/get-docker/) Engine 24+ and Docker Compose 2.20+
- A domain name pointing to your server (or use `localhost` for testing)
- [Auth0](https://auth0.com/signup) free account

### Step 2: Clone and configure

```bash
git clone https://github.com/PhillipC05/tpt-doctor.git
cd tpt-doctor

# Copy the production environment template
cp .env.production.example .env

# Edit .env with your settings
# Minimum you need to change:
#   - AUTH0_* values
#   - ENCRYPTION_MASTER_KEY (generate with the command below)
#   - DATABASE_URL password
#   - REDIS_PASSWORD

# Generate an encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Deploy

```bash
# Start all services
docker compose -f infrastructure/on-premise/docker-compose.production.yml up -d

# Run database migrations
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec api pnpm run db:migrate

# Seed demo data (optional)
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec api pnpm run db:seed
```

### Step 4: Access

| Service | URL |
|---------|-----|
| Web App (Staff) | `https://your-domain.com` |
| Patient Portal | `https://your-domain.com/portal` |
| API Health | `https://your-domain.com/api/v1/health` |
| Grafana | `https://your-domain.com/grafana` |
| MinIO Console | `https://your-domain.com:9001` |

---

## Option 2: Development Mode (For Evaluation)

Run locally without a domain name:

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/installation) 9+
- [Docker](https://docs.docker.com/get-docker/) (for PostgreSQL, Redis, MinIO)
- [Auth0](https://auth0.com/signup) free account

### Setup

```bash
# 1. Clone and install dependencies
git clone https://github.com/PhillipC05/tpt-doctor.git
cd tpt-doctor
pnpm install

# 2. Configure Auth0 in .env.development
#    See README.md for full Auth0 setup instructions

# 3. Start database services
docker compose up -d

# 4. Run migrations and seed
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed

# 5. Start development servers
pnpm run dev
```

### Access (Development)

| Service | URL |
|---------|-----|
| API | http://localhost:4000/api/v1 |
| Swagger Docs | http://localhost:4000/api/docs |
| Web App | http://localhost:5173 |
| Patient Portal | http://localhost:5174 |

---

## Option 3: One-Click Deploy (DigitalOcean)

Deploy directly from GitHub to DigitalOcean App Platform — no server management needed:

1. Fork the repo to your GitHub account
2. Go to [cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps) → **Create App**
3. Connect your GitHub repo
4. DigitalOcean auto-detects the Dockerfiles and builds everything

Full guide: [digitalocean.md](digitalocean.md)

### Other Cloud Providers

Terraform configurations are provided for AWS, Azure, and GCP if needed.

See: [cloud/deployment-guide.md](cloud/deployment-guide.md)

---

## Required Setup: Auth0

TPT Doctor uses Auth0 for authentication. You need a free Auth0 account:

1. Go to [https://auth0.com/signup](https://auth0.com/signup) and create an account
2. Create a tenant (e.g., `my-clinic`)
3. Go to **Applications → APIs → Create API**:
   - Name: `TPT Doctor API`
   - Identifier: `https://api.tptdoctor.com`
4. Go to **Applications → Create Application → Single Page Application**:
   - Name: `TPT Doctor Web`
   - Note the **Client ID**
5. Go to **Applications → Create Application → Regular Web Application**:
   - Name: `TPT Doctor API`
   - Note the **Client ID** and **Client Secret**
6. In your TPT Doctor app settings:
   - Under the Regular Web Application settings, go to **Settings** and add under **Allowed Callback URLs**: `http://localhost:4000/api/v1/auth/callback`
   - Under the Single Page Application settings, add:
     - **Allowed Callback URLs**: `http://localhost:5173`, `http://localhost:5174`
     - **Allowed Logout URLs**: `http://localhost:5173`, `http://localhost:5174`
     - **Allowed Web Origins**: `http://localhost:5173`, `http://localhost:5174`

---

## Configuration Reference

### Essential Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH0_DOMAIN` | ✅ | Your Auth0 tenant domain |
| `AUTH0_AUDIENCE` | ✅ | API identifier (https://api.tptdoctor.com) |
| `AUTH0_CLIENT_ID` | ✅ | Regular Web Application client ID |
| `AUTH0_CLIENT_SECRET` | ✅ | Regular Web Application client secret |
| `AUTH0_WEB_CLIENT_ID` | ✅ | Single Page Application client ID |
| `ENCRYPTION_MASTER_KEY` | ✅ | 64-char hex key (256-bit) |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_PASSWORD` | ✅ | Redis password |

### Optional Integrations

| Variable | Service | Purpose |
|----------|---------|---------|
| `STRIPE_SECRET_KEY` | Stripe | Payment processing |
| `TWILIO_ACCOUNT_SID` | Twilio | SMS notifications |
| `SENTRY_DSN` | Sentry | Error tracking |

---

## Updating

```bash
cd /opt/tpt-doctor

# Pull latest code
git pull

# Rebuild and restart
docker compose -f infrastructure/on-premise/docker-compose.production.yml down
docker compose -f infrastructure/on-premise/docker-compose.production.yml pull
docker compose -f infrastructure/on-premise/docker-compose.production.yml up -d

# Run new migrations
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec api pnpm run db:migrate
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **API won't start** | Check `.env` has valid `ENCRYPTION_MASTER_KEY` (64 hex chars) and valid Auth0 values |
| **Database connection fails** | Ensure PostgreSQL is running and `DATABASE_URL` is correct |
| **Auth0 login doesn't work** | Verify callback URLs in Auth0 dashboard match your app URLs |
| **Blank page in web app** | Check browser console for CORS errors — verify `VITE_API_URL` matches API address |
| **Telemedicine not working** | Ensure port 443 and 3478/udp are open in your firewall |

---

## Need Help?

- **Documentation:** `docs/` directory contains full guides
- **Issues:** [GitHub Issues](https://github.com/PhillipC05/tpt-doctor/issues)

---

## What's Next?

- [Cloud Deployment Guide](cloud/deployment-guide.md) — Production-grade cloud setup
- [On-Premise Guide](on-premise/on-premise-guide.md) — Full on-premise configuration
- [Admin Guide](../admin-guide/admin-guide.md) — Managing users, roles, settings
- [Security Policies](../security/security-policies.md) — Security hardening