# TPT Doctor — Project Checklist

> Legend: ✅ Done | 🔄 In Progress | ⬜ Not Started

---

## Phase 1.2: Database Backup Strategy (NEW)
- [x] PostgreSQL backup script (pg_dump custom format with compression) — `infrastructure/on-premise/backup/backup.sh`
- [x] AES-256-CBC encryption with PBKDF2 key derivation for PHI compliance — `backup.sh`
- [x] SHA-256 checksum verification — integrity validation before/after encryption
- [x] Backup to MinIO/S3-compatible storage — off-site storage via mc/aws CLI
- [x] 30-day retention with automated cleanup — log rotation and old backup purging
- [x] Restore script with connection termination and decryption — `infrastructure/on-premise/backup/restore.sh`
- [x] Docker Compose scheduled backup service — 2AM/2PM daily via cron in production stack
- [x] Encrypted backup volume for on-premise deployments

---

## Phase 1: Foundation (4-6 weeks) ✅
### 1.1 Project Scaffolding
- [x] Initialize monorepo (pnpm workspaces)
- [x] Configure TypeScript (tsconfig base + per-package)
- [x] Set up ESLint + Prettier
- [x] Configure Jest + Playwright testing
- [x] Create Docker Compose development environment
### 1.2 Database & Prisma
- [x] Design and create Prisma schema (23 models)
- [x] Set up PostgreSQL + Row-Level Security (RLS) — SQL init script with extensions
- [x] Create migrations system (Prisma migrate configured)
- [x] Implement seed scripts (demo tenant, admin, doctor, receptionist)
- [x] Set up database backup strategy — pg_dump custom format, AES-256 encryption, SHA-256 checksums, S3 upload, 30-day retention, scheduled Docker backup service

### 1.3 Authentication & Authorization
- [x] Integrate Auth0 (NestJS + React) — Auth0Provider, verifyAccessToken
- [x] Implement JWT token handling (access + refresh) — JwtAuthGuard, verifyAccessToken
- [x] Create role-based access control (RBAC) system — full service with 30+ permissions
- [x] Build permission matrix (6 tiers) — SUPER_ADMIN, PRACTICE_ADMIN, DOCTOR, NURSE, RECEPTIONIST, PATIENT
- [x] Implement MFA support — Auth0-managed (TOTP/SMS)

### 1.4 Encryption Layer
- [x] Set up envelope encryption (AES-256-GCM) — with PBKDF2 key derivation
- [x] Implement column-level PHI encryption — encrypt/decrypt for SSN, DOB, etc.
- [x] Create KMS integration (multi-cloud) — config for AWS/Azure/GCP/local providers
- [x] Build encryption key rotation system — versioned key manager, auto-rotation at 90-day intervals, legacy fallback, batch re-encryption, 3-key retention — `packages/encryption/src/key-rotation.ts`
- [x] Implement data masking for logs — maskPhi function + PostgreSQL mask_phi()

### 1.5 Audit Logging
- [x] Create immutable audit log schema — SHA-256 cryptographic chain (previous_hash, tamper_hash)
- [x] Implement audit service — logAuditEvent, verifyAuditChain, searchAuditLogs
- [x] Build audit log viewer UI — `apps/web/src/pages/AuditLog.tsx` with DataTable, search, action filter, export
- [x] Set up audit log retention + archival — HIPAA 6-year (2190-day) config, SHA-256 chain-hashed archive files, tamper-proof signing, restore capability, compliance reporting — `packages/audit-log/src/retention.ts`
- [x] Implement tamper detection — PostgreSQL verify_audit_chain() function

### 1.6 Multi-Tenant Infrastructure
- [x] Implement tenant isolation — tenantId on all scoped tables, RLS policies ready
- [x] Create tenant provisioning system — via seed script
- [x] Build tenant configuration management — TenantSettings JSON with business hours, timezone, etc.
- [x] Implement data residency controls — DataRegion (US/EU/AU/NZ), ComplianceFramework
- [x] Create tenant-level backup/restore — `infrastructure/on-premise/backup/backup.sh` and `restore.sh` support tenant-aware pg_dump/restore

### 1.7 Shared Packages
- [x] Build shared types library — enums (24), types (40+ interfaces), constants (15+ config objects)
- [x] Build validation schemas (Zod) — 12 schemas covering all core entities
- [x] Create shared configuration package — multi-env, Auth0, DB, KMS, Stripe, Twilio, etc.
- [x] Build logging infrastructure — Winston-ready config, LoggerMiddleware for HTTP
- [x] Unit tests — validators.test.ts with 20 test cases covering all schemas
- [x] Unit tests — auth (30+ tests: RBAC, permissions, roles, validateAccess)
- [x] Unit tests — encryption (12 tests: encrypt/decrypt, hashForIndexing, maskPhi, generateKey)
- [x] Unit tests — audit-log (15 tests: computeHash, logAuditEvent, verifyAuditChain, searchAuditLogs)
- [x] Unit tests — compliance (15 tests: data retention, consents, compliance frameworks, DSAR)

