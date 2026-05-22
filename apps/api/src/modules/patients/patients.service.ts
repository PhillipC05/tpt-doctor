import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { createPatientSchema, updatePatientSchema, Patient } from '@tpt-doctor/shared';
import { encrypt, hashForIndexing } from '@tpt-doctor/encryption';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction, PaginationParams, PaginatedResponse } from '@tpt-doctor/shared';

@Injectable()
export class PatientsService {
  async create(data: any, tenantId: string, userId: string): Promise<any> {
    const validated = createPatientSchema.parse(data);
    const mrn = await this.generateMRN(tenantId);

    const patient = await prisma.patient.create({
      data: {
        tenantId,
        medicalRecordNumber: mrn,
        firstName: validated.firstName,
        lastName: validated.lastName,
        dateOfBirth: new Date(validated.dateOfBirth),
        gender: validated.gender,
        bloodType: validated.bloodType,
        maritalStatus: validated.maritalStatus,
        ssn: validated.ssn ? encrypt(validated.ssn) : null,
        email: validated.email,
        phone: validated.phone,
        address: validated.address,
        emergencyContact: validated.emergencyContact || undefined,
        tags: validated.tags || [],
        notes: validated.notes || null,
        insurance: validated.insurance ? {
          create: validated.insurance.map((ins: any) => ({
            provider: ins.provider,
            policyNumber: ins.policyNumber,
            groupNumber: ins.groupNumber,
            insuranceType: ins.insuranceType,
            isPrimary: ins.isPrimary,
            copay: ins.copay,
            deductible: ins.deductible,
          })),
        } : undefined,
      },
      include: { insurance: true },
    });

    await logAuditEvent({
      tenantId,
      userId,
      action: AuditAction.CREATE,
      resource: 'Patient',
      resourceId: patient.id,
      details: { mrn },
      ipAddress: '0.0.0.0',
    });

    return patient;
  }

