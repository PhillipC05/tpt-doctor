# TPT Doctor — Complete Medical Practice Platform

> **Open-source, HIPAA-compliant, multi-country medical practice management platform.**  
> Manage patients, appointments, EHR, billing, prescriptions, lab orders, telemedicine, and more — all in one system.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](package.json)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9-orange)](package.json)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](docker-compose.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](tsconfig.base.json)

---

## Features

| Module | What it does |
|--------|--------------|
| **Patient Management** | Registration, demographics, insurance, search, merge, consent management |
| **Electronic Health Records** | SOAP notes, vitals, medical history, problem lists, clinical timeline, document upload |
| **Appointment Scheduling** | Calendar (day/week/month), booking, recurring, waitlist, reminders, check-in/out |
| **Staff Management** | Roles, permissions, schedules, PTO, credentialing, performance metrics |
| **Patient Portal** | Self-service login, medical records, lab results, appointment requests, messaging |
| **Secure Messaging** | Inbox/outbox, threading, file attachments, read receipts, urgent flags |
| **Billing & Invoicing** | Invoices, insurance claims, payment processing (Stripe/Airwallex), ERA/EOB, aging reports |
| **Prescriptions** | ePrescribing, drug interactions, controlled substances (DEA), pharmacy directory |
| **Lab Orders** | Order creation, specimen tracking, result entry, abnormal alerts, FHIR import |
| **Telemedicine** | Video consults (WebRTC/Jitsi), waiting room, screen sharing, in-consult chat, recording |
| **Reporting** | KPIs, clinical quality, financial, demographics, ad-hoc builder, export (CSV/JSON/PDF) |
| **Compliance** | HIPAA, GDPR, Australia Privacy Act, NZ HISO, SOC2 — audit logging, encryption, breach notification |
| **Multi-Country** | Australia (MBS/PBS/MHR), New Zealand (MOH/PHO/NHI), UK (NHS/GP Connect), Canada (provincial) |
| **FHIR R4 API** | Patient, Observation, MedicationRequest, Appointment, Encounter, Bulk FHIR export |
| **Business Intelligence** | Revenue analytics, appointment utilization, clinician productivity, demographics, referral analytics |
| **Inventory** | Clinic supplies, vaccine cold chain, medication samples, retail product sales |

---

