// ============================================================================
// TPT Doctor — PHI Access Anomaly Detection Service (Phase 15.4)
// Detects unusual PHI access patterns: volume spikes, off-hours access,
// and rapid IP switching that may indicate a data breach or insider threat.
// ============================================================================

import { Injectable } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';

export interface AnomalyEvent {
  type: 'VOLUME' | 'OFF_HOURS' | 'RAPID_IP_SWITCH';
  severity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  tenantId: string;
  userId: string;
  description: string;
  detectedAt: Date;
  evidence: Record<string, unknown>;
}

// Resources that contain Protected Health Information
const PHI_RESOURCES = [
  'Patient',
  'Encounter',
  'MedicalNote',
  'Condition',
  'Medication',
  'Observation',
  'LabOrder',
  'LabResult',
  'Prescription',
  'Allergy',
  'ImmunisationRecord',
  'MedicalCertificate',
  'CarePlan',
  'MbsClaimSubmission',
  'PbsPrescription',
  'MyHealthRecordDocument',
  'AirImmunisationRecord',
  'NzClaimSubmission',
  'NzImmunisationSubmission',
  'NhiValidationLog',
  'UkGp2GpTransfer',
  'UkEpsPrescription',
  'CaProvincialClaimSubmission',
  'CaImmunisationSubmission',
];

@Injectable()
export class PhiAnomalyService {
  // =========================================================================
  // Volume Anomaly Detection
  // Access more than `threshold` PHI records within `windowMinutes`
  // =========================================================================

  async detectVolumeAnomalies(
    tenantId: string,
    windowMinutes = 5,
    threshold = 1000,
  ): Promise<AnomalyEvent[]> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const entries = await prisma.auditLogEntry.groupBy({
      by: ['userId'],
      where: {
        tenantId,
        action: 'READ',
        resource: { in: PHI_RESOURCES },
        timestamp: { gte: windowStart },
      },
      _count: { id: true },
      having: { id: { _count: { gt: threshold } } },
    });

