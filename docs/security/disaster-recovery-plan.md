# TPT Doctor — Disaster Recovery Plan

## Document Control

| Property | Value |
|----------|-------|
| Document Owner | Chief Information Security Officer (CISO) |
| Version | 1.0 |
| Last Reviewed | 2026-05-14 |
| Next Review | 2027-05-14 |
| Classification | Confidential |

## Purpose

This Disaster Recovery Plan (DRP) defines the procedures for recovering TPT Doctor operations in the event of a service disruption, data loss, or catastrophic failure. The plan ensures timely restoration of critical systems while maintaining HIPAA, GDPR, and other regulatory compliance.

## Recovery Objectives

| Metric | Target |
|--------|--------|
| Recovery Time Objective (RTO) | 4 hours |
| Recovery Point Objective (RPO) | 1 hour |
| Maximum Tolerable Downtime (MTD) | 8 hours |
| Service Level Agreement (SLA) | 99.9% uptime |

## System Classification

### Tier 1 — Critical Systems (RTO: 1 hour, RPO: 15 minutes)
- PostgreSQL Database (patient data, EHR, billing)
- API Gateway (NestJS application)
- Authentication Service (Auth0)

### Tier 2 — Important Systems (RTO: 4 hours, RPO: 1 hour)
- Redis Cache
- File Storage (S3/MinIO)
- Telemedicine Service (Jitsi)

### Tier 3 — Support Systems (RTO: 8 hours, RPO: 24 hours)
- Monitoring Stack (Prometheus, Grafana)
- Reporting & Analytics
- Message Templates

## Disaster Scenarios

### Scenario 1: Database Failure

#### Detection
- API health check failures on `/health/ready`
- Database connection pool exhaustion alerts
- Error rate spike in monitoring dashboards

#### Response (1-15 minutes)
1. Verify database status: `docker compose ps postgres`
2. Check PostgreSQL logs: `docker compose logs postgres --tail=100`
3. Assess failure type: connection issue, corruption, hardware failure

#### Recovery (15 min - 2 hours)
1. **Connection issues:** Restart service: `docker compose restart postgres`
2. **Primary failure:** Initiate failover to standby
3. **Data corruption:** Restore from latest backup
4. Verify data integrity: `docker compose exec postgres pg_verify_checksums`

#### Verification
1. Confirm API health: `curl /api/v1/health`
2. Run audit chain verification
3. Test patient data access
4. Verify RPO is within target

### Scenario 2: Complete Region Failure

#### Detection
- Multiple service health checks failing
- Cloud provider status page confirms outage
- Customer reports of complete inaccessibility

#### Response (1-30 minutes)
1. Activate incident response team
2. Declare disaster via communication channels
3. Notify stakeholders (internal + customers)
4. Initiate failover to secondary region

#### Recovery (30 min - 4 hours)
1. **DNS failover:** Update Route53/Azure DNS to secondary region
2. **Database failover:** Promote read replica in secondary region
3. **Application failover:** Scale up services in secondary region
4. **Validation:** Run smoke tests against secondary region

#### Verification
1. All critical services operational in secondary region
2. RPO verified — data loss within acceptable threshold
3. Customer access restored
4. Monitoring active in secondary region

### Scenario 3: Security Breach

#### Detection
- Intrusion detection system alert
- Unusual access patterns detected
- Audit chain verification failure
- External report of suspected breach

#### Response (Immediate)
1. Isolate affected systems
2. Preserve forensic evidence
3. Notify CISO and legal team
4. Assess scope and impact

#### Recovery (24-72 hours)
1. Contain and eradicate threat
2. Restore from clean backup
3. Patch vulnerabilities
4. Rotate all credentials and keys
5. Increase monitoring

#### Notification (per HIPAA)
1. Assess breach notification requirements
2. Notify affected individuals within 60 days
3. Notify OCR for breaches >500 records
4. Notify media for large breaches
5. Document full incident report

## Backup Strategy

### Database Backups
| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Full | Daily | 30 days | Same region + cross-region |
| Incremental | Hourly | 7 days | Same region |
| WAL archives | Continuous | 24 hours | S3/MinIO |
| Transaction log | 5 minutes | 24 hours | Local |