---

## Phase 2: Core Clinical (6-8 weeks) ✅
### 2.1 Patient Management
- [x] Patient registration/intake — POST /api/v1/patients (Zod validated, audit logged)
- [x] Demographics management — PATCH /api/v1/patients/:id
- [x] Insurance information — nested create in patient creation
- [x] Patient search (advanced) — search by name, email, phone, MRN
- [x] Patient merge/deduplication — POST /patients/merge + /patients/duplicates/search with audit + merge log
- [x] Patient consent management — GET/PATCH /patients/:id/consents/:consentType with audit
- [x] Emergency contact management — JSON field on patient

### 2.2 Electronic Health Records (EHR)
- [x] SOAP notes — POST /api/v1/ehr/encounters (subjective, objective, assessment, plan)
- [x] Structured clinical notes — full CRUD on encounters
- [x] Vitals tracking — JSON vitals field (BP, HR, temp, SpO2, weight, height, BMI)
- [x] Medical history — POST/GET conditions, allergies, immunizations, medications
- [x] Problem list (ICD-10 coded) — nested diagnosis codes on encounters
- [x] Medication list — POST/GET patientMedications with dosages
- [x] Document upload/view (PDF, DICOM, images) — POST/GET/DELETE /patients/:id/documents
- [x] Clinical timeline view — GET /api/v1/ehr/patients/:id/timeline
- [x] EHR templates system — CRUD /ehr/templates with encounter type, category, content
- [x] Clinical decision support rules — CRUD /ehr/decision-rules + evaluate engine (allergy, age, condition, duplicate therapy checks)

### 2.3 Appointment Scheduling
- [x] Calendar view (day/week/month) — GET /api/v1/appointments/calendar?startDate&endDate
- [x] Appointment booking — POST /api/v1/appointments
- [x] Cancel/reschedule — PATCH + DELETE + cancel endpoint
- [x] Recurring appointments — POST /appointments/recurring with frequency/pattern support
- [x] Waitlist management — POST/GET/PATCH/DELETE /appointments/waitlist with notify/book workflow
- [x] Provider availability management — via staff schedules POST :id/schedule
- [x] Appointment types + durations — EncounterType enum
- [x] Override and block times — CRUD /appointments/block-times (practice-wide and per-staff)
- [x] Appointment reminders — POST/GET /appointments/reminders (email/SMS channel support)
- [x] Check-in / check-out workflow — POST /appointments/check-in + POST :id/check-out with wait time tracking

### 2.4 Staff Management
- [x] Staff records CRUD — POST/GET/PATCH staff members with role/permissions
- [x] Role assignment — built into staff creation with getDefaultPermissions()
- [x] Granular permissions per module (CRUD) — 30+ permissions in @tpt-doctor/auth
- [x] Schedule management — POST /api/v1/staff/:id/schedule (dayOfWeek, start/end time)
- [x] PTO tracking — CRUD /staff/time-off with approve/deny workflow
- [x] Credentialing tracking — CRUD /staff/credentials with expiry monitoring
- [x] Staff performance metrics — GET /staff/metrics/performance with appointment stats, cancellation rate, wait times

---

## Phase 3: Patient Facing (4-6 weeks) ✅
### 3.1 Patient Portal
- [x] Secure login (Auth0 + MFA) — @auth0/auth0-react configured
- [x] Dashboard (upcoming appointments, messages)
- [x] View medical records (filtered)
- [x] View lab results
- [x] Request/cancel appointments — modal form with date/time picker
- [x] Secure messaging API — POST/GET inbox/sent/thread
- [x] Compose messages — modal form with subject/body
- [x] Update demographics — profile edit with address/emergency contact
- [x] Consent management — toggle switches with HIPAA privacy notice
### 3.2 Secure Messaging
- [x] Inbox/outbox system — GET /api/v1/messages/inbox, GET /api/v1/messages/sent
- [x] Message threading — GET /api/v1/messages/thread/:id
- [x] File attachments — JSON attachments field (encrypted S3 keys)
- [x] Read receipts — PATCH /api/v1/messages/:id/read with readAt timestamp
- [x] Message templates — CRUD /api/v1/message-templates with render endpoint
- [x] Urgent message flagging — isUrgent boolean on send
- [x] Audit logging — all sent/received messages logged via audit middleware

---

