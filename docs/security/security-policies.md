# TPT Doctor — Security Policies

## Document Control

| Property | Value |
|----------|-------|
| Document Owner | Chief Information Security Officer (CISO) |
| Version | 1.0 |
| Last Reviewed | 2026-05-14 |
| Next Review | 2027-05-14 |
| Classification | Confidential |

## 1. Information Security Policy

TPT Doctor is committed to protecting the confidentiality, integrity, and availability of all patient health information (PHI) and sensitive business data. This policy establishes the security framework for the organization.

### Scope
This policy applies to:
- All employees, contractors, and third-party vendors
- All systems, networks, and applications that process, store, or transmit PHI
- All physical locations where PHI is accessed or stored

### Policy Statements
1. PHI must be encrypted at rest (AES-256-GCM) and in transit (TLS 1.2+)
2. Access to PHI must follow the principle of least privilege
3. All access to PHI must be logged and auditable
4. Security incidents must be reported within 1 hour of discovery
5. Security awareness training is mandatory for all staff annually

## 2. Access Control Policy

### Authentication
- All users must authenticate via Auth0 with MFA
- Password policy: minimum 12 characters, complexity required
- MFA methods: TOTP, SMS, or FIDO2 hardware keys
- Session timeout: 15 minutes of inactivity

### Authorization (RBAC)
- Six-tier role model: SUPER_ADMIN, PRACTICE_ADMIN, DOCTOR, NURSE, RECEPTIONIST, PATIENT
- 30+ granular permissions across all modules
- Role assignments must be approved by practice admin
- Permission reviews conducted quarterly

### Emergency Access
- Break-glass accounts with automatic 24-hour expiration
- All emergency access logged and reviewed within 24 hours
- Emergency access requires CISO approval for extension

## 3. Data Classification and Handling Policy

### Data Classification Levels

| Level | Description | Examples | Handling Requirements |
|-------|-------------|----------|----------------------|
| Restricted | Highest sensitivity | PHI, SSN, biometric data | Encrypted, audited, MFA required |
| Confidential | Business sensitive | Financial data, credentials | Encrypted, access controlled |
| Internal | General business | Policies, procedures | Access controlled |
| Public | Non-sensitive | Marketing materials | No restrictions |

### Data Handling Rules
1. **Restricted data:** Must be encrypted at rest and in transit
2. **Restricted data:** Only accessible on a need-to-know basis
3. **Restricted data:** All access must be logged
4. **Data disposal:** NIST SP 800-88 compliant media sanitization
5. **Data retention:** Per compliance manual retention schedule

## 4. Encryption Policy

### Encryption Standards
| Data State | Standard | Key Length |
|------------|----------|------------|
| At Rest (PHI) | AES-256-GCM | 256-bit |
| In Transit | TLS 1.2+ | 2048-bit RSA / ECDHE |
| Column-level | AES-256-GCM (envelope) | 256-bit DEK |
| Database | TDE / Encrypted filesystem | Platform-managed |
| Backups | AES-256 | 256-bit |

### Key Management
- Master encryption keys stored in KMS (AWS KMS / Azure Key Vault / Cloud KMS)
- Data encryption keys wrapped by master keys
- Key rotation: automatic every 12 months
- Key access: restricted to security team only
- Key backup: offline cold storage with dual control

## 5. Audit and Monitoring Policy

### Audit Logging
- All PHI access events logged with timestamp, user, action, resource
- Tamper-proof audit chain using SHA-256 cryptographic hashing
- Audit logs retained for 6 years (HIPAA requirement)
- Logs include: who, what, when, where, source IP

### Monitoring
- 24/7 system monitoring via Prometheus + Grafana
- Real-time alerting for security events
- Weekly audit log review
- Monthly access pattern analysis
- Quarterly comprehensive security review

### Alert Thresholds
| Event | Threshold | Response Time |
|-------|-----------|---------------|
| Failed login attempts | >5 in 5 minutes | Immediate |
| PHI access outside hours | Any | 1 hour |
| Audit chain integrity failure | Any | Immediate |
| API error rate | >5% in 5 minutes | 15 minutes |

## 6. Incident Response Policy