### File Storage Backups
| Type | Frequency | Retention |
|------|-----------|-----------|
| Full | Weekly | 90 days |
| Incremental | Daily | 30 days |
| Versioning | Continuous | 30 versions |

### Configuration Backups
- Terraform state: After every `terraform apply`
- Environment variables: Version-controlled with secrets
- Infrastructure config: After every change

## Recovery Procedures

### Database Point-in-Time Recovery

```bash
# 1. Identify recovery time
# 2. Stop application services
docker compose stop api

# 3. Restore database to point in time
pgbackrest --stanza=tpt --type=time "--target=2026-05-14 14:30:00" restore

# 4. Verify recovery
docker compose exec postgres psql -U tpt -c "SELECT count(*) FROM patients"

# 5. Restart services
docker compose start api

# 6. Verify data integrity
curl /api/v1/health/ready
```

### Full Stack Recovery

```bash
# 1. Provision infrastructure via Terraform
cd infrastructure/cloud/aws
terraform init
terraform apply -var-file="environments/prod.tfvars"

# 2. Restore database from backup
pgbackrest --stanza=tpt restore

# 3. Deploy application
docker compose -f docker-compose.production.yml up -d

# 4. Run migrations
docker compose exec api pnpm run db:migrate

# 5. Restore file storage
aws s3 sync s3://tpt-backups/storage/ s3://tpt-doctor-files/

# 6. Verify deployment
curl https://api.tptdoctor.com/api/v1/health
```

## Communication Plan

### Internal Communications
| Stakeholder | Notification Method | Timing |
|-------------|-------------------|--------|
| CISO | Phone + Slack | Immediate |
| Incident Response Team | Slack + PageDuty | < 15 minutes |
| Engineering Team | Slack | < 30 minutes |
| Executive Team | Email + Phone | < 1 hour |
| All Staff | Email | < 2 hours |

### External Communications
| Stakeholder | Notification Method | Timing |
|-------------|-------------------|--------|
| Customers (practices) | Email + Portal notification | < 2 hours |
| Patients | Portal notification | < 4 hours |
| Regulators (OCR) | Formal notice | Within 60 days |
| Media (if required) | Press release | Within 60 days |

## Testing Schedule

| Test Type | Frequency | Scope |
|-----------|-----------|-------|
| Backup restoration | Monthly | Database restore test |
| Failover test | Quarterly | Region failover exercise |
| Tabletop exercise | Quarterly | Scenario walkthrough |
| Full DR test | Annually | Complete recovery simulation |
| Penetration test | Annually | External security assessment |

## Post-Recovery Activities

### Immediate (24 hours)
1. Document incident timeline
2. Assess data loss (if any)
3. Verify compliance obligations
4. Communicate resolution to stakeholders

### Short-term (1 week)
1. Root cause analysis
2. Implement preventive measures
3. Update runbooks
4. Schedule additional testing if needed

### Long-term (1 month)
1. Update DR plan with lessons learned
2. Implement automation improvements
3. Review and update RTO/RPO targets
4. Conduct training if procedures changed

## Appendices

### A. Emergency Contacts
| Role | Name | Phone | Email |
|------|------|-------|-------|
| CISO | [Name] | [Phone] | [Email] |
| Lead Engineer | [Name] | [Phone] | [Email] |
| Database Admin | [Name] | [Phone] | [Email] |
| Security Officer | [Name] | [Phone] | [Email] |
| Legal Counsel | [Name] | [Phone] | [Email] |
| PR Contact | [Name] | [Phone] | [Email] |

### B. Cloud Provider Support
| Provider | Support Portal | SLA Response |
|----------|---------------|--------------|
| AWS | AWS Support Center | 1 hour (Enterprise) |
| Azure | Azure Support | 1 hour (Premier) |
| GCP | Google Cloud Support | 1 hour (Premium) |

### C. Third-Party Vendors
| Vendor | Service | Support Contact |
|--------|---------|-----------------|
| Auth0 | Authentication | support@auth0.com |
| Stripe | Payments | support@stripe.com |
| Airwallex | Payments | support@airwallex.com |
| Twilio | SMS/Notifications | help@twilio.com |
| Sentry | Error Tracking | support@sentry.io |
| Jitsi | Telemedicine | community support |