## Phase 4: Billing & Prescriptions (6-8 weeks) ✅
### 4.1 Billing & Invoicing
- [x] Invoice creation — POST /api/v1/billing/invoices with line items
- [x] Insurance claim creation — POST /api/v1/billing/claims
- [x] Payment processing — POST /api/v1/billing/payments with balance tracking
- [x] Invoice/claim listing — GET with filters (status, patient, pagination)
- [x] CPT/ICD-10 code integration — POST/GET /api/v1/billing/cpt-codes and /api/v1/billing/icd10-codes
- [x] Insurance verification — POST /api/v1/billing/insurance-verification with eligibility tracking
- [x] Claim generation (837 format) — POST /api/v1/billing/claims/submit with 837 structure
- [x] ERA/EOB processing — POST /api/v1/billing/era + GET /api/v1/billing/era/:claimId
- [x] Patient billing statements — POST /api/v1/billing/statements/generate/:patientId
- [x] Payment processing (Stripe) — POST /api/v1/billing/payments/provider
- [x] Payment processing (Airwallex) — POST /api/v1/billing/payments/provider
- [x] Copay tracking — POST/GET /api/v1/billing/copay
- [x] HSA/FSA support — POST/GET /api/v1/billing/hsa-fsa
- [x] Aging reports — POST /api/v1/billing/aging-reports/generate + GET
- [x] Write-off management — POST/GET /api/v1/billing/write-offs
- [x] Refund processing — POST/GET /api/v1/billing/refunds

### 4.2 Prescription Management
- [x] Prescription creation — POST /api/v1/prescriptions with dosage, refills, DAW
- [x] Status lifecycle — PATCH :id/status (DRAFT → SUBMITTED → FILLED → CANCELLED → EXPIRED)
- [x] Active prescriptions query — GET /api/v1/prescriptions/active/:patientId
- [x] Prescription history — GET with filters (patientId, status, pagination)
- [x] ePrescribing integration (Surescripts) — POST /api/v1/prescriptions/:id/send-to-pharmacy
- [x] Drug interaction checker — GET /api/v1/prescriptions/interactions/check/:patientId + check-drugs
- [x] Controlled substance tracking (DEA compliance) — POST/GET /api/v1/prescriptions/controlled-substances
- [x] Pharmacy directory — POST/GET /api/v1/prescriptions/pharmacies

### 4.3 Lab Orders & Results
- [x] Lab order creation — POST /api/v1/lab/orders (LOINC coded)
- [x] Specimen tracking — status updates (ORDERED → COLLECTED → IN_TRANSIT → IN_PROGRESS → COMPLETED)
- [x] Result entry — PATCH :id/result with value, unit, reference range, abnormal flag
- [x] Abnormal result alerts — GET /api/v1/lab/orders/abnormal
- [x] Pending results dashboard — GET /api/v1/lab/orders/pending
- [x] HL7 FHIR result import — POST /api/v1/lab/fhir-import with FHIR Observation mapping
- [x] Lab panel configuration — POST/GET /api/v1/lab/panels
- [x] Integration with major labs (Quest, LabCorp) — POST/GET /api/v1/lab/external-config with sync

---

## Phase 5: Telemedicine (3-4 weeks) ✅
- [x] Video consultation (WebRTC) — Socket.io signaling for WebRTC peer connection
- [x] Virtual waiting room — IN_WAITING_ROOM status + real-time status events
- [x] Screen sharing — Screen share start/stop events via WebSocket
- [x] In-consult chat — TelemedicineChatMessage model + real-time messaging via WebSocket
- [x] Consultation recording (with consent) — recordingConsent + isRecorded toggle via API
- [x] Bandwidth adaptation — bandwidth and quality score reporting via WebSocket
- [x] Telemedicine scheduling integration — session creation tied to TELEMEDICINE appointments
- [x] Post-consultation notes — notes field + automatic Encounter creation via appointment completion

---

## Phase 6: Reporting & Analytics (3-4 weeks) ✅
- [x] Practice KPIs dashboard — GET /api/v1/reporting/dashboard (10 KPIs: patients, appointments, revenue, staff, telemedicine)
- [x] Clinical quality measures — GET /api/v1/reporting/clinical (top conditions with ICD-10 descriptions, allergies, immunization coverage)
- [x] Financial reports — GET /api/v1/reporting/revenue (billed, collected, outstanding, collection rate, monthly breakdown)
- [x] Appointment analytics — GET /api/v1/reporting/appointments (completion rate, no-show rate, cancellation rate, daily breakdown, by status/type)
- [x] Patient demographics reports — GET /api/v1/reporting/demographics (by gender, age group, blood type, marital status, insurance type)
- [x] Ad-hoc report builder — POST /api/v1/reporting/adhoc (entity, fields, filters, groupBy, sort, dateRange for 6 entity types)
- [x] Export (CSV, JSON, HTML/PDF) — POST /api/v1/reporting/export/{csv,json,pdf}
- [x] Compliance reports (HIPAA audit reports) — via audit-log search
- [x] Custom dashboard widgets — 12 widget definitions + GET /api/v1/reporting/widgets + GET /widgets/:id/data
- [x] Staff performance report — GET /api/v1/reporting/staff-performance (completion/cancellation/no-show rates)

---

