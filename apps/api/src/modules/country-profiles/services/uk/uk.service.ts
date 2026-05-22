// ============================================================================
// TPT Doctor — United Kingdom (UK) Country Profile Service (Phase 11)
// ============================================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction } from '@tpt-doctor/shared';

@Injectable()
export class UkService {
  // ======================================================================
  // GP2GP Record Transfer
  // ======================================================================

  async createGp2GpTransfer(data: any, tenantId: string, userId: string) {
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const transfer = await prisma.ukGp2GpTransfer.create({
      data: {
        tenantId,
        patientId: data.patientId,
        direction: data.direction || 'INCOMING',
        transferId: data.transferId || `GP2GP-${Date.now()}`,
        requestingPractice: data.requestingPractice,
        sendingPractice: data.sendingPractice,
        patientNhsNumber: data.patientNhsNumber,
        status: 'PENDING',
        recordPayload: data.recordPayload || null,
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'UkGp2GpTransfer', resourceId: transfer.id, details: { direction: data.direction }, ipAddress: '0.0.0.0' });
    return transfer;
  }

  async listGp2GpTransfers(tenantId: string, status?: string, page: number = 1, pageSize: number = 20) {
    const where: any = { tenantId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.ukGp2GpTransfer.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.ukGp2GpTransfer.count({ where }),
    ]);
    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  // ======================================================================
  // QOF (Quality and Outcomes Framework) Reporting
  // ======================================================================

  async getQofReports(tenantId: string, reportPeriod?: string) {
    const where: any = { tenantId };
    if (reportPeriod) where.reportPeriod = reportPeriod;
    return prisma.ukQofReport.findMany({ where, orderBy: { reportPeriod: 'desc' } });
  }

  async generateQofReport(data: any, tenantId: string, userId: string) {
    const report = await prisma.ukQofReport.create({
      data: {
        tenantId,
        practiceOdsCode: data.practiceOdsCode,
        reportPeriod: data.reportPeriod,
        indicatorGroups: data.indicatorGroups || [],
        totalPoints: data.totalPoints || 0,
        totalAchieved: data.totalAchieved || 0,
        totalPayment: data.totalPayment || 0,
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'UkQofReport', resourceId: report.id, details: { reportPeriod: data.reportPeriod }, ipAddress: '0.0.0.0' });
    return report;
  }

  // ======================================================================
  // GP Connect API
  // ======================================================================

  async createGpConnectInteraction(data: any, tenantId: string, userId: string) {
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const interaction = await prisma.ukGpConnectInteraction.create({
      data: {
        tenantId,
        patientId: data.patientId,
        interactionType: data.interactionType,
        gpConnectRef: data.gpConnectRef || `GPC-${Date.now()}`,
        status: 'PENDING',
        requestPayload: data.requestPayload || null,
        responsePayload: data.responsePayload || null,
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'UkGpConnectInteraction', resourceId: interaction.id, details: { interactionType: data.interactionType }, ipAddress: '0.0.0.0' });
    return interaction;
  }

  // ======================================================================
  // Spine (PDS, SCR)
  // ======================================================================

  async createSpineInteraction(data: any, tenantId: string, userId: string) {
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const interaction = await prisma.ukSpineInteraction.create({
      data: {
        tenantId,
        patientId: data.patientId,
        patientNhsNumber: data.patientNhsNumber,
        interactionType: data.interactionType,
        spineRef: data.spineRef || `SPINE-${Date.now()}`,
        status: 'PENDING',
        requestPayload: data.requestPayload || null,
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'UkSpineInteraction', resourceId: interaction.id, details: { interactionType: data.interactionType }, ipAddress: '0.0.0.0' });
    return interaction;
  }

  // ======================================================================
  // Electronic Prescription Service (EPS)
  // ======================================================================

  async submitEpsPrescription(data: any, tenantId: string, userId: string) {
    const prescription = await prisma.ukEpsPrescription.create({
      data: {
        tenantId,
        prescriptionId: data.prescriptionId,
        epsGuid: data.epsGuid || `EPS-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        nominatedPharmacy: data.nominatedPharmacy || null,
        prescriptionType: data.prescriptionType || 'ACUTE',
        dosageText: data.dosageText,
        quantity: data.quantity,
        numberOfRepeats: data.numberOfRepeats || 0,
        status: 'PENDING',
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'UkEpsPrescription', resourceId: prescription.id, details: { epsGuid: prescription.epsGuid }, ipAddress: '0.0.0.0' });
    return prescription;
  }

  async listEpsPrescriptions(tenantId: string, status?: string, page: number = 1, pageSize: number = 20) {
    const where: any = { tenantId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.ukEpsPrescription.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.ukEpsPrescription.count({ where }),
    ]);
    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }
}