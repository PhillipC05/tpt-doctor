// ============================================================================
// TPT Doctor — Canada (CA) Country Profile Service (Phase 11)
// ============================================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction } from '@tpt-doctor/shared';

@Injectable()
export class CaService {
  // ======================================================================
  // Provincial Health Insurance Claims
  // ======================================================================

  async submitClaim(data: any, tenantId: string, userId: string) {
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const claim = await prisma.caProvincialClaimSubmission.create({
      data: {
        tenantId,
        patientId: data.patientId,
        healthPlan: data.healthPlan,
        claimNumber: `CA-${data.healthPlan}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        serviceDate: new Date(data.serviceDate || Date.now()),
        items: data.items || [],
        totalAmount: data.totalAmount || 0,
        paidAmount: 0,
        submissionMethod: data.submissionMethod || 'EDI',
        status: 'DRAFT',
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'CaProvincialClaimSubmission', resourceId: claim.id, details: { healthPlan: data.healthPlan }, ipAddress: '0.0.0.0' });
    return claim;
  }

  async listClaims(tenantId: string, patientId?: string, healthPlan?: string, status?: string, page: number = 1, pageSize: number = 20) {
    const where: any = { tenantId };
    if (patientId) where.patientId = patientId;
    if (healthPlan) where.healthPlan = healthPlan;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.caProvincialClaimSubmission.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.caProvincialClaimSubmission.count({ where }),
    ]);
    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  // ======================================================================
  // Drug Database (DIN Lookup)
  // ======================================================================

  async searchDrugDatabase(din?: string, brandName?: string, genericName?: string, province?: string, page: number = 1, pageSize: number = 20) {
    const where: any = { isActive: true };
    if (din) where.din = { contains: din, mode: 'insensitive' };
    if (brandName) where.brandName = { contains: brandName, mode: 'insensitive' };
    if (genericName) where.genericName = { contains: genericName, mode: 'insensitive' };
    if (province) where.provincialFormularies = { has: province };

    const [data, total] = await Promise.all([
      prisma.caDrugDatabase.findMany({ where, orderBy: { brandName: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.caDrugDatabase.count({ where }),
    ]);
    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async lookupDrugByDin(din: string) {
    const drug = await prisma.caDrugDatabase.findFirst({ where: { din, isActive: true } });
    if (!drug) throw new NotFoundException(`Drug with DIN ${din} not found`);
    return drug;
  }

  // ======================================================================
  // Immunisation Registry
  // ======================================================================

  async submitImmunisation(data: any, tenantId: string, userId: string) {
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const imm = await prisma.caImmunisationSubmission.create({
      data: {
        tenantId,
        patientId: data.patientId,
        provincialHealthCard: data.provincialHealthCard,
        province: data.province,
        vaccineName: data.vaccineName,
        vaccineCode: data.vaccineCode,
        administrationDate: new Date(data.administrationDate),
        doseNumber: data.doseNumber,
        lotNumber: data.lotNumber,
        manufacturer: data.manufacturer,
        administeringStaffId: data.administeringStaffId || userId,
        status: 'PENDING',
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'CaImmunisationSubmission', resourceId: imm.id, details: { vaccineName: data.vaccineName, province: data.province }, ipAddress: '0.0.0.0' });
    return imm;
  }

  async listImmunisations(tenantId: string, patientId?: string, status?: string, page: number = 1, pageSize: number = 20) {
    const where: any = { tenantId };
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.caImmunisationSubmission.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.caImmunisationSubmission.count({ where }),
    ]);
    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  // ======================================================================
  // Canada Health Infoway
  // ======================================================================

  async createInfowayInteraction(data: any, tenantId: string, userId: string) {
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const interaction = await prisma.caInfowayInteraction.create({
      data: {
        tenantId,
        patientId: data.patientId,
        interactionType: data.interactionType,
        infowayRef: data.infowayRef || `INFOWAY-${Date.now()}`,
        status: 'PENDING',
        requestPayload: data.requestPayload || null,
        responsePayload: data.responsePayload || null,
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'CaInfowayInteraction', resourceId: interaction.id, details: { interactionType: data.interactionType }, ipAddress: '0.0.0.0' });
    return interaction;
  }

  async listInfowayInteractions(tenantId: string, interactionType?: string, page: number = 1, pageSize: number = 20) {
    const where: any = { tenantId };
    if (interactionType) where.interactionType = interactionType;

    const [data, total] = await Promise.all([
      prisma.caInfowayInteraction.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.caInfowayInteraction.count({ where }),
    ]);
    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }
}