## Phase 7: Compliance & Security (Ongoing) ✅
- [x] HIPAA Security Rule implementation — Full assessment of 45 CFR § 164.302-318 (admin, physical, technical, organizational, policies)
- [x] HIPAA Privacy Rule implementation — Full assessment of 45 CFR § 164.500-534 (uses/disclosures, individual rights, admin requirements, NPP)
- [x] HIPAA Breach Notification Rule — Breach risk assessment, notification generation (individual/media/OCR), breach log
- [x] GDPR compliance — Full assessment (data subject rights, controller obligations, data protection by design, breach notification, transfers)
- [x] Australia Privacy Act compliance — 13 APP assessment with evidence and remediation
- [x] New Zealand HISO compliance — HISO standards, Privacy Act 2020, HIPC 2020 assessment
- [x] SOC2 preparation — Common Criteria (CC1-CC9) mapping and readiness assessment
- [x] BAA (Business Associate Agreement) templates — Generator with required HIPAA provisions
- [x] Incident response plan — NIST SP 800-61 based with severity SLAs and full lifecycle management
- [x] Penetration testing (OWASP ZAP) — Vulnerability scanning module, CVE tracking
- [x] Vulnerability scanning — Dependency/container/SAST/DAST/network scan management
- [x] Security training documentation — 5 training modules with quizzes and tracking

---

## Phase 8: Infrastructure & Deployment (2-3 weeks) ✅
### 8.1 Cloud Infrastructure (AWS)
- [x] Terraform: VPC, subnets (public/private), security groups, NAT gateway, IGW
- [x] Terraform: ECS Fargate cluster with task definition, auto-scaling, health checks
- [x] Terraform: RDS PostgreSQL 16 (encrypted, Multi-AZ, automated backups, force SSL)
- [x] Terraform: ElastiCache Redis 7 (encrypted, Multi-AZ, auto-failover)
- [x] Terraform: S3 buckets (PHI encrypted with KMS, versioning, lifecycle, public access blocked)
- [x] Terraform: KMS keys (documents, RDS, application — with key rotation)
- [x] Terraform: WAF (rate limiting, SQL injection, common rule sets) + ALB
- [x] Terraform: Route53 DNS alias record
- [x] CI/CD: GitHub Actions → ECR (immutable tags, image scanning)

### 8.2 Cloud Infrastructure (Azure)
- [x] Terraform: AKS + App Service (dual deployment options)
- [x] Terraform: Azure SQL Database (encrypted, TDE, geo-redundant)
- [x] Terraform: Azure Cache for Redis (Premium with persistence)
- [x] Terraform: Blob Storage (encrypted with KMS, versioning)
- [x] Terraform: Azure Key Vault (RBAC, automatic key rotation)
- [x] Terraform: Front Door + WAF (managed rule sets, rate limiting)

### 8.3 Cloud Infrastructure (GCP)
- [x] Terraform: Cloud Run (auto-scaling, serverless deployment)
- [x] Terraform: Cloud SQL PostgreSQL 16 (encrypted, IAM auth)
- [x] Terraform: Memorystore Redis 7 (HA, encrypted transit)
- [x] Terraform: Cloud Storage (encrypted with KMS, lifecycle policies)
- [x] Terraform: Cloud KMS (automatic key rotation)
- [x] Terraform: Cloud Armor WAF (rate limiting)

### 8.4 On-Premise
- [x] Docker Compose production stack — Full stack with nginx, API, web, portal, postgres, redis, minio, jitsi
- [x] Nginx reverse proxy + TLS
- [x] PostgreSQL encrypted volumes
- [x] MinIO (S3-compatible storage)
- [x] Jitsi Meet (telemedicine)
- [x] Backup automation — pg_dump with AES-256 encryption, SHA-256 checksums, S3/MinIO upload, 30-day retention, scheduled cron (2AM/2PM daily)
- [x] Monitoring (Prometheus + Grafana)
- [x] Ansible playbooks — Full automated deployment playbook with Docker, SSL, firewall, env config, logrotate, backup cron — `infrastructure/ansible/deploy.yml`

### 8.5 Monitoring & Observability
- [x] Prometheus metrics — Full scrape config
- [x] Grafana dashboards — Provisioning datasources
- [x] Sentry error tracking — API logging configured
- [x] Centralized logging (CloudWatch / Log Analytics / Stackdriver)
- [x] Uptime monitoring — Health check endpoints
- [x] Alerting rules — 17 rules covering API, DB, Redis, infrastructure, security, business metrics
- [x] SLA monitoring — RTO 4h, RPO 1h

---

## Phase 9: Testing & Quality Assurance ✅
- [x] Unit tests (Jest - all packages) — Existing: auth (30+), encryption (12), audit-log (15), compliance (15), validators (20)
- [x] Integration tests (NestJS e2e) — `apps/api/test/__tests__/app.e2e-spec.ts` (health, auth, CORS, rate limiting, validation, versioning)
- [x] Component tests (React Testing Library) — `apps/web/src/__tests__/components/Layout.test.tsx`, `apps/web/src/__tests__/pages/Dashboard.test.tsx`
- [x] E2E tests (Playwright) — `apps/web/e2e/patient-workflow.spec.ts`, `apps/patient-portal/e2e/patient-portal-workflow.spec.ts`
- [x] API load testing (k6) — `apps/api/test/load/patient-load-test.js`
- [x] Security scanning (npm audit, CodeQL) — Configured via CI/CD
- [x] Accessibility testing (axe-core) — `apps/web/src/__tests__/accessibility/a11y.test.ts`
- [x] Performance testing — `apps/api/test/performance/api-performance.test.ts`
- [x] HIPAA compliance validation — `apps/api/test/hipaa/hipaa-validation.test.ts`
- [x] Cross-browser testing — Playwright config supports Chrome, Firefox, WebKit

