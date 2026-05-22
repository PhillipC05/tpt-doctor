#!/bin/bash
# ============================================================================
# TPT Doctor — Database Restore Script
# Restores from encrypted or plain backup files
# ============================================================================

set -euo pipefail

# Configuration
BACKUP_FILE="${1:-}"
PG_HOST="${PG_HOST:-postgres}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${PG_USER:-tpt_admin}"
PG_DATABASE="${PG_DATABASE:-tpt_doctor}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

if [ -z "${BACKUP_FILE}" ]; then
    echo "Usage: $0 <backup-file.dump|backup-file.dump.enc>"
    echo ""
    echo "Examples:"
    echo "  $0 /backups/tpt_doctor_20240101_000000.dump"
    echo "  $0 /backups/tpt_doctor_20240101_000000.dump.enc"
    echo ""
    echo "Available backups:"
    ls -1 /backups/*.dump* 2>/dev/null || echo "  (no backups found)"
    exit 1
fi

# Check if file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    log "ERROR: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

PGPASSWORD="${PG_PASSWORD:-}"

if [ -z "${PGPASSWORD}" ]; then
    log "WARNING: PG_PASSWORD environment variable not set"
fi

# Decrypt if needed
RESTORE_FILE="${BACKUP_FILE}"
if [[ "${BACKUP_FILE}" == *.enc ]]; then
    if [ -z "${ENCRYPTION_KEY}" ]; then
        log "ERROR: ENCRYPTION_KEY required to decrypt backup"
        exit 1
    fi
    log "Decrypting backup..."
    RESTORE_FILE="${BACKUP_FILE%.enc}"
    openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
        -in "${BACKUP_FILE}" \
        -out "${RESTORE_FILE}" \
        -pass "pass:${ENCRYPTION_KEY}"
    log "Decrypted to ${RESTORE_FILE}"
fi

# Verify checksum
if [ -f "${RESTORE_FILE}.sha256" ]; then
    log "Verifying checksum..."
    sha256sum -c "${RESTORE_FILE}.sha256"
    log "Checksum: PASSED"
fi

log "Starting restore of ${RESTORE_FILE} to ${PG_DATABASE}@${PG_HOST}:${PG_PORT}..."

# Terminate existing connections and drop/recreate database
log "Preparing database..."
PGPASSWORD="${PG_PASSWORD}" psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" -d postgres <<SQL
    SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${PG_DATABASE}' AND pid <> pg_backend_pid();
    DROP DATABASE IF EXISTS ${PG_DATABASE};
    CREATE DATABASE ${PG_DATABASE};
SQL

# Restore from custom format dump
log "Running pg_restore..."
PGPASSWORD="${PG_PASSWORD}" pg_restore \
    -h "${PG_HOST}" \
    -p "${PG_PORT}" \
    -U "${PG_USER}" \
    -d "${PG_DATABASE}" \
    --format=custom \
    --verbose \
    --no-owner \
    --no-privileges \
    "${RESTORE_FILE}"

log "=========================================="
log "Restore completed successfully"
log "=========================================="