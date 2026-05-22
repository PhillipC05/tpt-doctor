// ============================================================================
// TPT Doctor — New Zealand (NZ) Country Profile Service (Phase 11)
// ============================================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction } from '@tpt-doctor/shared';

@Injectable()
export class NzService {
  // ======================================================================
  // MOH Claiming
  // ======================================================================

  async submitClaim(data: any, tenantId: string, userId: string) {
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const claim = await prisma.nzClaimSubmission.create({
      data: {
        tenantId,
        patientId: data.patientId,
        claimType: data.claimType,
        claimNumber: `NZ-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        serviceDate: new Date(data.serviceDate || Date.now()),
        items: data.items || [],
        totalAmount: data.totalAmount || 0,
        subsidyAmount: data.subsidyAmount || 0,
        patientCoPay: data.patientCoPay || 0,
        submissionMethod: data.submissionMethod || 'PORTAL',
        status: 'DRAFT',
        phoOrgId: data.phoOrgId || null,
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'NzClaimSubmission', resourceId: claim.id, details: { claimType: data.claimType }, ipAddress: '0.0.0.0' });
    return claim;
  }

  async listClaims(tenantId: string, patientId?: string, status?: string, page: number = 1, pageSize: number = 20) {
    const where: any = { tenantId };
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.nzClaimSubmission.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.nzClaimSubmission.count({ where }),
    ]);
    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async getClaim(id: string, tenantId: string) {
    const claim = await prisma.nzClaimSubmission.findFirst({ where: { id, tenantId } });
    if (!claim) throw new NotFoundException('NZ claim not found');
    return claim;
  }

  // ======================================================================
  // PHO Reporting
  // ======================================================================

  async getPhoReports(tenantId: string, reportPeriod?: string) {
    const where: any = { tenantId };
    if (reportPeriod) where.reportPeriod = reportPeriod;
    return prisma.phoReport.findMany({ where, orderBy: { reportPeriod: 'desc' } });
  }

  async generatePhoReport(data: any, tenantId: string, userId: string) {
    const report = await prisma.phoReport.create({
      data: {
        tenantId,
        phoOrgId: data.phoOrgId,
        reportPeriod: data.reportPeriod,
        reportType: data.reportType || 'CAPITATION',
        enrolledPatients: data.enrolledPatients || 0,
        capitationAmt: data.capitationAmt || 0,
        ffsAmount: data.ffsAmount || 0,
        totalAmount: (data.capitationAmt || 0) + (data.ffsAmount || 0),
        breakdown: data.breakdown || {},
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'PhoReport', resourceId: report.id, details: { reportPeriod: data.reportPeriod }, ipAddress: '0.0.0.0' });
    return report;
  }

  // ======================================================================
  // Immunisations (CIR - National Immunisation Register)
  // ======================================================================

  async submitImmunisation(data: any, tenantId: string, userId: string) {
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const imm = await prisma.nzImmunisationSubmission.create({
      data: {
        tenantId,
        patientId: data.patientId,
        nhiNumber: data.nhiNumber,
        vaccineName: data.vaccineName,
        vaccineCode: data.vaccineCode,
        administrationDate: new Date(data.administrationDate),
        doseNumber: data.doseNumber,
        lotNumber: data.lotNumber,
        manufacturer: data.manufacturer,
        administeringStaffId: data.administeringStaffId || userId,
        facilityCode: data.facilityCode || null,
        funded: data.funded ?? true,
        scheduleStatus: data.scheduleStatus || 'COMPLETED',
        status: 'PENDING',
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'NzImmunisationSubmission', resourceId: imm.id, details: { vaccineName: data.vaccineName }, ipAddress: '0.0.0.0' });
    return imm;
  }

  async listImmunisations(tenantId: string, patientId?: string, status?: string, page: number = 1, pageSize: number = 20) {
    const where: any = { tenantId };
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.nzImmunisationSubmission.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.nzImmunisationSubmission.count({ where }),
    ]);
    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  // ======================================================================
  // NHI Validation
  // ======================================================================

  async validateNhi(data: any, tenantId: string, userId: string) {
    // Simulated NHI validation — in production this calls the MoH NHI service
    const nhiNumber = data.nhiNumber?.toUpperCase();
    const isValidFormat = /^[A-Z]{3}\d{2}[A-Z0-9]$/.test(nhiNumber); // ABC12D format

    const validationLog = await prisma.nhiValidationLog.create({
      data: {
        tenantId,
        patientId: data.patientId || null,
        nhiNumber,
        requestData: data,
        isValid: isValidFormat,
        matchStatus: isValidFormat ? 'ACTIVE' : 'NOT_FOUND',
        matchedName: isValidFormat ? `${data.firstName} ${data.lastName}` : null,
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'NhiValidationLog', resourceId: validationLog.id, details: { nhiNumber, isValid: isValidFormat }, ipAddress: '0.0.0.0' });

    return {
      isValid: isValidFormat,
      status: isValidFormat ? 'ACTIVE' : 'NOT_FOUND',
      nhiNumber,
      matchedName: isValidFormat ? `${data.firstName} ${data.lastName}` : null,
      matchedDob: data.dateOfBirth || null,
      matchedGender: data.gender || null,
      deceasedDate: null,
      message: isValidFormat ? 'NHI validated successfully' : 'NHI format validation failed',
    };
  }

  async getNhiValidationLogs(tenantId: string, nhiNumber?: string, page: number = 1, pageSize: number = 20) {
    const where: any = { tenantId };
    if (nhiNumber) where.nhiNumber = nhiNumber;

    const [data, total] = await Promise.all([
      prisma.nhiValidationLog.findMany({ where, orderBy: { validatedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.nhiValidationLog.count({ where }),
    ]);
    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }
}