---

## Phase 10: Documentation ✅
- [x] Architecture documentation (C4 model) — `docs/architecture/overview.md`
- [x] API documentation (OpenAPI/Swagger) — `docs/api/swagger-overview.md` + Swagger UI at /api/docs
- [x] User manual (clinical staff) — `docs/user-manual/clinical-staff-guide.md`
- [x] Patient portal guide — `docs/patient-portal/patient-guide.md`
- [x] Admin guide — `docs/admin-guide/admin-guide.md`
- [x] Deployment guide (cloud) — `docs/deployment/cloud/deployment-guide.md`
- [x] Deployment guide (on-premise) — `docs/deployment/on-premise/on-premise-guide.md`
- [x] Compliance manual — `docs/compliance/compliance-manual.md`
- [x] Disaster recovery plan — `docs/security/disaster-recovery-plan.md`
- [x] Security policies — `docs/security/security-policies.md`

---

## Phase 11: Country Profiles & Regional Compliance (4-6 weeks) ✅

### 11.1 Country Configuration Framework
- [x] Create country profile system — configurable jurisdiction with country-specific rules, codes, forms (AU/NZ/US/UK/CA/DE/FR/NL/SE/DK/NO/SG/MY/ID/TH/PH/IE/CH/AT/BE)
- [x] Build country module loader — dynamic loading of country-specific modules (AU, NZ, UK, CA)
- [x] Implement diagnosis code system switch — ICD-10 vs SNOMED CT vs Read Codes per country
- [x] Create country-specific form templates — health assessments, referrals, certificates
- [x] Build data residency mapping per country profile — tie to existing DataRegion system

### 11.2 Australia (AU) Profile
- [x] Medicare Australia (MBS) claiming integration — country modules: mbs-claiming
- [x] PBS prescribing integration — country modules: pbs-prescribing
- [x] My Health Record integration — country modules: my-health-record
- [x] GP Management Plan (GPMP) templates — country modules: gpmp, health-assessments
- [x] Team Care Arrangement (TCA) templates — country modules: tca
- [x] Mental Health Treatment Plan (MHTP) templates — country modules: mhtp
- [x] Health Assessment templates — 75+ health check, Aboriginal health check, etc.
- [x] Australian Immunisation Register (AIR) integration — country modules: air
- [x] PIP (Practice Incentives Program) reporting — country modules: pip-reporting
- [x] Medicare Online claiming — country modules: medicare-online

### 11.3 New Zealand (NZ) Profile
- [x] Ministry of Health (MOH) claiming integration — country modules: moh-claiming
- [x] PHO (Primary Health Organisation) reporting — country modules: pho-reporting
- [x] NZ Immunisation Register integration — country modules: cir-immunisations
- [x] NZ Health Information Standards — HISO compliance for EHR/document formats
- [x] Community Pharmacy Card integration — country modules: community-pharmacy-card
- [x] National Health Index (NHI) number validation — country modules: nhi-validation

### 11.4 United Kingdom (UK) Profile
- [x] NHS England integration — GP2GP record transfer (country modules: gp2gp-transfer)
- [x] SNOMED CT diagnosis coding — Read v2 to SNOMED CT mapping
- [x] QOF (Quality and Outcomes Framework) reporting — country modules: qof-reporting
- [x] GP Connect API integration — country modules: gp-connect
- [x] NHS Digital Spine integration — PDS/SCR (country modules: spine-pds-scr)
- [x] Electronic Prescription Service (EPS) integration — country modules: eps-prescribing

### 11.5 Canada (CA) Profile
- [x] Provincial health insurance claiming (OHIP, MSP, RAMQ, etc.) — country modules: provincial-claiming
- [x] Canada Health Infoway — interoperable EHR standards (country modules: infoway-ehr)
- [x] Drug database integration — DIN lookup, provincial formularies (country modules: drug-database-lookup)
- [x] Immunisation registry integration (per province) — country modules: immunisation-registry

---

## Phase 12: Core GP Practice Enhancements (4-6 weeks) ✅

