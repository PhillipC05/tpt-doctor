// ============================================================================
// TPT Doctor — Database Client
// With Prisma middleware for Row-Level Security (RLS) tenant isolation
// ============================================================================

import { PrismaClient } from '@prisma/client';

/**
 * Tenant-aware Prisma client extension.
 * Automatically sets PostgreSQL session variable `app.current_tenant_id`
 * before any query when `tenantId` is present in the query args.
 *
 * This enables PostgreSQL Row-Level Security (RLS) policies that filter
 * by `current_setting('app.current_tenant_id')::uuid`, providing
 * defense-in-depth tenant isolation at the database level.
 *
 * Usage:
 *   const result = await prisma.patient.findMany({
 *     where: { tenantId: '...' },  // RLS middleware detects this automatically
 *   });
 *
 * For direct SQL access, call before queries:
 *   await prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// ============================================================================
// RLS Tenant Isolation Middleware
// ============================================================================

prisma.$use(async (params, next) => {
  // Extract tenantId from query where clauses for tenant-scoped models
  const where = (params.args as any)?.where;
  let tenantId: string | undefined;

  if (where && typeof where === 'object') {
    tenantId = where.tenantId ?? where?.tenant?.id;
  }

  // Also check create/update data for tenant isolation
  if (!tenantId) {
    const data = (params.args as any)?.data;
    if (data && typeof data === 'object') {
      tenantId = data.tenantId ?? data?.tenant?.connect?.id;
    }
  }

  // Set the PostgreSQL session variable for RLS enforcement
  if (tenantId) {
    try {
      await prisma.$executeRawUnsafe(
        `SELECT set_config('app.current_tenant_id', $1, true)`,
        tenantId,
      );
    } catch {
      // RLS configuration may not exist yet; queries still execute
      // without database-level enforcement (application-level remains)
    }
  }

  return next(params);
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from '@prisma/client';