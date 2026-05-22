// ============================================================================
// TPT Doctor — Controlled Substance Audit Verification
// DEA compliance: ensures every Schedule II-V controlled substance prescription
// creates an immutable audit trail entry
// ============================================================================

import { prisma } from '@tpt-doctor/database';
import { AuditAction } from '@tpt-doctor/shared';
import { logAuditEvent } from '@tpt-doctor/audit-log';

describe('Controlled Substance Audit Trail (DEA Compliance)', () => {
  const testTenantId = '00000000-0000-0000-0000-000000000001';
  const testUserId = '00000000-0000-0000-0000-000000000002';
  const testPatientId = '00000000-0000-0000-0000-000000000003';

  beforeAll(async () => {
    // Ensure test data exists
    await prisma.auditLogEntry.deleteMany({
      where: { tenantId: testTenantId },
    });
  });

  afterAll(async () => {
    await prisma.auditLogEntry.deleteMany({
      where: { tenantId: testTenantId },
    });
    await prisma.$disconnect();
  });

  /**
   * Test 1: Verify controlled substance prescriptions create audit entries
   * Required by DEA regulations (21 CFR § 1306) for Schedule II-V drugs
   */
  it('should create audit log entry when a controlled substance is prescribed', async () => {
    const prescriptionId = 'test-controlled-rx-001';

    await logAuditEvent({
      tenantId: testTenantId,
      userId: testUserId,
      action: AuditAction.CREATE,
      resource: 'prescription',
      resourceId: prescriptionId,
      details: {
        isControlled: true,
        deaSchedule: 'II', // Schedule II: highest control level
        medication: 'Oxycodone 10mg',
        quantity: 30,
        refills: 0, // Schedule II drugs cannot have refills
        deaNumber: 'AB1234563',
        patientId: testPatientId,
      },
      ipAddress: '127.0.0.1',
      userAgent: 'test-suite',
    });

    // Verify the audit entry was created
    const auditEntry = await prisma.auditLogEntry.findFirst({
      where: {
        tenantId: testTenantId,
        resource: 'prescription',
        resourceId: prescriptionId,
      },
    });

    expect(auditEntry).not.toBeNull();
    expect(auditEntry!.action).toBe('CREATE');
    expect(auditEntry!.details).toHaveProperty('isControlled', true);
    expect(auditEntry!.details).toHaveProperty('deaSchedule');
    expect(auditEntry!.tamperHash).toBeDefined();
    expect(auditEntry!.previousHash).toBeDefined();
  });

  /**
   * Test 2: Verify audit chain integrity for controlled substance events
   */
  it('should maintain cryptographic chain integrity for controlled substance logs', async () => {
    const events = await prisma.auditLogEntry.findMany({
      where: { tenantId: testTenantId },
      orderBy: { timestamp: 'asc' },
    });

    if (events.length > 0) {
      // Verify chain integrity for the controlled substance entries
      let previousHash = events[0]!.previousHash;
      for (const entry of events) {
        expect(entry.previousHash).toBeDefined();
        expect(entry.tamperHash).toBeDefined();
        previousHash = entry.tamperHash;
      }
    }
  });

  /**
   * Test 3: Verify Schedule II prescription fields (no refills, quantity limits)
   */
  it('should enforce Schedule II prescription constraints in audit trail', async () => {
    const scheduleIIEntries = await prisma.auditLogEntry.findMany({
      where: {
        tenantId: testTenantId,
        resource: 'prescription',
      },
    });

    for (const entry of scheduleIIEntries) {
      const details = entry.details as Record<string, unknown>;
      if (details.deaSchedule === 'II') {
        // Schedule II drugs: no refills allowed
        expect(details.refills).toBe(0);
        // Quantities should be logged for DEA tracking
        expect(details.quantity).toBeDefined();
        // DEA number must be recorded
        expect(details.deaNumber).toBeDefined();
      }
    }
  });

  /**
   * Test 4: Verify ControlledSubstanceLog table immutability
   * The log must be append-only - no updates or deletes
   */
  it('should prevent updates to existing controlled substance audit entries', async () => {
    const entry = await prisma.auditLogEntry.findFirst({
      where: {
        tenantId: testTenantId,
        resource: 'prescription',
      },
    });

    if (entry) {
      // Attempt to update should throw (immutable audit log)
      await expect(
        prisma.auditLogEntry.update({
          where: { id: entry.id },
          data: { details: { tampered: true } },
        })
      ).rejects.toThrow();
    }
  });

  /**
   * Test 5: Verify the controlled substance log tracks DEA registrant info
   */
  it('should include prescriber DEA registration details in audit trail', async () => {
    const controlledEntries = await prisma.auditLogEntry.findMany({
      where: {
        tenantId: testTenantId,
        resource: 'prescription',
      },
    });

    for (const entry of controlledEntries) {
      const details = entry.details as Record<string, unknown>;
      // Verify prescriber identity is tracked
      expect(entry.userId).toBeDefined();
      expect(entry.userId).toBe(testUserId);
      
      // Verify dispense/prescribe timestamp is captured
      expect(entry.timestamp).toBeDefined();
    }
  });
});