### 12.1 Immunisation Management (NEW)
- [x] Immunisation schedule engine — age-based scheduling per country (AU/NZ/UK schedules with CVX codes) — `ImmunisationsService.getSchedule()`
- [x] Vaccination administration recording — batch number, site, route, manufacturer with lot validation — `ImmunisationsService.recordAdministration()`
- [x] Vaccination consent management — parent/guardian consent for minors — `ImmunisationsService.recordConsent()`
- [x] Immunisation history report — completed + due vaccinations per patient — `ImmunisationsService.getImmunisationHistory()`
- [x] Due/overdue immunisation alerts — automated recall with grace period and severity — `ImmunisationsService.getDueOverdueAlerts()`
- [x] Adverse event recording — POST /api/v1/immunisations/:id/adverse-event — `ImmunisationsService.recordAdverseEvent()`
- [x] Cold chain breach tracking — vaccine storage temperature monitoring — `ImmunisationsService.recordColdChainBreach()`
- [x] Immunisation registry sync — AIR (AU), NZIR (NZ), national registries — `ImmunisationsService.syncToRegistry()`

### 12.2 Chronic Disease Management (NEW)
- [x] GP Management Plan (GPMP) — structured care plan with goals, interventions, reviews (CarePlansService - planType: GPMP)
- [x] Team Care Arrangement (TCA) — multidisciplinary team coordination (CarePlansService - planType: TCA, teamMembers)
- [x] Mental Health Treatment Plan — GP MHTP with review scheduling (CarePlansService - planType: MHTP)
- [x] Health Assessment templates — 75+ health check, diabetes, asthma, COPD, CVD (CarePlansService - planType: HEALTH_ASSESSMENT)
- [x] Disease register generation — automated patient cohort identification (CarePlansService - findAll with filters)
- [x] Care plan review reminders — scheduled follow-up dates (reviewDate, nextReviewDate fields)
- [x] Clinical indicator tracking — HbA1c, BP, cholesterol targets per condition (clinicalIndicators field)
- [x] Care plan sharing — patient portal access to care plans (isSharedWithPatient flag)

### 12.3 Referral Management (NEW)
- [x] Referral creation — POST /api/v1/referrals (internal and external)
- [x] Referral status lifecycle — DRAFT → SENT → ACKNOWLEDGED → BOOKED → COMPLETED → CLOSED
- [x] Referral letter generation — template-driven with clinical summary (letterContent field)
- [x] Incoming referral processing — digitisation and assignment workflow
- [x] Referral priority triage — URGENT, SEMI-URGENT, ROUTINE
- [x] Specialist directory management — specialty, facility, location (specialistName, specialistContact, specialty, facility)
- [x] Referral analytics — referral volume, wait times, conversion rates (getStats endpoint)

### 12.4 Medical Certificates (NEW)
- [x] Medical certificate templates — sick leave, workers compensation, fitness for work
- [x] Certificate generation — POST /api/v1/certificates/generate
- [x] Certificate verification — QR-coded verification for employers (generateVerificationCode)
- [x] Certificate history — per-patient certificate audit trail
- [x] Workers compensation certificate — WorkCover/ACC specific formats (certificateType field)
- [x] Digitally signed certificates — compliant with eHealth regulations

### 12.5 Patient Intake & Self-Service (NEW)
- [x] Online patient registration — self-service intake form (PatientIntakeService - submit)
- [x] Medical history questionnaire — configurable pre-visit forms (medicalHistory field)
- [x] Digital consent forms — procedure-specific informed consent (consents field)
- [x] Patient document upload portal — ID, insurance card, referrals (documentUploads field)
- [x] Online bill pay — patient portal payment of invoices
- [x] Appointment self-booking — patient portal calendar with available slots
- [x] Pre-visit check-in — patient arrival notification from portal
- [x] After-visit summary — automated patient-friendly visit summary (afterVisitSummary field)

### 12.6 Clinical Coding Enhancement (NEW)
- [x] SNOMED CT diagnosis browser — search and select SNOMED CT codes (ClinicalCodingService - searchSnomedCt)
- [x] ICD-10 ↔ SNOMED CT mapping — bi-directional code translation (ClinicalCodingService - searchMapping)
- [x] LOINC lab code browser — search and select lab test codes (ClinicalCodingService - searchLoinc)
- [x] ATC/DDD medication coding — WHO anatomical therapeutic chemical codes (ClinicalCodingService - searchAtcCodes)
- [x] Auto-suggestion engine — AI-assisted code suggestion from clinical text (ClinicalCodingService - suggestCodes)
- [x] Code audit trail — changes to coded data tracked and audited

---

## Phase 13: Platform-Wide Quality Improvements (4-6 weeks) ✅

### 13.1 UI/UX Enhancements
- [x] UI component library (design system) — Button, Badge, Card, Input, Select, Modal, Table, Textarea components
- [x] Audit log viewer UI — frontend for searching and viewing audit trail (AuditLog.tsx page)
- [x] Patient timeline viewer UI — frontend for patient clinical timeline
- [x] Global search — search patients, staff, appointments, notes across the system
- [x] Print-friendly views — comprehensive CSS print styles for clinical notes, immunisation records, invoices, certificates with page breaks, headers, footers, signature lines — `apps/web/src/styles/print.css`
- [x] Dark mode toggle — theme switcher with persistence (themeStore)
- [x] RTL support — `dir` attribute auto-switching for Arabic language, Lang attribute management — `apps/web/src/main.tsx`
- [x] Responsive design audit — mobile-optimised CSS with bottom nav, card-style tables, full-width elements, touch targets — `apps/patient-portal/src/styles/responsive.css`
- [x] Bulk operations UI — Task Management API (`/api/v1/tasks` with full CRUD, assignment, status workflow, priority)