### Incident Classification
| Severity | Definition | Response Time |
|----------|------------|---------------|
| CRITICAL | Confirmed PHI breach >500 records | Immediate |
| HIGH | Confirmed PHI breach <500 records | 1 hour |
| MEDIUM | Suspected security incident | 4 hours |
| LOW | Policy violation, no data exposure | 24 hours |

### Response Procedures
1. **Detection:** Automated monitoring or user report
2. **Assessment:** Triage within severity SLA
3. **Containment:** Isolate affected systems
4. **Eradication:** Remove threat vector
5. **Recovery:** Restore from clean backup
6. **Post-mortem:** Root cause analysis within 30 days

### Notification Requirements
| Stakeholder | CRITICAL | HIGH | MEDIUM | LOW |
|-------------|----------|------|--------|-----|
| CISO | Immediate | 1 hour | 4 hours | 24 hours |
| Legal Team | 1 hour | 4 hours | 24 hours | — |
| Affected patients | 60 days | 60 days | — | — |
| OCR (HIPAA) | 60 days | 60 days | — | — |
| Media | 60 days | — | — | — |

## 7. Business Continuity Policy

### Availability Targets
- System uptime: 99.9% (8.76 hours maximum downtime per year)
- Recovery Time Objective (RTO): 4 hours
- Recovery Point Objective (RPO): 1 hour

### Redundancy
- Multi-region deployment (active-passive)
- Database: Multi-AZ with automatic failover
- Application: Auto-scaling across availability zones
- File storage: Cross-region replication

### Backup Schedule
- Database: Full daily, WAL continuous
- File storage: Full weekly, incremental daily
- Configuration: Version-controlled

## 8. Vendor Management Policy

### Vendor Risk Assessment
- All vendors handling PHI must have active BAA
- Annual vendor risk assessment
- SOC 2 Type II reports reviewed annually
- Data processing agreements for GDPR vendors

### Approved Vendors
| Vendor | Service | BAA | Last Review |
|--------|---------|-----|-------------|
| Auth0 | Authentication | Yes | Current |
| AWS/Azure/GCP | Cloud Infrastructure | Yes | Current |
| Stripe | Payment Processing | Yes | Current |
| Airwallex | Payment Processing | Yes | Current |
| Twilio | SMS/Notifications | Yes | Current |
| Sentry | Error Tracking | DPA | Current |

## 9. Physical Security Policy

### Data Center Security
- AWS/Azure/GCP managed data centers
- Multi-factor access control
- 24/7 video surveillance
- Environmental controls (power, cooling, fire suppression)

### Workstation Security
- Screen lock after 15 minutes of inactivity
- Full disk encryption on all devices
- Anti-malware software on all endpoints
- USB ports disabled on clinical workstations

## 10. Acceptable Use Policy

### Permitted Use
- System access for authorized business purposes only
- Access to minimum PHI necessary for job function
- Use of company-provided, managed devices for PHI access

### Prohibited Actions
- Sharing passwords or credentials
- Accessing PHI outside of job requirements
- Downloading PHI to unmanaged devices
- Installing unauthorized software
- Bypassing security controls
- Using personal devices for PHI access (no BYOD for clinical work)

### Enforcement
Violations of this policy may result in:
- Written warning
- Retraining requirements
- Suspension of system access
- Termination of employment
- Legal action for intentional violations

## 11. Training and Awareness Policy

### Requirements
- Annual HIPAA security training for all staff
- Quarterly phishing simulation exercises
- Role-specific security training upon onboarding
- Monthly security newsletters

### Training Topics
1. HIPAA Privacy and Security Rules
2. Phishing and social engineering awareness
3. Password security and MFA
4. Mobile device security
5. Incident reporting procedures
6. Data classification and handling
7. Clean desk policy
8. Remote work security

## 12. Compliance and Enforcement

### Compliance Monitoring
- Automated policy enforcement via technical controls
- Quarterly compliance audits
- Annual external security assessment

### Policy Review
- Security policies reviewed annually
- Updated within 30 days of regulatory changes
- Version history maintained with change log

### Exceptions
- All policy exceptions must be documented and approved by CISO
- Temporary exceptions expire after 90 days
- Exception log reviewed quarterly