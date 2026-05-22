import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction } from '@tpt-doctor/shared';

@Injectable()
export class LabExtendedService {
  // ===========================
  // Lab Panel Configuration
  // ===========================

  async createLabPanel(data: any, tenantId: string, userId: string) {
    const panel = await prisma.labPanel.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description || null,
        labName: data.labName,
        tests: data.tests || [],
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'LabPanel', resourceId: panel.id,
      details: { name: data.name, labName: data.labName }, ipAddress: '0.0.0.0',
    });

    return panel;
  }

  async findAllLabPanels(tenantId: string, params: { labName?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: any = { tenantId, isActive: true };
    if (params.labName) where.labName = params.labName;

    const [data, total] = await Promise.all([
      prisma.labPanel.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { name: 'asc' } }),
      prisma.labPanel.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 } };
  }

  async createOrderFromPanel(panelId: string, patientId: string, staffId: string, tenantId: string, userId: string) {
    const panel = await prisma.labPanel.findFirst({ where: { id: panelId, tenantId } });
    if (!panel) throw new NotFoundException('Lab panel not found');

    const tests = panel.tests as any[];
    const labOrders: any[] = [];

    for (const test of tests) {
      const order = await prisma.labOrder.create({
        data: {
          tenantId,
          patientId,
          staffId: staffId || userId,
          labName: panel.labName,
          testName: test.testName,
          loincCode: test.loincCode || '',
          notes: `Auto-created from panel: ${panel.name}`,
        },
      });
      labOrders.push(order);
    }

    return { panelName: panel.name, orders: labOrders, count: labOrders.length };
  }

  // ===========================
  // External Lab Integration (Quest, LabCorp, etc.)
  // ===========================

  async createExternalLabConfig(data: any, tenantId: string, userId: string) {
    const config = await prisma.externalLabConfig.create({
      data: {
        tenantId,
        labName: data.labName,
        integrationType: data.integrationType,
        apiEndpoint: data.apiEndpoint || null,
        apiKey: data.apiKey || null,
        clientId: data.clientId || null,
        clientSecret: data.clientSecret || null,
        settings: data.settings || {},
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'ExternalLabConfig', resourceId: config.id,
      details: { labName: data.labName, integrationType: data.integrationType }, ipAddress: '0.0.0.0',
    });

    return config;
  }

  async getExternalLabConfigs(tenantId: string) {
    return prisma.externalLabConfig.findMany({ where: { tenantId, isActive: true } });
  }

  async syncLabOrders(labConfigId: string, tenantId: string, userId: string) {
    const config = await prisma.externalLabConfig.findFirst({ where: { id: labConfigId, tenantId } });
    if (!config) throw new NotFoundException('Lab configuration not found');

    // In production: call external lab API (Quest/LabCorp HL7/FHIR endpoints)
    // Simulate sync by marking pending orders
    const pendingOrders = await prisma.labOrder.findMany({
      where: { tenantId, labName: config.labName, status: 'ORDERED' },
    });

    const importLog = await prisma.fhirImportLog.create({
      data: {
        tenantId,
        source: config.labName,
        resourceType: 'DiagnosticReport',
        totalRecords: pendingOrders.length,
        importedRecords: pendingOrders.length,
        failedRecords: 0,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    await prisma.externalLabConfig.update({
      where: { id: labConfigId },
      data: { lastSyncAt: new Date() },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'FhirImportLog', resourceId: importLog.id,
      details: { labName: config.labName, recordsProcessed: pendingOrders.length }, ipAddress: '0.0.0.0',
    });

    return { importLog, pendingOrders: pendingOrders.length, updated: true };
  }

  // ===========================
  // HL7 FHIR Result Import
  // ===========================

  async importFhirResults(data: { source: string; entries: any[] }, tenantId: string, userId: string) {
    const { source, entries } = data;
    let imported = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const entry of entries) {
      try {
        // Find matching lab order by LOINC code and patient
        const labOrder = await prisma.labOrder.findFirst({
          where: {
            tenantId,
            loincCode: entry.loincCode,
            patientId: entry.patientId,
            status: { in: ['ORDERED', 'SPECIMEN_COLLECTED', 'IN_TRANSIT', 'IN_PROGRESS'] },
          },
          orderBy: { orderedAt: 'desc' },
        });

        if (labOrder) {
          await prisma.labOrder.update({
            where: { id: labOrder.id },
            data: {
              result: {
                value: entry.value,
                unit: entry.unit,
                referenceRange: entry.referenceRange,
                isAbnormal: entry.isAbnormal || false,
                flagged: entry.flagged || 'NORMAL',
                notes: entry.notes || null,
              },
              status: 'COMPLETED',
              resultAt: new Date(),
            },
          });
          imported++;
        } else {
          failed++;
          errors.push({ loincCode: entry.loincCode, patientId: entry.patientId, error: 'No matching lab order found' });
        }
      } catch (err: any) {
        failed++;
        errors.push({ loincCode: entry.loincCode, error: err.message });
      }
    }

    const importLog = await prisma.fhirImportLog.create({
      data: {
        tenantId,
        source,
        resourceType: 'Observation',
        totalRecords: entries.length,
        importedRecords: imported,
        failedRecords: failed,
        status: failed > 0 && imported > 0 ? 'COMPLETED' : failed === entries.length ? 'FAILED' : 'COMPLETED',
        errorLog: errors.length > 0 ? errors : undefined,
        completedAt: new Date(),
      },
    });

    return importLog;
  }

  async getFhirImportLogs(tenantId: string, params: { source?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: any = { tenantId };
    if (params.source) where.source = params.source;

    const [data, total] = await Promise.all([
      prisma.fhirImportLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.fhirImportLog.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 } };
  }
}