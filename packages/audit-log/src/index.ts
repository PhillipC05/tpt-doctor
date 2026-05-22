// ============================================================================
// TPT Doctor — Audit Log Service (HIPAA-compliant immutable audit trail)
// Uses cryptographic chaining to detect tampering
// ============================================================================

import { prisma } from '@tpt-doctor/database';
import { AuditAction, AuditLogEntry } from '@tpt-doctor/shared';
import * as crypto from 'crypto';

/**
 * Compute a SHA-256 hash of audit entry data for tamper detection
 */
export function computeHash(entry: {
  tenantId: string;
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string | null;
  timestamp: Date;
  previousHash: string;
}): string {
  const data = [
    entry.tenantId,
    entry.userId,
    entry.action,
    entry.resource,
    entry.resourceId,
    JSON.stringify(entry.details),
    entry.ipAddress,
    entry.userAgent || '',
    entry.timestamp.toISOString(),
    entry.previousHash,
  ].join('|');
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Log an auditable action. Returns the created audit log entry.
 */
export async function logAuditEvent(params: {
  tenantId: string;
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
}): Promise<void> {
  // Get the most recent audit log entry to chain hashes
  const lastEntry = await prisma.auditLogEntry.findFirst({
    where: { tenantId: params.tenantId },
    orderBy: { timestamp: 'desc' },
  });

  const previousHash = lastEntry?.tamperHash || crypto.createHash('sha256').update('GENESIS').digest('hex');
  const timestamp = new Date();

  const tamperHash = computeHash({
    tenantId: params.tenantId,
    userId: params.userId,
    action: params.action,
    resource: params.resource,
    resourceId: params.resourceId,
      details: (params.details || {}) as any,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent || null,
    timestamp,
    previousHash,
  });

  await prisma.auditLogEntry.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: (params.details || {}) as any,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent || null,
      timestamp,
      tamperHash,
      previousHash,
    },
  });
}

/**
 * Verify the integrity of the audit log chain for a tenant.
 * Returns true if the chain is intact, false if tampering is detected.
 */
export async function verifyAuditChain(tenantId: string): Promise<boolean> {
  const entries = await prisma.auditLogEntry.findMany({
    where: { tenantId },
    orderBy: { timestamp: 'asc' },
  });

  if (entries.length === 0) return true;

  let previousHash = crypto.createHash('sha256').update('GENESIS').digest('hex');

  for (const entry of entries) {
    const expectedHash = computeHash({
      tenantId: entry.tenantId,
      userId: entry.userId,
      action: entry.action as AuditAction,
      resource: entry.resource,
      resourceId: entry.resourceId,
      details: entry.details as Record<string, unknown>,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      timestamp: entry.timestamp,
      previousHash,
    });

    if (entry.tamperHash !== expectedHash) {
      return false; // Tampering detected
    }
    if (entry.previousHash !== previousHash) {
      return false; // Chain broken
    }
    previousHash = entry.tamperHash;
  }

  return true;
}

/**
 * Search audit logs with filtering
 */
export async function searchAuditLogs(params: {
  tenantId: string;
  userId?: string;
  action?: AuditAction;
  resource?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}) {
  const where: Record<string, unknown> = { tenantId: params.tenantId };
  if (params.userId) where.userId = params.userId;
  if (params.action) where.action = params.action;
  if (params.resource) where.resource = params.resource;
  if (params.resourceId) where.resourceId = params.resourceId;
  if (params.startDate || params.endDate) {
    where.timestamp = {};
    if (params.startDate) (where.timestamp as Record<string, unknown>).gte = params.startDate;
    if (params.endDate) (where.timestamp as Record<string, unknown>).lte = params.endDate;
  }

  const page = params.page || 1;
  const pageSize = params.pageSize || 50;

  const [data, total] = await Promise.all([
    prisma.auditLogEntry.findMany({
      where: where as any,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    }),
    prisma.auditLogEntry.count({ where: where as any }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
      hasPrevious: page > 1,
    },
  };
}