## Quick Start (5 minutes)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/) (v2.20+)
- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/installation) 9+
- [Auth0](https://auth0.com/signup) account (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/PhillipC05/tpt-doctor.git
cd tpt-doctor
pnpm install
```

### 2. Configure authentication

1. Go to [Auth0 Dashboard](https://manage.auth0.com) → Create tenant
2. Create an **API** with identifier `https://api.tptdoctor.com`
3. Create a **Single Page Application** for the web app (note the Client ID)
4. Create a **Regular Web Application** for the API (note the Client ID & Secret)

Edit `.env.development`:
```bash
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your-api-client-id
AUTH0_CLIENT_SECRET=your-api-client-secret
AUTH0_AUDIENCE=https://api.tptdoctor.com
```

For the web app (`apps/web/.env.development`):
```bash
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-web-client-id
VITE_AUTH0_AUDIENCE=https://api.tptdoctor.com
VITE_API_URL=http://localhost:4000
```

### 3. Start the database

```bash
docker compose up -d
```

### 4. Run database migrations and seed

```bash
pnpm run db:generate
pnpm run db:migrate
pnpm run db:seed
```

### 5. Start development servers

```bash
pnpm run dev
```

- **API:** http://localhost:4000/api/v1
- **Swagger Docs:** http://localhost:4000/api/docs
- **Web App:** http://localhost:5173
- **Patient Portal:** http://localhost:5174

---

## Deployment Options

### 🐳 Docker Compose (Self-Hosted — Recommended)

The simplest way to deploy for any single clinic on any VPS:

```bash
cp .env.production.example .env
# Edit .env with your values
docker compose -f infrastructure/on-premise/docker-compose.production.yml up -d
```

Works on any Linux VPS — see guide: [docs/deployment/simple-vps.md](docs/deployment/simple-vps.md)

### 🚀 DigitalOcean

Two options — App Platform (no server management) or Droplet (full VPS):

```bash
# App Platform: Connect your GitHub repo → auto-deploys via Dockerfile
# Droplet: Full Docker Compose stack with monitoring, storage, telemedicine
```

Full guide: [docs/deployment/digitalocean.md](docs/deployment/digitalocean.md)

### 📦 Any VPS (Linode, Vultr, Hetzner, etc.)

```bash
# Works on any Ubuntu VPS — just install Docker and run:
curl -fsSL https://get.docker.com | sh
docker compose -f infrastructure/on-premise/docker-compose.production.yml up -d
```

Full guide: [docs/deployment/simple-vps.md](docs/deployment/simple-vps.md)

### 🤖 Automated (Ansible)

For bare metal or VM on-premise deployment with full automation:

```bash
ansible-playbook -i infrastructure/ansible/inventory/hosts.yml infrastructure/ansible/deploy.yml
```

### ☁️ Cloud Providers (AWS / Azure / GCP)

Terraform configurations also available for larger deployments:

| Cloud | Guide | Terraform |
|-------|-------|-----------|
| AWS | [docs/deployment/cloud/deployment-guide.md](docs/deployment/cloud/deployment-guide.md) | [infrastructure/cloud/aws/](infrastructure/cloud/aws/) |
| Azure | Same guide | [infrastructure/cloud/azure/](infrastructure/cloud/azure/) |
| GCP | Same guide | [infrastructure/cloud/gcp/](infrastructure/cloud/gcp/) |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Nginx (TLS termination)                │
├────────────────────┬──────────────────┬─────────────────┤
│  Web App (React)   │ Patient Portal   │  API (NestJS)   │
│  :3000             │ :3001            │  :4000           │
├────────────────────┴──────────────────┴─────────────────┤
│  PostgreSQL 16  │  Redis 7  │  MinIO (S3)  │  Jitsi    │
│  (encrypted)     │  (cache)  │  (storage)   │  (video)  │
└──────────────────────────────────────────────────────────┘
```

See [docs/architecture/overview.md](docs/architecture/overview.md) for the full C4 model.

---

## Project Structure

```
tpt-doctor/
├── apps/
│   ├── api/                    # NestJS backend (REST API)
│   ├── web/                    # React staff frontend
│   └── patient-portal/         # React patient frontend
├── packages/
│   ├── shared/                 # Types, validators, constants
│   ├── auth/                   # Authentication & RBAC
│   ├── encryption/             # PHI encryption (AES-256-GCM)
│   ├── audit-log/              # Immutable audit trail
│   ├── compliance/             # HIPAA/GDPR/Privacy compliance
│   ├── config/                 # Shared configuration
│   ├── database/               # Prisma schema + migrations
│   └── notifications/          # Notification system
├── infrastructure/
│   ├── cloud/{aws,azure,gcp}/  # Terraform configurations
│   ├── on-premise/             # Docker Compose + backups
│   ├── ansible/                # Automated deployment
│   └── monitoring/             # Prometheus + Grafana
├── docs/                       # Full documentation
├── docker/                     # Docker config files
├── LICENSE                     # MIT License
└── README.md                   # This file
```

---

## Documentation

| Document | Type | Description |
|----------|------|-------------|
| [Quick Start](docs/deployment/quick-start.md) | Guide | Get started in 5 minutes |
| [Architecture Overview](docs/architecture/overview.md) | Technical | C4 model diagrams and system design |
| [Auth0 Setup](docs/auth-setup.md) | Guide | Step-by-step authentication setup |
| [System Requirements](docs/requirements.md) | Reference | Hardware, software, network requirements |

### User Manuals

| Document | Description |
|----------|-------------|
| [Clinical Staff Guide](docs/user-manual/clinical-staff-guide.md) | Day-to-day operations for doctors, nurses, receptionists |
| [Patient Portal Guide](docs/patient-portal/patient-guide.md) | Self-service guide for patients |
| [Admin Guide](docs/admin-guide/admin-guide.md) | System administration and tenant management |

### Deployment & Operations

| Document | Description |
|----------|-------------|
| [Quick Start (5 min)](docs/deployment/quick-start.md) | Fastest way to get running |
| [Self-Hosted (Docker)](docs/deployment/on-premise/on-premise-guide.md) | Full on-premise Docker Compose stack |
| [DigitalOcean](docs/deployment/digitalocean.md) | Deploy on DigitalOcean (App Platform or Droplet) |
| [Any VPS (Linode, Vultr, etc.)](docs/deployment/simple-vps.md) | Generic VPS deployment guide |
| [Cloud (AWS/Azure/GCP)](docs/deployment/cloud/deployment-guide.md) | Terraform-based cloud deployment |
| [Upgrade Guide](docs/upgrade-guide.md) | How to upgrade between versions |

### Security & Compliance

| Document | Description |
|-------------|-------------|
| [Security Hardening Checklist](docs/security/hardening-checklist.md) | Pre-flight security checklist |
| [Security Policies](docs/security/security-policies.md) | Comprehensive security policies |
| [Compliance Manual](docs/compliance/compliance-manual.md) | HIPAA/GDPR/AU/NZ/SOC2 compliance |
| [Disaster Recovery](docs/security/disaster-recovery-plan.md) | Backup and restore procedures |

### Configuration & Integrations

| Document | Description |
|----------|-------------|
| [Auth0 Setup](docs/auth-setup.md) | Authentication configuration |
| [Telemedicine Setup](docs/telemedicine-setup.md) | Jitsi and Twilio Video setup |
| [Integrations](docs/integrations.md) | Stripe, Twilio, SendGrid, and more |
| [API Reference](docs/api/swagger-overview.md) | OpenAPI/Swagger documentation |

### Troubleshooting

| Document | Description |
|----------|-------------|
| [Troubleshooting FAQ](docs/troubleshooting.md) | Common issues and solutions |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | NestJS, TypeScript, Prisma ORM |
| **Frontend** | React 18, Vite, TailwindCSS, Zustand |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Auth** | Auth0 (OAuth2/OIDC, JWT, MFA) |
| **Encryption** | AES-256-GCM, envelope encryption, KMS (multi-cloud) |
| **Storage** | S3-compatible (MinIO for self-hosted) |
| **Telemedicine** | WebRTC, Jitsi Meet, Socket.io |
| **Monitoring** | Prometheus, Grafana, Sentry |
| **Infrastructure** | Terraform, Ansible, Docker Compose |
| **Testing** | Jest, Playwright, k6 |

---

## Contributing

TPT Doctor is **MIT licensed** — contributions are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

Please ensure tests pass: `pnpm run test`

---

## License

[MIT License](LICENSE) — feel free to use, modify, and distribute.