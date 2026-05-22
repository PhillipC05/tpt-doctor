// ============================================================================
// TPT Doctor — Australia (AU) Country Profile Service (Phase 11)
// ============================================================================

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction } from '@tpt-doctor/shared';

@Injectable()
export class AuService {
  // ======================================================================
  // MBS Claiming
  // ======================================================================

  async submitMbsClaim(data: any, tenantId: string, userId: string) {
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const claim = await prisma.mbsClaimSubmission.create({
      data: {
        tenantId,
        patientId: data.patientId,
        claimNumber: `MBS-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        items: data.items || [],
        totalAmount: data.totalAmount || 0,
        totalBenefit: data.totalBenefit || 0,
        submissionMethod: data.submissionMethod || 'MEDICARE_ONLINE',
        submissionChannel: data.submissionChannel || 'ELECTRONIC',
        status: data.status || 'DRAFT',
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'MbsClaimSubmission', resourceId: claim.id, details: { claimNumber: claim.claimNumber }, ipAddress: '0.0.0.0' });
    return claim;
  }

  async listMbsClaims(tenantId: string, patientId?: string, status?: string, page: number = 1, pageSize: number = 20) {
    const where: any = { tenantId };
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.mbsClaimSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.mbsClaimSubmission.count({ where }),
    ]);
    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async getMbsClaim(id: string, tenantId: string) {
    const claim = await prisma.mbsClaimSubmission.findFirst({ where: { id, tenantId } });
    if (!claim) throw new NotFoundException('MBS claim not found');
    return claim;
  }

  async listMbsItems(itemType?: string, search?: string) {
    const where: any = { isActive: true };
    if (itemType) where.itemType = itemType;
    if (search) {
      where.OR = [
        { itemNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    return prisma.mbsItem.findMany({ where, orderBy: { itemNumber: 'asc' } });
  }

  // ======================================================================
  // PBS Prescriptions
  // ======================================================================

  async submitPbsPrescription(data: any, tenantId: string, userId: string) {
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const prescription = await prisma.pbsPrescription.create({
      data: {
        tenantId,
        patientId: data.patientId,
        staffId: data.staffId || userId,
        pbsCode: data.pbsCode,
        medicationName: data.medicationName,
        strength: data.strength,
        quantity: data.quantity,
        repeats: data.repeats || 0,
        category: data.category || 'GENERAL',
        safetyNetEntitlement: data.safetyNetEntitlement || false,
        concessionCardNumber: data.concessionCardNumber || null,
        authorityPrescription: data.authorityPrescription || false,
        authorityNumber: data.authorityNumber || null,
        streamlinedAuthority: data.streamlinedAuthority || false,
        specialContributions: data.specialContributions || false,
        status: 'DRAFT',
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'PbsPrescription', resourceId: prescription.id, details: { pbsCode: data.pbsCode }, ipAddress: '0.0.0.0' });
    return prescription;
  }

  async listPbsPrescriptions(tenantId: string, patientId?: string, status?: string, page: number = 1, pageSize: number = 20) {
    const where: any = { tenantId };
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.pbsPrescription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.pbsPrescription.count({ where }),
    ]);
    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  // ======================================================================
  // My Health Record
  // ======================================================================

  async submitMyHealthRecordDocument(data: any, tenantId: string, userId: string) {
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const doc = await prisma.myHealthRecordDocument.create({
      data: {
        tenantId,
        patientId: data.patientId,
        documentType: data.documentType,
        clinicalDocId: data.clinicalDocId || `CDOC-${Date.now()}`,
        title: data.title,
        description: data.description || null,
        authoredAt: new Date(data.authoredAt || Date.now()),
        status: data.status || 'PENDING',
        ihiNumber: data.ihiNumber,
        source: data.source || 'TPT_DOCTOR',
        documentPayload: data.documentPayload || null,
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'MyHealthRecordDocument', resourceId: doc.id, details: { documentType: data.documentType }, ipAddress: '0.0.0.0' });
    return doc;
  }

  async listMyHealthRecordDocuments(tenantId: string, patientId?: string, status?: string, page: number = 1, pageSize: number = 20) {
    const where: any = { tenantId };
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.myHealthRecordDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.myHealthRecordDocument.count({ where }),
    ]);
    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  // ======================================================================
  // AIR (Australian Immunisation Register)
  // ======================================================================

  async submitAirRecord(data: any, tenantId: string, userId: string) {
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const record = await prisma.airRecordSubmission.create({
      data: {
        tenantId,
        patientId: data.patientId,
        vaccineName: data.vaccineName,
        airVaccineCode: data.airVaccineCode,
        administrationDate: new Date(data.administrationDate),
        doseNumber: data.doseNumber,
        lotNumber: data.lotNumber,
        manufacturer: data.manufacturer,
        administeringStaffId: data.administeringStaffId || userId,
        status: 'PENDING',
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'AirRecordSubmission', resourceId: record.id, details: { vaccineName: data.vaccineName }, ipAddress: '0.0.0.0' });
    return record;
  }

  async listAirRecords(tenantId: string, patientId?: string, status?: string, page: number = 1, pageSize: number = 20) {
    const where: any = { tenantId };
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.airRecordSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.airRecordSubmission.count({ where }),
    ]);
    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  // ======================================================================
  // PIP Reports
  // ======================================================================

  async getPipReports(tenantId: string, reportPeriod?: string) {
    const where: any = { tenantId };
    if (reportPeriod) where.reportPeriod = reportPeriod;
    return prisma.pipReport.findMany({ where, orderBy: { reportPeriod: 'desc' } });
  }

  async generatePipReport(data: any, tenantId: string, userId: string) {
    const report = await prisma.pipReport.create({
      data: {
        tenantId,
        reportPeriod: data.reportPeriod,
        reportType: data.reportType || 'QUALITY_IMPROVEMENT',
        indicators: data.indicators || [],
        totalIncentive: data.totalIncentive || 0,
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'PipReport', resourceId: report.id, details: { reportPeriod: data.reportPeriod }, ipAddress: '0.0.0.0' });
    return report;
  }
}