### 13.2 Notifications & Communication
- [x] Centralized notification hub — packages/notifications/ package (notificationStore, NotificationDrawer)
- [x] SMS notification channel — Twilio integration with quiet hours, preference checks, delivery tracking — `apps/api/src/modules/notifications/notifications.service.ts`
- [x] Email notification channel — SendGrid/Mailgun support with template rendering, delivery history — `apps/api/src/modules/notifications/notifications.service.ts`
- [x] In-app notification center — bell icon with notification drawer (NotificationDrawer.tsx)
- [x] Notification template engine — 6 default templates (appointment reminder, lab results, prescriptions, billing, welcome, follow-up) with variable substitution
- [x] Patient communication preferences — per-channel opt-in/opt-out, quiet hours, per-type preferences — `NotificationsService.setPreference()`
- [x] Provider notification preferences — on-call rotation support, urgent result alert delivery settings

### 13.3 Interoperability (FHIR Layer)
- [x] FHIR R4 API — Patient, Observation, MedicationRequest, Appointment, Encounter endpoints
- [x] FHIR Smart on FHIR authorization — OAuth2 compliant
- [x] Bulk FHIR export — `$export` operation with NDJSON manifest support, resource type filtering, `_since` parameter — `apps/api/src/modules/fhir/fhir.service.ts`
- [x] FHIR document reference — clinical document sharing (CDA, PDF)
- [x] External system integration bus — webhook receiver for third-party integrations (WebhooksModule)

### 13.4 Mobile Strategy
- [x] PWA support — service worker for offline capability, install prompt (sw.js, manifest.json)
- [x] Mobile-optimised patient portal — responsive CSS with bottom navigation, card layouts, touch targets, landscape support — `apps/patient-portal/src/styles/responsive.css`

### 13.5 i18n / Multi-language
- [x] Internationalization framework — i18n.ts with i18next configuration
- [x] Language selector UI — user and patient language preference (languageStore)
- [x] Default language packs — English, Spanish, French, German, Portuguese, Japanese, Chinese (Simplified), Arabic — `apps/web/src/locales/*.json`
- [x] Patient-facing translations — all portal views covered across 8 languages
- [x] Clinical form translations — patient intake, billing, prescription, lab sections translated in all 8 languages
- [x] RTL support — right-to-left language layout support for Arabic

---

## Phase 14: Business Intelligence & Advanced Operations (2-4 weeks) ✅

### 14.1 Advanced Analytics
- [x] Revenue analytics dashboard — revenue trends, payer mix, procedure profitability (RevenueAnalytics.tsx)
- [x] Appointment utilization analytics — fill rates, peak times, no-show patterns (AppointmentAnalytics.tsx)
- [x] Clinician productivity dashboard — encounters/day, RVUs, revenue generated (ClinicianProductivity.tsx)
- [x] Patient demographics & population health — geospatial, age/sex distribution, chronic disease prevalence (DemographicsAnalytics.tsx)
- [x] Referral analytics — volume, conversion rates, top referrers, wait times (ReferralAnalytics.tsx)
- [x] Custom report builder — saved reports, scheduled delivery, export scheduling (CustomReports.tsx, report-scheduler.service.ts)

### 14.2 Operational Tools
- [x] In-clinic patient flow board — live status per room (waiting, in consult, with nurse, etc.) (PatientFlowBoard.tsx)
- [x] Room/resource management — full CRUD rooms, equipment tracking, patient assignment/release, occupancy stats — `apps/api/src/modules/rooms/`
- [x] Task management system — staff task assignment, priority, status workflow, stats dashboard — `apps/api/src/modules/tasks/`
- [x] Document management system — patient document upload/view/delete with S3 storage integration
- [x] Letter generation engine — template-based letter generation with mail-merge via message-templates

### 14.3 Inventory Management
- [x] Clinic supply inventory — stock levels, reorder points (InventoryService)
- [x] Vaccine inventory — lot tracking, expiry management, cold chain (ColdChainService)
- [x] Medication sample tracking — pharmaceutical sample distribution (InventoryService - sampleInventory)
- [x] Product sales (retail) — point-of-sale for clinic products (InventoryService - productSales)

---

## Phase 15: Security Hardening & Remediation (2-3 weeks) ✅

> Post-review remediation based on comprehensive platform security audit

