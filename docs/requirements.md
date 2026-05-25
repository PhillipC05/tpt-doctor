# TPT Doctor — System Requirements

> Minimum hardware and software requirements for running TPT Doctor.

---

## Software Requirements

### Development Environment

| Requirement | Version | Notes |
|------------|---------|-------|
| **Node.js** | ≥ 20.0.0 | LTS recommended |
| **pnpm** | ≥ 9.0.0 | Enable via `corepack enable` |
| **Docker Engine** | ≥ 24.0 | For PostgreSQL, Redis, MinIO |
| **Docker Compose** | ≥ 2.20 | Included with Docker Desktop |
| **Git** | ≥ 2.30 | For version control |
| **PostgreSQL** | 16 (via Docker) | Local install not required |
| **Redis** | 7 (via Docker) | Local install not required |

### Production Environment (Self-Hosted)

| Requirement | Version | Notes |
|------------|---------|-------|
| **OS** | Ubuntu 24.04 LTS | Recommended — also works on Debian 12, RHEL 9 |
| **Docker Engine** | ≥ 24.0 | |
| **Docker Compose** | ≥ 2.20 | Docker Compose plugin |
| **PostgreSQL** | 16 | Via Docker container |
| **Redis** | 7 | Via Docker container |
| **Nginx** | 1.25+ | Via Docker container |
| **OpenSSL** | ≥ 3.0 | For certificate generation |
| **curl** | Any | For health checks |

### DigitalOcean App Platform

| Requirement | Notes |
|------------|-------|
| **Dockerfiles** | Already provided in `apps/api/Dockerfile`, `apps/web/Dockerfile`, `apps/patient-portal/Dockerfile` |
| **Managed PostgreSQL** | $12-15/mo |
| **Managed Redis** | $12-15/mo |
| **Auth0** | Free tier is sufficient |

---

## Hardware Requirements

### Minimum (Development / Small Practice)

| Component | Requirement |
|-----------|------------|
| **CPU** | 2 cores |
| **RAM** | 4 GB |
| **Storage** | 20 GB SSD (plus space for patient documents) |
| **Network** | Broadband internet |

This is sufficient for:
- Running all 3 Docker containers (Postgres, Redis, MinIO)
- Running the API server
- Running one frontend app
- 1-5 concurrent users

### Recommended (Production — Single Clinic)

| Component | Requirement |
|-----------|------------|
| **CPU** | 4 cores |
| **RAM** | 8 GB |
| **Storage** | 50 GB SSD (plus additional for PHI documents) |
| **Network** | 100 Mbps with static public IP |

This is sufficient for:
- Full Docker Compose stack (Postgres, Redis, MinIO, Jitsi, Prometheus, Grafana)
- API, web app, and patient portal
- 10-30 concurrent users
- Telemedicine (Jitsi)

### Production — High Volume (Multiple Clinics)

| Component | Requirement |
|-----------|------------|
| **CPU** | 8+ cores |
| **RAM** | 16+ GB |
| **Storage** | 100+ GB SSD |
| **Network** | 1 Gbps |

For multi-tenant SaaS deployment or large clinics with 50+ concurrent users.

---

## Network Requirements

### Ports

| Port | Protocol | Service | Required | Notes |
|------|----------|---------|----------|-------|
| 22 | TCP | SSH | ✅ | Server management |
| 80 | TCP | HTTP | ✅ | Redirects to HTTPS |
| 443 | TCP | HTTPS | ✅ | Web app, API, patient portal |
| 3478 | UDP | TURN/STUN | ✅ | Telemedicine (Jitsi) |
| 4000 | TCP | API | Docker internal only | |
| 5432 | TCP | PostgreSQL | ⚠️ Docker internal | Use SSH tunnel for remote access |
| 6379 | TCP | Redis | ⚠️ Docker internal | |
| 9000 | TCP | MinIO API | ⚠️ Docker internal | |
| 9001 | TCP | MinIO Console | Optional | Admin UI |
| 9090 | TCP | Prometheus | ⚠️ Docker internal | |
| 3000 | TCP | Grafana | Optional | Monitoring dashboard |

### Firewall Rules

```bash
# Minimum required (any VPS)
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw allow 3478/udp   # Telemedicine
ufw enable
```

### DNS Configuration

| Record | Type | Value | Example |
|--------|------|-------|---------|
| `clinic.your-domain.com` | A | Server IP | `192.0.2.1` |
| `portal.your-domain.com` | A | Server IP | `192.0.2.1` |
| `meet.your-domain.com` | A | Server IP | `192.0.2.1` |

---

## Storage Estimates

| Data Type | Monthly Growth (small clinic) | Monthly Growth (large clinic) |
|-----------|------------------------------|------------------------------|
| Database (patients, appointments, notes) | ~100 MB | ~500 MB |
| Patient documents (scans, PDFs) | ~500 MB | ~5 GB |
| Lab results | ~50 MB | ~300 MB |
| Audit logs | ~200 MB | ~1 GB |
| Backups (encrypted) | ~1 GB | ~10 GB |
| Monitoring data (Prometheus) | ~500 MB | ~2 GB |

**Recommendation:** Start with 50 GB and monitor usage. Set up disk space alerts at 80% and 90%.

---

## Browser Requirements

| Browser | Supported | Notes |
|---------|-----------|-------|
| **Google Chrome** | ✅ Latest 2 versions | Recommended |
| **Mozilla Firefox** | ✅ Latest 2 versions | |
| **Microsoft Edge** | ✅ Latest 2 versions | Chromium-based |
| **Safari** | ✅ Latest 2 versions | macOS/iOS |
| **Internet Explorer** | ❌ Not supported | |

### Telemedicine (WebRTC) Requirements

- Chrome, Firefox, Edge, or Safari (latest)
- Stable internet connection (5 Mbps+ upload/download recommended)
- Camera and microphone
- WebRTC support enabled in browser

---

## External Service Requirements

| Service | Required | Cost | Purpose |
|---------|----------|------|---------|
| **Auth0** | ✅ Yes | Free tier (7k users) | Authentication, MFA |
| **SMTP/Email** | ✅ Yes | ~$10-20/mo | Password reset, notifications |
| **Stripe** | Optional | Per-transaction fees | Payment processing |
| **Twilio** | Optional | ~$0.0079/SMS | SMS notifications |
| **Sentry** | Optional | Free tier | Error tracking |
| **Surescripts** | Optional | Contract required | ePrescribing |
| **SendGrid** | Optional | Free tier (100 emails/day) | Email notifications |

---

## Backup Storage Requirements

| Backup Type | Frequency | Retention | Storage Needed (90 days) |
|------------|-----------|-----------|-------------------------|
| Database (encrypted) | Daily | 30 days | ~30 GB |
| Patient documents | Daily | 30 days | ~30 GB |
| Configuration | Daily | 30 days | ~1 GB |
| Full system backup | Weekly | 90 days | ~50 GB |

**Total minimum backup storage:** ~50 GB

---

## Monitoring Stack Resource Usage

| Component | CPU | RAM | Storage |
|-----------|-----|-----|---------|
| Prometheus | 0.5 core | 1 GB | 10 GB (30-day retention) |
| Grafana | 0.2 core | 512 MB | 1 GB |
| Node Exporter | 0.1 core | 128 MB | — |

---

## Checking Your System

```bash
# Check OS version
cat /etc/os-release

# Check CPU
nproc --all

# Check RAM (in GB)
free -g | grep Mem | awk '{print $2}'

# Check disk space
df -h /

# Check Docker version
docker --version
docker compose version

# Check Node.js version
node --version

# Check pnpm version
pnpm --version