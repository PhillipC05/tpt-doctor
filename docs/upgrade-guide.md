# TPT Doctor — Upgrade Guide

> How to upgrade your TPT Doctor deployment between versions.

---

## Versioning

TPT Doctor follows [Semantic Versioning](https://semver.org/):

| Change | Version Bump | Example |
|--------|-------------|---------|
| Breaking changes | MAJOR | `1.0.0` → `2.0.0` |
| New features (non-breaking) | MINOR | `1.0.0` → `1.1.0` |
| Bug fixes, security patches | PATCH | `1.0.0` → `1.0.1` |

---

## Before Upgrading

### 1. Read the Release Notes

Check the [GitHub Releases](https://github.com/PhillipC05/tpt-doctor/releases) page for:
- Breaking changes
- New features
- Deprecated features
- Required configuration changes
- Migration steps

### 2. Backup Everything

```bash
# Backup the database
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec backup /usr/local/bin/backup.sh

# Or manually:
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec postgres pg_dump -U tpt_admin tpt_doctor > pre-upgrade-backup-$(date +%Y%m%d).sql

# Backup .env configuration
cp .env .env.pre-upgrade-backup

# Backup Docker volumes (if using on-premise)
tar -czf volumes-backup-$(date +%Y%m%d).tar.gz /var/lib/docker/volumes/tpt-doctor_*
```

### 3. Check Current Version

```bash
# Check the version in package.json
grep '"version"' package.json
```

---

## Upgrade Procedure

### Method 1: Docker Compose (Self-Hosted)

**Minor/Patch upgrade** (no breaking changes):

```bash
cd /opt/tpt-doctor

# Pull latest code
git pull origin main

# Check for any new environment variables
# Compare .env.production.example with your .env
# Add any new variables

# Pull new Docker images
docker compose -f infrastructure/on-premise/docker-compose.production.yml pull

# Recreate containers with new images
docker compose -f infrastructure/on-premise/docker-compose.production.yml up -d --force-recreate

# Run any new database migrations
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec api pnpm run db:migrate

# Verify deployment
curl -f https://your-domain.com/api/v1/health
```

**Major upgrade** (potential breaking changes):

```bash
cd /opt/tpt-doctor

# 1. Read the release notes first!
# 2. Backup (see above)

# 3. Pull latest code
git pull origin main

# 4. Check for config changes
diff .env .env.production.example

# 5. Rebuild images from scratch
docker compose -f infrastructure/on-premise/docker-compose.production.yml build --no-cache

# 6. Stop old stack
docker compose -f infrastructure/on-premise/docker-compose.production.yml down

# 7. Start new stack
docker compose -f infrastructure/on-premise/docker-compose.production.yml up -d

# 8. Run database migrations
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec api pnpm run db:migrate

# 9. Verify
docker compose -f infrastructure/on-premise/docker-compose.production.yml ps
curl -f https://your-domain.com/api/v1/health
```

### Method 2: Source Code (Development)

```bash
cd tpt-doctor

# Pull latest code
git pull origin main

# Update dependencies
pnpm install

# Regenerate Prisma client (if schema changed)
pnpm run db:generate

# Run database migrations
pnpm run db:migrate

# Build all packages
pnpm run build

# Restart development servers
pnpm run dev
```

### Method 3: DigitalOcean App Platform

1. Push to your GitHub repository
2. DigitalOcean auto-detects the changes and rebuilds
3. Monitor the deployment in DigitalOcean dashboard
4. Run migrations manually via Console:

```bash
# In DigitalOcean App Platform Console:
pnpm run db:migrate
```

---

## Database Migrations

### Standard migration

```bash
# Docker Compose
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec api pnpm run db:migrate

# Development
pnpm run db:migrate
```

### Migration fails

```bash
# Check migration status
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec api pnpm --filter @tpt-doctor/database run migrate:status

# If a migration partially applied:
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec api pnpm --filter @tpt-doctor/database run migrate:resolve -- <migration-name>
```

---

## Rollback Procedure

### Rollback Database

```bash
# Restore from backup
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec -T postgres psql -U tpt_admin tpt_doctor < pre-upgrade-backup.sql

# Or use the restore script
docker compose -f infrastructure/on-premise/docker-compose.production.yml exec backup /usr/local/bin/restore.sh
```

### Rollback Code

```bash
# Git rollback
cd /opt/tpt-doctor
git log --oneline -10   # Find the previous working commit
git reset --hard <previous-commit-sha>

# Restart with previous version
docker compose -f infrastructure/on-premise/docker-compose.production.yml down
docker compose -f infrastructure/on-premise/docker-compose.production.yml up -d

# Verify
curl -f https://your-domain.com/api/v1/health
```

---

## Configuration Changes

### New environment variables

When upgrading, check `.env.production.example` for new variables:

```bash
# See what's new
diff .env .env.production.example

# Or update your .env with new defaults
# (manually review each new variable)
```

### Deprecated variables

Release notes will mention when a variable is deprecated. You may see a warning in the logs:

```
WARN: STORAGE_LEGACY_ENDPOINT is deprecated, use STORAGE_ENDPOINT instead
```

Remove deprecated variables after confirming the replacement works.

---

## Post-Upgrade Checklist

After any upgrade, verify:

- [ ] **Health endpoint returns 200:** `curl -f https://your-domain.com/api/v1/health`
- [ ] **Web app loads:** Visit the web app in a browser
- [ ] **Patient portal loads:** Visit the patient portal
- [ ] **Login works:** Authenticate with a test user
- [ ] **Telemedicine works:** Start a test video call
- [ ] **Migrations applied:** Check for pending migrations
- [ ] **No errors in logs:** `docker compose logs api | grep -i error`
- [ ] **All containers running:** `docker compose ps`

---

## Data Migration Notes

### Prisma Schema Changes

When upgrading between major versions, the Prisma schema may change. The migration process:

1. Creates new tables and columns
2. Preserves existing data
3. May require data backfilling for new required fields

Run migrations in a maintenance window to avoid data conflicts.

### Audit Log Chain Integrity

The audit log uses a SHA-256 cryptographic hash chain. Migrations do not modify existing audit entries. If the audit schema changes:
- New entries use the new format
- Old entries remain readable and their hash chain stays intact
- The `verifyAuditChain()` function handles mixed-format chains automatically

### Encryption Key Updates

If encryption algorithms change in a major version:
1. Existing data remains encrypted with the old key
2. The `KeyRotationManager` handles gradual re-encryption
3. Both old and new keys coexist during the transition period
4. See `packages/encryption/src/key-rotation.ts` for details

---

## Common Upgrade Issues

| Issue | Solution |
|-------|----------|
| **Migration fails with "relation already exists"** | Run `pnpm --filter @tpt-doctor/database run migrate:resolve -- rolled-back` to mark migration as applied, then re-run |
| **API crashes after upgrade** | Check logs: `docker compose logs api \| tail -50`. Common causes: missing env vars, database schema mismatch |
| **Web app shows blank page** | Clear browser cache. Check VITE_API_URL points to the correct API address |
| **"Token validation failed" after upgrade** | Auth0 keys may have rotated. Verify AUTH0_DOMAIN and AUTH0_AUDIENCE are correct |
| **Performance degradation** | Check if new indexes need to be created: `docker compose exec postgres psql -U tpt_admin -d tpt_doctor -c "SELECT * FROM pg_stat_all_indexes WHERE idx_scan = 0;"` |