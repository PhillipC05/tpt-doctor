# TPT Doctor — Administrator Guide

## Overview

This guide covers system administration tasks for managing the TPT Doctor platform, including tenant configuration, user management, security settings, and system maintenance.

## System Architecture

TPT Doctor is deployed as a multi-tenant SaaS platform. Each tenant (clinic/practice) operates in an isolated environment with:
- Dedicated database schema with Row-Level Security (RLS)
- Isolated encryption keys
- Separate configuration
- Independent audit log chain

## Tenant Management

### Creating a New Tenant
1. **As SUPER_ADMIN**, navigate to Admin > Tenants
2. Click "Create Tenant"
3. Configure:
   - **Organization Name** — Legal business name
   - **Slug** — URL-friendly identifier (auto-generated)
   - **Data Region** — US, EU, AU, or NZ
   - **Compliance Framework** — HIPAA, GDPR, AU Privacy, NZ HISO
   - **Timezone** — Primary operating timezone
   - **Business Hours** — Default operating hours
4. Click "Save"
5. The system provisions:
   - Database schema with RLS policies
   - Encryption key set
   - Initial admin user

### Configuring Tenant Settings
1. Navigate to Admin > Tenants > [Tenant] > Settings
2. Configure:
   - **Appointment Durations** — Default lengths per encounter type
   - **Insurance Plans** — Accepted insurance providers
   - **Payment Methods** — Accepted payment types
   - **Notification Preferences** — Default reminder timing and channels
   - **Custom Fields** — Practice-specific data fields
3. All changes are audit-logged

### Tenant Backup & Restore
1. **Automated Backups:** Daily PostgreSQL backups with 30-day retention
2. **Manual Backup:** Navigate to Admin > Tenants > [Tenant] > Backup
3. Click "Create Backup" for on-demand backup
4. **Restore:** Select a backup snapshot and click "Restore"
5. Verify data integrity after restore

## User Management

### User Roles & Permissions

| Role | Permissions | Typical Users |
|------|-------------|---------------|
| SUPER_ADMIN | All permissions | System administrators |
| PRACTICE_ADMIN | Full practice management | Practice managers |
| DOCTOR | Clinical + prescriptions | Physicians, specialists |
| NURSE | Clinical (no prescriptions) | Nurses, PAs |
| RECEPTIONIST | Appointments + patient intake | Front desk staff |
| PATIENT | Portal access (self-service) | Patients |

### Inviting Users
1. Navigate to Admin > Users > "Invite User"
2. Enter: Email, First Name, Last Name, Role
3. Optionally set custom permissions
4. Click "Send Invite"
5. User receives email with activation link
6. User sets up password and MFA

### Managing Permissions
1. Navigate to Admin > Users > [User] > Permissions
2. View current permission set
3. Add or remove individual permissions
4. Changes take effect immediately
5. Permission changes are audit-logged

### Deactivating Users
1. Navigate to Admin > Users > [User]
2. Click "Deactivate"
3. User's sessions are immediately invalidated
4. Data is preserved for compliance (soft-delete)
5. Reactivation available if needed within 90 days

## Security Administration

### Audit Log Review
1. Navigate to Admin > Audit Log
2. Filter by: date range, user, action, resource
3. View detailed entries with tamper-proof hashes
4. Click "Verify Chain" to validate audit log integrity
5. Export audit logs for compliance reporting

### Security Incidents
1. Navigate to Admin > Security > Incidents
2. View all reported security incidents
3. Severity levels: INFO, WARNING, ERROR, CRITICAL
4. Assign incidents to team members
5. Track resolution with timestamps
6. Generate breach notification if required

### MFA Configuration
1. Navigate to Admin > Security > MFA
2. Options:
   - **Enforce MFA** — Required for all users
   - **MFA Methods** — TOTP, SMS, Email, Hardware Key
   - **Grace Period** — Days before MFA becomes mandatory
3. Monitor MFA enrollment status per user

### Session Management
1. Navigate to Admin > Security > Sessions
2. View all active sessions
3. Force logout individual sessions
4. Configure session timeout (default: 15 minutes inactivity)
5. View login history with geographic data

## System Maintenance

### Database Maintenance
1. **Monitor:** Connection pool usage, query performance, disk usage
2. **Vacuum:** Auto-vacuum configured; manual: `VACUUM ANALYZE`
3. **Indexes:** Query performance reports suggest missing indexes
4. **Archival:** Audit logs older than 6 years archived to cold storage

### Certificate Management
1. Navigate to Admin > Security > Certificates
2. View TLS certificate expiry dates
3. Auto-renewal via Let's Encrypt (configured)
4. Manual upload available for custom certificates

### Backup Verification
1. Weekly automated backup testing
2. Verify backup integrity with checksum validation
3. Test restore procedure quarterly
4. Document restore time objectives (RTO: 4 hours)

## Monitoring & Alerting

### System Metrics
1. **Prometheus** collects metrics at `/metrics` endpoint
2. **Grafana** dashboards available for:
   - API request rates and latencies
   - Error rates by endpoint
   - Database query performance
   - Redis cache hit rates
   - Active user sessions
   - Tenant resource usage

### Alerting Rules
The system monitors and alerts on:
- API error rate > 5% in 5 minutes
- P99 latency > 2 seconds
- Database connection pool > 80%
- Disk usage > 85%
- Failed login attempts > 10/minute
- Audit chain verification failure
- Certificate expiration < 30 days

### Health Checks
- **Liveness:** `GET /health` — Basic server status
- **Readiness:** `GET /health/ready` — Database, Redis, dependencies
- **Metrics:** `GET /metrics` — Prometheus metrics endpoint

## Compliance Administration

### HIPAA Compliance
1. Navigate to Admin > Compliance > HIPAA
2. View security rule assessment
3. Review breach notification logs
4. Access BAA (Business Associate Agreements)
5. Generate compliance reports

### GDPR Compliance
1. Navigate to Admin > Compliance > GDPR
2. Manage Data Subject Access Requests (DSAR)
3. Handle Right to Erasure requests
4. Review data processing records
5. Manage international data transfers

### Audit & Reporting
1. Generate compliance reports (CSV, JSON, PDF)
2. Schedule recurring compliance reports
3. Export audit logs for external auditors
4. Monitor remediation plans

## Troubleshooting

### Common Issues
| Issue | Resolution |
|-------|------------|
| User cannot login | Verify account is active, check MFA setup |
| Slow API responses | Check database connection pool, Redis cache |
| Email delivery failures | Verify SMTP configuration, check bounce rates |
| Telemedicine connection issues | Verify Jitsi server status, firewall rules |
| Payment processing failures | Check Stripe/Airwallex API keys, webhook config |

### Support Escalation
1. **L1:** Practice IT administrator
2. **L2:** TPT Doctor support team (support@tptdoctor.com)
3. **L3:** Engineering team (24/7 on-call for critical issues)

### Disaster Recovery
1. Activate incident response plan
2. Assess impact and severity
3. Initiate failover to secondary region if needed
4. Restore from backup if data corruption
5. Document incident in audit log
6. Perform post-mortem within 72 hours