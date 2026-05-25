# TPT Doctor — Security Hardening Checklist

> A comprehensive checklist for securing your TPT Doctor deployment.  
> Use this before going live with real patient data.

---

## Pre-Deployment

### Authentication & Access Control

- [ ] **Auth0 tenant created** in the correct region for your data residency
- [ ] **MFA enabled** for all clinical staff accounts
- [ ] **Strong password policy** configured in Auth0 (min 12 chars, complexity)
- [ ] **Brute force protection** enabled in Auth0
- [ ] **Session timeout** set to 15 minutes of inactivity
- [ ] **Break-glass emergency accounts** created with automatic 24-hour expiration
- [ ] **Role-based access control** configured (doctors, nurses, receptionists have appropriate permissions)

### Network Security

- [ ] **Firewall configured** to only allow ports 22, 80, 443, 3478/udp
- [ ] **SSH key-based authentication only** (password login disabled)
- [ ] **SSH on non-standard port** (optional, but reduces log noise)
- [ ] **fail2ban installed** to block brute force SSH attempts
- [ ] **Private network** for inter-service communication (Docker internal networks)

### Data Encryption

- [ ] **Encryption master key generated** — 64-character hex string (256-bit)
- [ ] **Master key stored securely** — never in source control
- [ ] **TLS certificate configured** (Let's Encrypt or commercial CA)
- [ ] **HSTS enabled** with `max-age=31536000; includeSubDomains; preload`
- [ ] **Database volume encryption** enabled (LUKS or provider-managed)
- [ ] **Backup encryption** enabled (AES-256-CBC via pbkdf2)

---

## Deployment

### Server Hardening

- [ ] **Automatic security updates enabled** (`unattended-upgrades`)
- [ ] **System audit logging enabled** (`auditd`)
- [ ] **Docker daemon** running as non-root
- [ ] **Container resource limits** configured (memory, CPU)
- [ ] **Read-only root filesystem** for containers where possible
- [ ] **Docker images scanned** for vulnerabilities (Trivy, Snyk)

### Environment Configuration

- [ ] `.env` file has **restricted permissions** (`chmod 600`)
- [ ] `.env` file **not in source control** (should be in `.gitignore`)
- [ ] **All placeholder values replaced** (no `CHANGE_ME`, `placeholder`, `dev-key`)
- [ ] **Production encryption key** generated (not using development key)
- [ ] **Auth0 production tenant** (not using development tenant)
- [ ] **CORS origins restricted** to specific frontend URLs (not `*`)

### Database

- [ ] **PostgreSQL** running on internal Docker network (not exposed on public port)
- [ ] **Strong database password** (not `postgres` or `password`)
- [ ] **Row-Level Security (RLS)** policies applied (already included in init script)
- [ ] **PHI column encryption** verified (AES-256-GCM)
- [ ] **Database backups** configured (daily, encrypted)
- [ ] **Connection pooling limits** set (prevent resource exhaustion)

---

## Post-Deployment

### Monitoring & Alerting

- [ ] **Health endpoint monitoring** set up (every 30 seconds)
- [ ] **Disk space alerts** at 80% and 90% usage
- [ ] **Memory usage alerts** configured
- [ ] **Certificate expiry monitoring** (30-day warning)
- [ ] **Failed login monitoring** (rapid failures = brute force attempt)
- [ ] **Audit log review** scheduled (daily review of suspicious activity)
- [ ] **Sentry or error tracking** configured (optional but recommended)

### Audit Logging Verification

- [ ] **Audit chain integrity checked** — run `verifyAuditChain()`
- [ ] **Audit log retention** set to minimum 6 years (HIPAA requirement)
- [ ] **PHI access audit confirmed** — all GET requests to PHI endpoints logged
- [ ] **Audit log export tested** — verify you can export for compliance

### Backup & DR Testing

- [ ] **Automated database backup confirmed working**
- [ ] **Backup restoration tested** (restore to staging environment)
- [ ] **Backup encryption verified** (restore requires the encryption key)
- [ ] **Backup retention policy** configured (30 days minimum, 6 years for audit logs)
- [ ] **Disaster recovery plan** documented and tested
- [ ] **Off-site backup** configured (MinIO replicates to cloud storage)

---

## Operational Security

### Access Reviews

- [ ] **User access reviewed** weekly for new/terminated staff
- [ ] **Admin role assignments** reviewed quarterly
- [ ] **Service account tokens** rotated every 90 days
- [ ] **API keys** for external integrations rotated regularly

### Vulnerability Management

- [ ] **npm audit** run weekly (`pnpm run audit`)
- [ ] **Docker images** rebuilt monthly (to pick up base image security patches)
- [ ] **Dependencies updated** — run `pnpm update` regularly
- [ ] **Penetration testing** with OWASP ZAP (included in compliance package)
- [ ] **Annual external security assessment** scheduled

### Compliance

- [ ] **BAA signed** with hosting provider (see deployment guides for provider-specific info)
- [ ] **Privacy Officer designated**
- [ ] **Security Officer designated**
- [ ] **HIPAA risk assessment** completed
- [ ] **Security awareness training** materials prepared (templates in compliance package)
- [ ] **Incident response plan** documented (template in `docs/security/security-policies.md`)
- [ ] **Breach notification procedures** established

### Data Governance

- [ ] **Data retention policies** configured per regulation (HIPAA: 6 years)
- [ ] **PHI inventory** documented (what fields, where stored)
- [ ] **Data disposal procedures** established (secure deletion)
- [ ] **Patient data export** tested (right to access requests)
- [ ] **Patient data deletion** tested (right to be forgotten)

---

## Regular Maintenance Checklist

### Daily

- [ ] Check server disk space (`df -h`)
- [ ] Review audit logs for anomalies
- [ ] Verify backups ran successfully

### Weekly

- [ ] Run `pnpm run audit` for dependency vulnerabilities
- [ ] Review failed login attempts
- [ ] Check certificate expiry dates
- [ ] Review system logs for errors

### Monthly

- [ ] Apply OS security patches (`apt update && apt upgrade`)
- [ ] Rebuild Docker images (pull latest base images)
- [ ] Review user accounts (remove inactive users)
- [ ] Test backup restoration
- [ ] Review firewall rules

### Quarterly

- [ ] Rotate encryption keys (automatic in key rotation service)
- [ ] Rotate API keys and service account tokens
- [ ] Full security assessment
- [ ] Update incident response plan
- [ ] Security awareness training

### Annually

- [ ] External penetration test
- [ ] HIPAA risk assessment
- [ ] BAA review with all vendors
- [ ] Disaster recovery drill
- [ ] Policy review and update
- [ ] SOC2 readiness assessment

---

## Quick Security Commands

```bash
# Check exposed ports
ss -tulpn | grep LISTEN

# Check for failed login attempts
grep "Failed password" /var/log/auth.log | tail -20

# Verify audit log chain integrity
curl -X POST http://localhost:4000/api/v1/audit/verify-chain

# Check container security
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image tpt-doctor/api:latest

# Run npm audit
pnpm run audit

# Check SSL certificate expiry
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Quick Security Checklist App

TPT Doctor includes a security validation test suite. Run it to automatically verify many controls:

```bash
# Run the HIPAA validation tests
pnpm --filter @tpt-doctor/api run test:hipaa

# Run the penetration tests
pnpm --filter @tpt-doctor/api run test:penetration

# Run all security tests
pnpm run test:security