# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the monorepo root unless noted. Requires Node ≥20, pnpm ≥9.

```bash
# Development
pnpm install                          # Install all workspace dependencies
docker-compose up -d                  # Start Postgres, Redis, MinIO
pnpm db:generate                      # Regenerate Prisma client after schema changes
pnpm db:migrate                       # Run pending migrations (dev)
pnpm db:seed                          # Seed demo tenant + users
pnpm dev                              # Run all apps in parallel (API :4000, web :3000, portal :3001)

# Per-app dev (from root)
pnpm --filter @tpt-doctor/api start:dev
pnpm --filter @tpt-doctor/web dev
pnpm --filter @tpt-doctor/patient-portal dev

# Build / Type check / Lint
pnpm build                            # Build all packages and apps
pnpm typecheck                        # tsc --noEmit across all workspaces
pnpm lint                             # ESLint across all workspaces
pnpm format                           # Prettier on all source files

# Tests
pnpm test                             # Jest across all workspaces
pnpm --filter @tpt-doctor/api test:e2e   # NestJS e2e tests
# Run a single test file:
pnpm --filter @tpt-doctor/auth -- jest src/__tests__/auth.test.ts

# Database
pnpm --filter @tpt-doctor/database run migrate:prod   # Deploy migrations (production)
pnpm --filter @tpt-doctor/database run studio         # Prisma Studio GUI
```

Pre-commit hooks run lint, typecheck, and `pnpm audit` via lint-staged — fix these before committing.

## Architecture

### Monorepo Layout

```
apps/
  api/              NestJS REST API (port 4000)
  web/              React admin dashboard (port 3000)
  patient-portal/   React patient-facing app (port 3001)
packages/
  database/         Prisma client + schema + seed + RLS middleware
  auth/             JWT validation, Auth0 integration, RBAC (30+ permissions)
  encryption/       AES-256-GCM envelope encryption, PHI masking, key rotation
  audit-log/        Immutable audit trail with SHA-256 cryptographic chain
  compliance/       HIPAA/GDPR/AU Privacy Act/NZ HISO assessment logic
  config/           dotenv-based config object (isProd, auth0, encryption, etc.)
  shared/           Zod schemas, enums, common TypeScript types
  notifications/    Email/SMS/in-app notification service
infrastructure/
  cloud/            Terraform for AWS, Azure, GCP
  on-premise/       Docker Compose production stack, backup scripts
  ansible/          Automated deployment playbook
  monitoring/       Prometheus + Grafana configs
```

### API (NestJS)

**Entry**: `apps/api/src/main.ts` — sets up Helmet CSP/HSTS, global `ValidationPipe` (whitelist mode), and Swagger at `/api/docs` (dev only). Production startup validates `ENCRYPTION_MASTER_KEY` and Auth0 config.

**Root module** (`app.module.ts`) loads ~25 feature modules and applies:
- `ThrottlerGuard` globally with 4 named profiles: `default` (100/60s), `strict` (10/60s), `auth` (5/60s), `export` (5/300s) — controllers override per-endpoint with `@Throttle()`
- `LoggerMiddleware` and `AuditMiddleware` on all routes

**Module convention** — every feature lives in `src/modules/{feature}/` with four files:
```
{feature}.module.ts       @Module wiring
{feature}.controller.ts   Route handlers + Swagger decorators
{feature}.service.ts       Business logic
{feature}.dto.ts           class-validator DTOs
```

Services hold in-memory state (Map) for some modules (rooms, tasks, notifications) — no Prisma calls in those modules yet. PHI-heavy modules (patients, EHR, billing) use the Prisma client from `@tpt-doctor/database`.

**Authentication** is Auth0-managed. The `JwtAuthGuard` in `src/common/guards/jwt-auth.guard.ts` validates bearer tokens. The `auth.service.ts` stubs (`login`, `requestPasswordReset`, `verifyMfa`) are placeholder implementations that throw — real auth flows use Auth0 Universal Login / SPA SDK.

### Database (`packages/database`)

Prisma 5 + PostgreSQL 16. Schema at `packages/database/prisma/schema.prisma` — 23 models.

**Row-Level Security**: A Prisma middleware in `packages/database/src/index.ts` injects `SET LOCAL app.current_tenant_id = '...'` before each query, enforcing tenant isolation at the DB level. Always pass `tenantId` in Prisma where/data clauses.

**Seed** (`packages/database/src/seed.ts`) creates a `demo-practice` tenant with admin, doctor, nurse, and receptionist users — use these for local development.

### Frontend Apps

Both React apps use the same stack: Vite, React 18, React Query, Auth0, React Router v6, Tailwind CSS, Lucide icons.

**Web app** adds: Zustand stores (`themeStore`, `notificationStore`, `languageStore`), Radix UI primitives, Recharts, Framer Motion, i18next (8 languages including RTL Arabic).

**Patient portal** is intentionally minimal — no charting, no animations, no Radix.

Vite proxies `/api` → `http://localhost:4000` in dev — no CORS config needed locally.

### Encryption

`@tpt-doctor/encryption` uses AES-256-GCM envelope encryption. PHI fields (SSN, DOB, etc.) are encrypted at the application layer before Prisma writes. `maskPhi()` is used in logging to redact sensitive values. Key rotation runs on 90-day intervals with 3-key retention and batch re-encryption (`packages/encryption/src/key-rotation.ts`).

### Compliance

`@tpt-doctor/compliance` contains assessment modules for HIPAA, GDPR, AU Privacy Act, NZ HISO, SOC2, and BAA generation. The audit log (`@tpt-doctor/audit-log`) maintains a SHA-256 cryptographic hash chain — each entry links to `previous_hash`, enabling tamper detection.

### Country Profiles

Country-specific clinical logic (Medicare/MBS for AU, NHS/SNOMED for UK, etc.) lives in `apps/api/src/modules/country-profiles/` and is dynamically loaded per tenant. AU, NZ, UK, and CA profiles are implemented.

## Key Conventions

- **TypeScript strict mode** + `noUncheckedIndexedAccess` + `noImplicitOverride` — no `any` casts without explicit justification
- **Prettier**: single quotes, 100-char line width, trailing commas, LF endings
- **ESLint**: `no-console` warns (only `console.warn/error` allowed), `prefer-const` is an error
- **DTOs use class-validator decorators** — always add `@IsOptional()` before optional fields or TS will report type mismatches when passing DTOs to service methods that expect the full entity type
- **Rate limiting**: always annotate auth-adjacent endpoints with `@Throttle({ default: { limit: N, ttl: M } })` — the global guard defaults to 100/60s
- **Audit logging**: all PHI-touching operations must call `logAuditEvent` from `@tpt-doctor/audit-log`; the `AuditMiddleware` logs HTTP requests but service-level events require explicit calls