  async findAll(
    tenantId: string,
    params: PaginationParams & { search?: string },
  ): Promise<PaginatedResponse<any>> {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const search = params.search;

    const where: any = { tenantId, isActive: true };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { medicalRecordNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        include: { insurance: true },
        orderBy: params.sortBy
          ? { [params.sortBy]: params.sortOrder || 'asc' }
          : { lastName: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.patient.count({ where }),
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

  async findOne(id: string, tenantId: string): Promise<any> {
    const patient = await prisma.patient.findFirst({
      where: { id, tenantId },
      include: {
        insurance: true,
        consents: true,
        appointments: { take: 10, orderBy: { startTime: 'desc' } },
        encounters: { take: 10, orderBy: { date: 'desc' } },
        medicalConditions: true,
        allergies: true,
        immunizations: true,
        medications: { where: { isActive: true } },
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return patient;
  }

  async update(id: string, data: any, tenantId: string, userId: string): Promise<any> {
    const validated = updatePatientSchema.parse(data);
    const existing = await prisma.patient.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Patient not found');

    const patient = await prisma.patient.update({
      where: { id },
      data: {
        ...(validated.firstName && { firstName: validated.firstName }),
        ...(validated.lastName && { lastName: validated.lastName }),
        ...(validated.dateOfBirth && { dateOfBirth: new Date(validated.dateOfBirth) }),
        ...(validated.gender && { gender: validated.gender }),
        ...(validated.bloodType && { bloodType: validated.bloodType }),
        ...(validated.maritalStatus && { maritalStatus: validated.maritalStatus }),
        ...(validated.ssn && { ssn: encrypt(validated.ssn) }),
        ...(validated.email && { email: validated.email }),
        ...(validated.phone && { phone: validated.phone }),
        ...(validated.address && { address: validated.address }),
        ...(validated.emergencyContact !== undefined && { emergencyContact: validated.emergencyContact }),
        ...(validated.tags && { tags: validated.tags }),
        ...(validated.notes !== undefined && { notes: validated.notes }),
      },
      include: { insurance: true },
    });

    await logAuditEvent({
      tenantId,
      userId,
      action: AuditAction.UPDATE,
      resource: 'Patient',
      resourceId: id,
      details: { updatedFields: Object.keys(validated) },
      ipAddress: '0.0.0.0',
    });

    return patient;
  }

  async remove(id: string, tenantId: string, userId: string): Promise<void> {
    const existing = await prisma.patient.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Patient not found');

    // Soft delete — keep medical records for compliance
    await prisma.patient.update({
      where: { id },
      data: { isActive: false },
    });

    await logAuditEvent({
      tenantId,
      userId,
      action: AuditAction.DELETE,
      resource: 'Patient',
      resourceId: id,
      details: { softDelete: true },
      ipAddress: '0.0.0.0',
    });
  }

  async updateConsent(patientId: string, consentType: string, data: { isGranted: boolean; notes?: string }, tenantId: string, userId: string): Promise<any> {
    const patient = await prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const existing = await prisma.patientConsent.findUnique({
      where: { patientId_consentType: { patientId, consentType: consentType as any } },
    });

    let consent;
    if (existing) {
      consent = await prisma.patientConsent.update({
        where: { id: existing.id },
        data: {
          isGranted: data.isGranted,
          notes: data.notes || undefined,
          grantedAt: data.isGranted ? new Date() : existing.grantedAt,
          revokedAt: !data.isGranted ? new Date() : null,
        },
      });
    } else {
      consent = await prisma.patientConsent.create({
        data: {
          patientId,
          consentType: consentType as any,
          isGranted: data.isGranted,
          grantedAt: data.isGranted ? new Date() : null,
          grantedBy: userId,
          notes: data.notes,
        },
      });
    }

    await logAuditEvent({
      tenantId, userId,
      action: data.isGranted ? AuditAction.CONSENT_GRANTED : AuditAction.CONSENT_REVOKED,
      resource: 'PatientConsent',
      resourceId: consent.id,
      details: { patientId, consentType },
      ipAddress: '0.0.0.0',
    });

    return consent;
  }

  async getConsents(patientId: string, tenantId: string): Promise<any> {
    const patient = await prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    return prisma.patientConsent.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async mergePatients(data: { survivingPatientId: string; mergedPatientId: string; mergeReason?: string }, tenantId: string, userId: string): Promise<any> {
    const { survivingPatientId, mergedPatientId, mergeReason } = data;

    const [surviving, merged] = await Promise.all([
      prisma.patient.findFirst({ where: { id: survivingPatientId, tenantId } }),
      prisma.patient.findFirst({ where: { id: mergedPatientId, tenantId } }),
    ]);
    if (!surviving) throw new NotFoundException('Surviving patient not found');
    if (!merged) throw new NotFoundException('Merged patient not found');

    // Take snapshot before merge
    const survivingSnapshot = JSON.parse(JSON.stringify(surviving));
    const mergedSnapshot = JSON.parse(JSON.stringify(merged));

    // Reassign all records from merged to surviving
    const updateRelations = [
      prisma.appointment.updateMany({ where: { patientId: mergedPatientId }, data: { patientId: survivingPatientId } }),
      prisma.encounter.updateMany({ where: { patientId: mergedPatientId }, data: { patientId: survivingPatientId } }),
      prisma.medicalCondition.updateMany({ where: { patientId: mergedPatientId }, data: { patientId: survivingPatientId } }),
      prisma.allergy.updateMany({ where: { patientId: mergedPatientId }, data: { patientId: survivingPatientId } }),
      prisma.immunization.updateMany({ where: { patientId: mergedPatientId }, data: { patientId: survivingPatientId } }),
      prisma.patientMedication.updateMany({ where: { patientId: mergedPatientId }, data: { patientId: survivingPatientId } }),
      prisma.invoice.updateMany({ where: { patientId: mergedPatientId }, data: { patientId: survivingPatientId } }),
      prisma.claim.updateMany({ where: { patientId: mergedPatientId }, data: { patientId: survivingPatientId } }),
      prisma.prescription.updateMany({ where: { patientId: mergedPatientId }, data: { patientId: survivingPatientId } }),
      prisma.labOrder.updateMany({ where: { patientId: mergedPatientId }, data: { patientId: survivingPatientId } }),
      prisma.document.updateMany({ where: { patientId: mergedPatientId }, data: { patientId: survivingPatientId } }),
      prisma.patientConsent.updateMany({ where: { patientId: mergedPatientId }, data: { patientId: survivingPatientId } }),
      prisma.patientInsurance.updateMany({ where: { patientId: mergedPatientId }, data: { patientId: survivingPatientId } }),
    ];
    await Promise.all(updateRelations);

    // Soft-delete merged patient
    await prisma.patient.update({
      where: { id: mergedPatientId },
      data: { isActive: false, tags: { set: ['merged'] } },
    });

    // Log the merge
    await prisma.patientMergeLog.create({
      data: {
        tenantId,
        survivingPatientId,
        mergedPatientId,
        mergedBy: userId,
        mergeReason: mergeReason || null,
        survivingSnapshot,
        mergedSnapshot,
      },
    });

    await logAuditEvent({
      tenantId, userId,
      action: AuditAction.UPDATE,
      resource: 'Patient',
      resourceId: survivingPatientId,
      details: { merged: mergedPatientId, reason: mergeReason },
      ipAddress: '0.0.0.0',
    });

    return prisma.patient.findFirst({ where: { id: survivingPatientId }, include: { insurance: true, consents: true } });
  }

  async searchDuplicates(tenantId: string, params: { firstName?: string; lastName?: string; email?: string; phone?: string }): Promise<any> {
    const where: any = { tenantId, isActive: true };
    const orConditions: any[] = [];

    if (params.firstName || params.lastName) {
      orConditions.push({
        firstName: { contains: params.firstName || '', mode: 'insensitive' },
        lastName: { contains: params.lastName || '', mode: 'insensitive' },
      });
    }
    if (params.email) {
      orConditions.push({ email: { equals: params.email, mode: 'insensitive' } });
    }
    if (params.phone) {
      orConditions.push({ phone: { contains: params.phone } });
    }

    if (orConditions.length > 0) {
      where.OR = orConditions;
    }

    return prisma.patient.findMany({ where, include: { insurance: true } });
  }

  async uploadDocument(data: any, tenantId: string, userId: string): Promise<any> {
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const document = await prisma.document.create({
      data: {
        tenantId,
        patientId: data.patientId,
        encounterId: data.encounterId || null,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        storageKey: data.storageKey,
        category: data.category || null,
        isEncrypted: true,
        uploadedBy: userId,
      },
    });

    await logAuditEvent({
      tenantId, userId,
      action: AuditAction.CREATE,
      resource: 'Document',
      resourceId: document.id,
      details: { patientId: data.patientId, fileName: data.fileName, mimeType: data.mimeType },
      ipAddress: '0.0.0.0',
    });

    return document;
  }

  async getDocuments(patientId: string, tenantId: string): Promise<any> {
    const patient = await prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    return prisma.document.findMany({
      where: { patientId },
      include: { encounter: { select: { id: true, date: true, chiefComplaint: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteDocument(id: string, tenantId: string, userId: string): Promise<void> {
    const document = await prisma.document.findFirst({ where: { id, tenantId } });
    if (!document) throw new NotFoundException('Document not found');

    // Soft-delete by clearing storage key (actual S3 deletion would happen separately)
    await prisma.document.update({
      where: { id },
      data: { storageKey: `[DELETED:${document.storageKey}]` },
    });

    await logAuditEvent({
      tenantId, userId,
      action: AuditAction.DELETE,
      resource: 'Document',
      resourceId: id,
      details: { fileName: document.fileName },
      ipAddress: '0.0.0.0',
    });
  }

  private async generateMRN(tenantId: string): Promise<string> {
    const count = await prisma.patient.count({ where: { tenantId } });
    const year = new Date().getFullYear().toString().slice(-2);
    return `MRN-${year}-${(count + 1).toString().padStart(5, '0')}`;
  }
}