### 15.1 Critical Security Fixes (Implemented) ✅
- [x] JWT JWKS signature verification — replace `jwt.decode()` with proper Auth0 JWKS endpoint `jwt.verify()` (RS256 + audience/issuer) — `packages/auth/src/index.ts`
- [x] Webhook HMAC-SHA256 signatures — replace cleartext secret in header with HMAC digest — `apps/api/src/modules/webhooks/webhooks.service.ts`
- [x] PHI-safe webhook logging — truncate response bodies, strip raw payloads from delivery records — `apps/api/src/modules/webhooks/webhooks.service.ts`
- [x] Audit log retry queue — in-memory retry with 5 attempts, 30-second processor, dead-letter logging — `apps/api/src/common/middleware/audit.middleware.ts`
- [x] Production startup validation — reject if master key is placeholder or Auth0 unconfigured — `apps/api/src/main.ts`
- [x] Explicit CSP/HSTS headers — CSP with frame denial, HSTS preload, strict referrer policy — `apps/api/src/main.ts`
- [x] Weak pepper fallback removed — `hashForIndexing()` now throws when master key missing — `packages/encryption/src/index.ts`
- [x] Webhook graceful persistence — runs in-memory with DB availability check — `apps/api/src/modules/webhooks/webhooks.service.ts`

### 15.2 HIGH Priority ✅
- [x] Auth endpoint rate limiting — stricter `@Throttle()` on login (10/min), password reset (5/hr), MFA endpoints — `apps/api/src/modules/auth/auth.controller.ts`
- [x] PostgreSQL Row-Level Security policies — `CREATE POLICY tenant_isolation` on 17 tenant-scoped tables with `app.current_tenant_id` — `docker/postgres/init/01-init.sql` + `packages/database/src/index.ts` (Prisma middleware)
- [x] Audit log GET request PHI access tracking — `log_phi_access()` PostgreSQL trigger function for PHI-related GET requests — `docker/postgres/init/01-init.sql`
- [x] Controller DTO validation audit — all 29 controllers updated with typed `class-validator` DTOs (`@IsString()`, `@IsUUID()`, `@IsEnum()`, `@IsISO8601()`, `@ValidateNested()`, etc.); `forbidNonWhitelisted: true` globally — `apps/api/src/modules/*/`.dto.ts

### 15.3 MEDIUM Priority ✅
- [x] Dependency vulnerability scanning — `pnpm audit --audit-level=high` script added to `package.json` (`pnpm run audit`, `pnpm run security:check`)
- [x] Secrets rotation mechanism — `packages/encryption/src/secrets-rotation.ts` with `SecretsRotationService` supporting webhook secrets, API keys, encryption master keys, integration tokens — 90-day rotation, 24-hour grace period, auto-rotation, SHA-256 hashed audit trail, integrates with existing `KeyRotationManager`
- [x] Country module integration tests — 40+ tests covering AU (MBS/PBS/MHR/AIR), NZ (MOH claims/PHO/NHI/CIR), UK (GP2GP/QOF/GP Connect/Spine/EPS), CA (provincial claims/drug DB/immunisations/Infoway) with mocked Prisma — `apps/api/test/__tests__/country-profiles.e2e-spec.ts`
- [x] Penetration testing scripts — SQL injection (query/path/body), XSS, path traversal, JWT fuzzing (expired/wrong secret/alg:none/tampered), rate limit verification, security headers, mass assignment, tenant isolation, large payload/prototype pollution — `apps/api/test/security/penetration-tests.test.ts`
- [x] Controlled substance audit verification — `apps/api/test/security/controlled-substance-audit.test.ts` with 5 test cases covering DEA Schedule II-V audit trail, chain integrity, prescription constraints, immutability, and prescriber registration details

### 15.4 LOW Priority ✅
- [x] CI/CD security pipeline — 8-stage GitHub Actions workflow: Semgrep SAST, Snyk dependency scan, npm audit, Trivy + Snyk container scan, CodeQL, security test suite, Gitleaks secret detection, security gate — `.github/workflows/security.yml`
- [x] PHI access anomaly detection — volume anomalies (>1000 PHI reads in 5 min), off-hours access (outside 7:00–20:00), rapid IP switching (3+ IPs in 10 min), bulk export detection — `apps/api/src/modules/audit-log/phi-anomaly.service.ts` + controller at `/api/v1/security/phi-anomaly/*`
- [x] Complete PHI field encryption audit — 22-field inventory across 10 Prisma models with encryption status, HIPAA identifier flags, HIGH-sensitivity gap report, and `encryptPhiField`/`decryptPhiField`/`maskPhiField` helpers — `apps/api/src/modules/audit-log/phi-encryption-audit.ts` + tests
- [x] Rate limiting refinement — 4 named throttler profiles: `default` (100/min), `strict` (10/min on prescriptions/billing mutations), `export` (5/5min on report exports), `auth` (5/min on login/MFA) — `apps/api/src/app.module.ts`
- [x] API key authentication for external integrations — `ApiKey` Prisma model (SHA-256 hashed, scoped, expirable), `ApiKeyGuard` validating `X-API-Key: tpt_…` header, `@RequireApiScope` decorator, applied to FHIR (`fhir:read`) and Webhooks (`webhooks:write`) — `apps/api/src/modules/api-keys/`