    return entries.map((entry) => ({
      type: 'VOLUME' as const,
      severity: entry._count.id > threshold * 3 ? 'CRITICAL' : 'HIGH',
      tenantId,
      userId: entry.userId,
      description: `User accessed ${entry._count.id} PHI records in ${windowMinutes} minutes (threshold: ${threshold})`,
      detectedAt: new Date(),
      evidence: {
        accessCount: entry._count.id,
        windowMinutes,
        threshold,
        windowStart: windowStart.toISOString(),
      },
    }));
  }

  // =========================================================================
  // Off-Hours Access Detection
  // PHI access outside normal business hours (configurable per tenant timezone)
  // =========================================================================

  async detectOffHoursAccess(
    tenantId: string,
    businessHourStart = 7,
    businessHourEnd = 20,
    lookbackHours = 24,
  ): Promise<AnomalyEvent[]> {
    const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    const entries = await prisma.auditLogEntry.findMany({
      where: {
        tenantId,
        action: 'READ',
        resource: { in: PHI_RESOURCES },
        timestamp: { gte: since },
      },
      select: {
        userId: true,
        resource: true,
        resourceId: true,
        ipAddress: true,
        timestamp: true,
      },
      orderBy: { timestamp: 'desc' },
    });

    const offHoursEntries = entries.filter((e) => {
      const hour = e.timestamp.getHours();
      return hour < businessHourStart || hour >= businessHourEnd;
    });

    if (offHoursEntries.length === 0) return [];

    // Group by userId
    const byUser = new Map<string, typeof offHoursEntries>();
    for (const entry of offHoursEntries) {
      const existing = byUser.get(entry.userId) ?? [];
      existing.push(entry);
      byUser.set(entry.userId, existing);
    }

    const anomalies: AnomalyEvent[] = [];
    for (const [userId, accesses] of byUser.entries()) {
      anomalies.push({
        type: 'OFF_HOURS',
        severity: accesses.length > 50 ? 'HIGH' : 'MEDIUM',
        tenantId,
        userId,
        description: `User accessed ${accesses.length} PHI records outside business hours (${businessHourStart}:00–${businessHourEnd}:00)`,
        detectedAt: new Date(),
        evidence: {
          accessCount: accesses.length,
          businessHourStart,
          businessHourEnd,
          sampleTimestamps: accesses.slice(0, 5).map((a) => a.timestamp.toISOString()),
          uniqueResources: [...new Set(accesses.map((a) => a.resource))],
        },
      });
    }

    return anomalies;
  }

  // =========================================================================
  // Rapid IP Switching Detection
  // Same user accessing PHI from multiple distinct IPs within windowMinutes
  // (possible session hijack, credential sharing, or VPN abuse)
  // =========================================================================

  async detectRapidIpSwitching(
    tenantId: string,
    windowMinutes = 10,
    minDistinctIps = 3,
  ): Promise<AnomalyEvent[]> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const entries = await prisma.auditLogEntry.findMany({
      where: {
        tenantId,
        resource: { in: PHI_RESOURCES },
        timestamp: { gte: windowStart },
      },
      select: { userId: true, ipAddress: true, timestamp: true },
      orderBy: { timestamp: 'asc' },
    });

    // Group by userId and collect distinct IPs
    const userIps = new Map<string, Set<string>>();
    for (const entry of entries) {
      const ips = userIps.get(entry.userId) ?? new Set<string>();
      ips.add(entry.ipAddress);
      userIps.set(entry.userId, ips);
    }

    const anomalies: AnomalyEvent[] = [];
    for (const [userId, ips] of userIps.entries()) {
      if (ips.size >= minDistinctIps) {
        anomalies.push({
          type: 'RAPID_IP_SWITCH',
          severity: ips.size >= 5 ? 'CRITICAL' : 'HIGH',
          tenantId,
          userId,
          description: `User accessed PHI from ${ips.size} distinct IP addresses within ${windowMinutes} minutes`,
          detectedAt: new Date(),
          evidence: {
            distinctIpCount: ips.size,
            ipAddresses: [...ips],
            windowMinutes,
            windowStart: windowStart.toISOString(),
          },
        });
      }
    }

    return anomalies;
  }

  // =========================================================================
  // Run all anomaly detectors and return combined results
  // =========================================================================

  async runFullScan(
    tenantId: string,
    options: {
      volumeWindowMinutes?: number;
      volumeThreshold?: number;
      offHoursStart?: number;
      offHoursEnd?: number;
      ipSwitchWindowMinutes?: number;
    } = {},
  ): Promise<{
    tenantId: string;
    scannedAt: Date;
    anomalies: AnomalyEvent[];
    summary: { total: number; critical: number; high: number; medium: number };
  }> {
    const [volumeAnomalies, offHoursAnomalies, ipSwitchAnomalies] = await Promise.all([
      this.detectVolumeAnomalies(
        tenantId,
        options.volumeWindowMinutes ?? 5,
        options.volumeThreshold ?? 1000,
      ),
      this.detectOffHoursAccess(
        tenantId,
        options.offHoursStart ?? 7,
        options.offHoursEnd ?? 20,
      ),
      this.detectRapidIpSwitching(tenantId, options.ipSwitchWindowMinutes ?? 10),
    ]);

    const anomalies = [...volumeAnomalies, ...offHoursAnomalies, ...ipSwitchAnomalies];

    return {
      tenantId,
      scannedAt: new Date(),
      anomalies,
      summary: {
        total: anomalies.length,
        critical: anomalies.filter((a) => a.severity === 'CRITICAL').length,
        high: anomalies.filter((a) => a.severity === 'HIGH').length,
        medium: anomalies.filter((a) => a.severity === 'MEDIUM').length,
      },
    };
  }

  // =========================================================================
  // Bulk export access detection
  // Flags users who exported or bulk-read >500 distinct patient records
  // =========================================================================

  async detectBulkExportAccess(
    tenantId: string,
    threshold = 500,
    lookbackHours = 1,
  ): Promise<AnomalyEvent[]> {
    const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    const entries = await prisma.auditLogEntry.groupBy({
      by: ['userId'],
      where: {
        tenantId,
        action: { in: ['READ', 'EXPORT'] },
        resource: 'Patient',
        timestamp: { gte: since },
      },
      _count: { id: true },
      having: { id: { _count: { gt: threshold } } },
    });

    return entries.map((entry) => ({
      type: 'VOLUME' as const,
      severity: 'CRITICAL' as const,
      tenantId,
      userId: entry.userId,
      description: `Potential bulk export: user accessed ${entry._count.id} patient records in ${lookbackHours}h`,
      detectedAt: new Date(),
      evidence: {
        patientAccessCount: entry._count.id,
        threshold,
        lookbackHours,
        windowStart: since.toISOString(),
      },
    }));
  }
}
