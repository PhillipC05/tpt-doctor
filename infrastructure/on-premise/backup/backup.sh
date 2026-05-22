#!/bin/bash
# ============================================================================
# TPT Doctor — Database Backup Script
# Uses pg_dump with encryption, compression, and rotation
# Supports local volume + MinIO/S3 off-site storage
# ============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
PG_HOST="${PG_HOST:-postgres}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${PG_USER:-tpt_admin}"
PG_DATABASE="${PG_DATABASE:-tpt_doctor}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-}"
STORAGE_ENDPOINT="${STORAGE_ENDPOINT:-}"
STORAGE_ACCESS_KEY="${STORAGE_ACCESS_KEY:-}"
STORAGE_SECRET_KEY="${STORAGE_SECRET_KEY:-}"
STORAGE_BUCKET="${STORAGE_BUCKET:-tpt-backups}"
BACKUP_TYPE="${BACKUP_TYPE:-full}"  # full, incremental
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${PG_DATABASE}_${TIMESTAMP}.sql.gz"
BACKUP_FILE_ENCRYPTED="${BACKUP_FILE}.enc"
LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

cleanup() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "${BACKUP_DIR}" -name "${PG_DATABASE}_*.sql.gz*" -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
    find "${BACKUP_DIR}" -name "${PG_DATABASE}_*.sql.gz.enc" -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
    find "${BACKUP_DIR}" -name "backup_*.log" -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
}

verify_pg_connection() {
    log "Verifying PostgreSQL connection to ${PG_HOST}:${PG_PORT}..."
    PGPASSWORD="${PG_PASSWORD}" pg_isready -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        log "ERROR: Cannot connect to PostgreSQL at ${PG_HOST}:${PG_PORT}"
        exit 1
    fi
    log "PostgreSQL connection OK"
}

create_backup() {
    log "Starting ${BACKUP_TYPE} backup of ${PG_DATABASE}..."

    # Create backup directory if it doesn't exist
    mkdir -p "${BACKUP_DIR}"

    # Run pg_dump with compression
    log "Running pg_dump..."
    PGPASSWORD="${PG_PASSWORD}" pg_dump \
        -h "${PG_HOST}" \
        -p "${PG_PORT}" \
        -U "${PG_USER}" \
        -d "${PG_DATABASE}" \
        --format=custom \
        --compress=9 \
        --verbose \
        --no-owner \
        --no-privileges \
        --no-comments \
        --file="${BACKUP_DIR}/${PG_DATABASE}_${TIMESTAMP}.dump" \
        2>> "${LOG_FILE}"

    DUMP_FILE="${BACKUP_DIR}/${PG_DATABASE}_${TIMESTAMP}.dump"
    log "pg_dump completed: $(du -h "${DUMP_FILE}" | cut -f1)"

    # Generate SHA-256 checksum for integrity verification
    sha256sum "${DUMP_FILE}" > "${DUMP_FILE}.sha256"
    log "Checksum: $(cat "${DUMP_FILE}.sha256")"

    # Encrypt backup if encryption key is provided
    if [ -n "${ENCRYPTION_KEY}" ]; then
        log "Encrypting backup with AES-256-CBC..."
        openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
            -in "${DUMP_FILE}" \
            -out "${DUMP_FILE}.enc" \
            -pass "pass:${ENCRYPTION_KEY}"
        rm -f "${DUMP_FILE}" "${DUMP_FILE}.sha256"
        log "Encrypted backup: $(du -h "${DUMP_FILE}.enc" | cut -f1)"
    fi
}

upload_to_s3() {
    if [ -z "${STORAGE_ENDPOINT}" ] || [ -z "${STORAGE_ACCESS_KEY}" ]; then
        log "S3 storage not configured, skipping off-site upload"
        return 0
    fi

    log "Uploading backup to S3-compatible storage at ${STORAGE_ENDPOINT}/${STORAGE_BUCKET}..."

    # Use mc (MinIO client) or aws CLI
    BACKUP_FILE="${DUMP_FILE}"
    if [ -n "${ENCRYPTION_KEY}" ]; then
        BACKUP_FILE="${DUMP_FILE}.enc"
    fi

    if command -v mc &> /dev/null; then
        # MinIO client
        mc alias set backup-target "${STORAGE_ENDPOINT}" "${STORAGE_ACCESS_KEY}" "${STORAGE_SECRET_KEY}" --api S3v4 2>> "${LOG_FILE}"
        mc mb "backup-target/${STORAGE_BUCKET}" --ignore-existing 2>> "${LOG_FILE}"
        mc cp "${BACKUP_FILE}" "backup-target/${STORAGE_BUCKET}/$(basename "${BACKUP_FILE}")" 2>> "${LOG_FILE}"
        mc cp "${BACKUP_FILE}.sha256" "backup-target/${STORAGE_BUCKET}/$(basename "${BACKUP_FILE}").sha256" 2>> "${LOG_FILE}"
    elif command -v aws &> /dev/null; then
        # AWS CLI
        export AWS_ACCESS_KEY_ID="${STORAGE_ACCESS_KEY}"
        export AWS_SECRET_ACCESS_KEY="${STORAGE_SECRET_KEY}"
        aws s3 cp "${BACKUP_FILE}" "s3://${STORAGE_BUCKET}/$(basename "${BACKUP_FILE}")" \
            --endpoint-url "${STORAGE_ENDPOINT}" 2>> "${LOG_FILE}"
        aws s3 cp "${BACKUP_FILE}.sha256" "s3://${STORAGE_BUCKET}/$(basename "${BACKUP_FILE}").sha256" \
            --endpoint-url "${STORAGE_ENDPOINT}" 2>> "${LOG_FILE}"
    fi

    log "Upload completed"
}

restore_test() {
    # Verify backup integrity by attempting to read it
    log "Verifying backup integrity..."
    if [ -n "${ENCRYPTION_KEY}" ]; then
        openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
            -in "${DUMP_FILE}.enc" \
            -out /dev/null \
            -pass "pass:${ENCRYPTION_KEY}" 2>> "${LOG_FILE}"
        log "Encryption verification: PASSED"
    fi

    # Verify checksum
    if [ -f "${DUMP_FILE}.sha256" ]; then
        sha256sum -c "${DUMP_FILE}.sha256" >> "${LOG_FILE}" 2>&1
        log "Checksum verification: PASSED"
    fi
}

# Main execution
log "=========================================="
log "TPT Doctor Database Backup"
log "Type: ${BACKUP_TYPE}"
log "Database: ${PG_DATABASE}@${PG_HOST}:${PG_PORT}"
log "=========================================="

verify_pg_connection
create_backup
upload_to_s3
restore_test
cleanup

log "=========================================="
log "Backup completed successfully"
log "Backup file: ${DUMP_FILE}${ENCRYPTION_KEY:+'.enc'}"
log "Log file: ${LOG_FILE}"
log "=========================================="