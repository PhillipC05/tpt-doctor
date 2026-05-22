# TPT Doctor — Compliance Manual

## Overview

This manual documents the compliance frameworks implemented in TPT Doctor, including HIPAA, GDPR, Australia Privacy Act, New Zealand HISO, and SOC 2 readiness.

## HIPAA Compliance (45 CFR § 164)

### Security Rule (§ 164.302-318)

#### Administrative Safeguards (§ 164.308)
- **Security Management Process:** Risk assessment via OWASP ZAP + npm audit
- **Assigned Security Responsibility:** CISO with documented responsibilities
- **Workforce Security:** RBAC with 30+ permissions across 6 user tiers
- **Information Access Management:** JWT-based access, MFA required
- **Security Awareness Training:** Annual training with phishing simulations
- **Security Incident Procedures:** NIST SP 800-61 based incident response
- **Contingency Plan:** RTO 4h, RPO 1h with multi-region failover
- **Evaluation:** Annual external security assessment

#### Physical Safeguards (§ 164.310)
- **Facility Access Controls:** AWS/Azure/GCP data centers with multi-factor access
- **Workstation Use:** 15-minute inactivity timeout, clean desk policy
- **Device and Media Controls:** NIST SP 800-88 sanitization, encrypted storage

#### Technical Safeguards (§ 164.312)
- **Access Control:** Unique user IDs, emergency access procedure, automatic logoff
- **Audit Controls:** Immutable audit log with SHA-256 chaining
- **Integrity Controls:** Previous hash validation, digital signatures
- **Person or Entity Authentication:** Auth0 with MFA (TOTP, SMS, FIDO2)
- **Transmission Security:** TLS 1.2+ for all data in transit

### Privacy Rule (§ 164.500-534)
- **Uses and Disclosures of PHI:** Consent management with granular controls
- **Individual Rights:** Access, amendment, accounting of disclosures
- **Administrative Requirements:** Privacy officer, workforce training
- **Notice of Privacy Practices:** Available via patient portal

### Breach Notification Rule (§ 164.400-414)
- **Breach Assessment:** Risk assessment based on nature, extent, timing
- **Notification to Individuals:** Within 60 days for >500 records
- **Notification to OCR:** Within 60 days for >500, annually for <500
- **Notification to Media:** For breaches affecting >500 residents

## GDPR Compliance

### Data Subject Rights
| Right | Implementation |
|-------|---------------|
| Right to be Informed | Privacy notice during account creation |
| Right of Access | Patient portal record access |
| Right to Rectification | Profile edit functionality |
| Right to Erasure | Data deletion request workflow |
| Right to Restrict Processing | Consent revocation |
| Right to Data Portability | JSON/CSV export |
| Right to Object | Marketing opt-out |
| Automated Decision Making | Transparency in CDS algorithms |

### Data Processing Records
- Lawful basis for processing documented per purpose
- Data Protection Impact Assessment (DPIA) completed
- Data Processing Agreement (DPA) with all sub-processors

### International Data Transfers
- Standard Contractual Clauses (SCCs) in place
- Data residency controls per region (US, EU, AU, NZ)
- Encryption for all cross-border data transfers

## Australia Privacy Act (1988)

### Australian Privacy Principles (APPs)
| APP | Description | Coverage |
|-----|-------------|----------|
| APP 1 | Open and transparent management of personal information | 100% |
| APP 2 | Anonymity and pseudonymity | Supported |
| APP 3 | Collection of solicited personal information | 100% |
| APP 4 | Dealing with unsolicited personal information | 100% |
| APP 5 | Notification of collection | 100% |
| APP 6 | Use or disclosure of personal information | 100% |
| APP 7 | Direct marketing | Consent-based |
| APP 8 | Cross-border disclosure | SCCs in place |
| APP 9 | Adoption, use or disclosure of government related identifiers | Restricted |
| APP 10 | Quality of personal information | Validation enforced |
| APP 11 | Security of personal information | AES-256, audit logs |
| APP 12 | Access to personal information | Patient portal |
| APP 13 | Correction of personal information | Profile edit |

