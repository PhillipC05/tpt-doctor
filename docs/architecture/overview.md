# TPT Doctor — Architecture Documentation (C4 Model)

## System Context Diagram

TPT Doctor is a cloud-native, HIPAA-compliant medical practice management platform serving multiple user types across web and mobile interfaces.

```
[Patient] --> [Patient Portal Web App]
[Clinician] --> [Clinical Staff Web App]
[Admin] --> [Admin Web App]
[External Systems] --> [API Gateway]
  - Auth0 (Authentication)
  - Stripe/Airwallex (Payments)
  - Surescripts (ePrescribing)
  - Quest/LabCorp (Lab Integration)
  - Twilio (SMS/Notifications)
  - Jitsi (Telemedicine)
```

## Container Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Applications                      │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  Clinical Staff  │  │  Patient Portal │                   │
│  │  (React + Vite)  │  │  (React + Vite) │                   │
│  └────────┬─────────┘  └────────┬─────────┘                   │
│           │                     │                             │
└───────────┼─────────────────────┼─────────────────────────────┘
            │                     │
┌───────────┼─────────────────────┼─────────────────────────────┐
│           ▼                     ▼                             │
│  ┌─────────────────────────────────────────────────────┐     │
│  │              API Gateway (NestJS)                    │     │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │     │
│  │  │Auth  │ │Patient│ │EHR   │ │Appt  │ │Billing│    │     │
│  │  │Module│ │Module │ │Module│ │Module│ │Module │    │     │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘    │     │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │     │
│  │  │Rx    │ │Lab   │ │Staff │ │Msg   │ │Report │    │     │
│  │  │Module│ │Module│ │Module│ │Module│ │Module │    │     │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘    │     │
│  └─────────────────────────────────────────────────────┘     │
│                           │                                   │
└───────────────────────────┼───────────────────────────────────┘
                            │
┌───────────────────────────┼───────────────────────────────────┐
│                           ▼                                   │
│  ┌─────────────────────────────────────────────────────┐     │
│  │              Shared Packages                         │     │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │     │
│  │  │auth  │ │config│ │shared│ │encrypt│ │audit │    │     │
│  │  │      │ │      │ │types │ │ion    │ │-log  │    │     │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘    │     │
│  │  ┌──────────────────────┐ ┌──────────────────┐    │     │
│  │  │  compliance          │ │  database         │    │     │
│  │  │  (HIPAA/GDPR/AU/NZ)  │ │  (Prisma ORM)    │    │     │
│  │  └──────────────────────┘ └──────────────────┘    │     │
│  └─────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼───────────────────────────────────┐
│                           ▼                                   │
│  ┌────────────────────────────────────────────────────┐      │
│  │           Data Stores                               │      │
│  │  ┌────────────┐ ┌──────────┐ ┌────────────┐       │      │
│  │  │ PostgreSQL │ │  Redis   │ │  S3/MinIO  │       │      │
│  │  │ (Primary)  │ │ (Cache)  │ │ (Storage)  │       │      │
│  │  └────────────┘ └──────────┘ └────────────┘       │      │
│  └────────────────────────────────────────────────────┘      │
└───────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Backend | NestJS 10, TypeScript |
| Database | PostgreSQL 16, Prisma ORM |
| Cache | Redis 7 |
| Auth | Auth0 (OAuth2/OIDC) |
| API Docs | Swagger/OpenAPI |
| Encryption | AES-256-GCM envelope encryption |
| Payments | Stripe, Airwallex |
| Telemedicine | WebRTC + Jitsi |
| Monitoring | Prometheus + Grafana |
| Error Tracking | Sentry |
| CI/CD | GitHub Actions |
| IaaC | Terraform (AWS/Azure/GCP) |
| Container | Docker + Docker Compose |

## Key Architecture Decisions

1. **Monorepo with pnpm workspaces** — Enables code sharing across packages while maintaining independent versioning and build pipelines.

2. **Column-level encryption** — PHI fields encrypted with AES-256-GCM using envelope encryption. Multi-cloud KMS support for key management.

3. **Immutable audit trail** — SHA-256 cryptographic chaining ensures tamper detection. Every database mutation is logged.

4. **Multi-tenant isolation** — Row-Level Security (RLS) on PostgreSQL ensures tenant data isolation at the database level.

5. **API-first design** — All functionality exposed via RESTful API with Swagger documentation. Frontend consumes the same API as external integrations.

## Compliance Architecture

- **HIPAA**: Full administrative, physical, technical safeguards implementation
- **GDPR**: Data subject rights, consent management, data portability
- **AU Privacy Act**: 13 Australian Privacy Principles covered
- **NZ HISO**: New Zealand health information standards
- **SOC 2**: Controls mapped to CC1-CC9 criteria