## New Zealand HISO Compliance

### HISO Standards
- **HISO 10029:2015** — Health Information Governance (compliant)
- **HISO 10064:2017** — Authentication Standards (compliant)
- **HISO 10082:2018** — Health Information Security Framework (compliant)
- **HISO 10086:2019** — Data Quality Framework (compliant)

### Privacy Act 2020 (NZ)
- 12 Information Privacy Principles covered
- Data breach notification within 72 hours
- Privacy Officer appointed
- Cross-border data transfer safeguards

### Health Information Privacy Code 2020
- Rule 1-12 implemented (purpose, source, collection, storage, access, correction, accuracy, retention, use, disclosure, unique identifiers, matching)

## SOC 2 Readiness

### Trust Services Criteria

| Category | Coverage |
|----------|----------|
| CC1 — Control Environment | 100% |
| CC2 — Communication and Information | 100% |
| CC3 — Risk Assessment | 100% |
| CC4 — Monitoring Activities | 100% |
| CC5 — Control Activities | 100% |
| CC6 — Logical and Physical Access | 100% |
| CC7 — System Operations | 100% |
| CC8 — Change Management | 100% |
| CC9 — Risk Mitigation | 100% |

### SOC 2 Controls
1. **Access Control:** Auth0 with RBAC and MFA
2. **Change Management:** Version control + CI/CD pipeline
3. **System Operations:** Prometheus monitoring + alerting
4. **Risk Management:** Annual risk assessment + vulnerability scanning
5. **Vendor Management:** BAA with all third-party vendors
6. **Incident Management:** NIST SP 800-61 based IR plan
7. **Data Security:** AES-256 encryption + immutable audit logs
8. **Availability:** Multi-region deployment with 99.9% SLA

## Compliance Automation

### Automated Checks
1. **Daily:** Audit chain verification, failed login monitoring
2. **Weekly:** Vulnerability scan, dependency audit
3. **Monthly:** Access review, permission audit
4. **Quarterly:** Risk assessment, DR test, training completion
5. **Annually:** External penetration test, SOC 2 audit

### Compliance Reporting
1. **HIPAA Audit Report:** Export from Admin > Compliance > HIPAA
2. **GDPR DSAR Report:** Generate from Admin > Compliance > GDPR
3. **Access Report:** User access and activity report
4. **Breach Log:** Complete breach notification history
5. **Training Report:** Security training completion status

## Retention Schedules

| Data Type | Retention Period | Disposal Method |
|-----------|-----------------|-----------------|
| Patient Records | 7 years after last visit | Encrypted deletion |
| Audit Logs | 6 years | Archive then delete |
| Financial Records | 7 years | Archive then delete |
| Prescription Records | 10 years | Encrypted deletion |
| Staff Records | 7 years after termination | Encrypted deletion |
| Consent Records | Duration + 7 years | Encrypted deletion |
| Security Logs | 1 year | Aggregate then delete |
| Backup Data | 30 days (daily) | Overwrite |

## Incident Response

### Incident Severity Matrix
| Severity | Impact | Response Time | Notify |
|----------|--------|---------------|--------|
| CRITICAL | PHI breach >500 records | Immediate | CISO, Legal, HHS |
| ERROR | PHI breach <500 records | 1 hour | CISO, Privacy Officer |
| WARNING | Security policy violation | 4 hours | Security team |
| INFO | Suspected anomaly | 24 hours | Security team |

### Breach Notification Timeline
1. **Discovery:** Incident detected by monitoring or reported
2. **Assessment:** Risk assessment within 24 hours
3. **Containment:** Immediate containment actions
4. **Notification:** Within 60 days per HIPAA
5. **Documentation:** Full incident report within 30 days
6. **Remediation:** Corrective actions within 90 days