import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction } from '@tpt-doctor/shared';
import * as crypto from 'crypto';

@Injectable()
export class MedicalCertificatesService {
  private async generateCertificateNumber(tenantId: string): Promise<string> {
    const count = await prisma.medicalCertificate.count({ where: { tenantId } });
    const prefix = `MC-${tenantId.slice(0, 8).toUpperCase()}`;
    return `${prefix}-${String(count + 1).padStart(6, '0')}`;
  }

  private generateVerificationCode(): string {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
  }

  async create(data: any, tenantId: string, userId: string) {
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const certificate = await prisma.medicalCertificate.create({
      data: {
        tenantId,
        patientId: data.patientId,
        staffId: data.staffId || userId,
        certificateType: data.certificateType,
        status: 'DRAFT',
        certificateNumber: await this.generateCertificateNumber(tenantId),
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        diagnosisCode: data.diagnosisCode || null,
        diagnosisDesc: data.diagnosisDesc || null,
        restrictions: data.restrictions || null,
        recommendations: data.recommendations || null,
        body: data.body || null,
        verificationCode: this.generateVerificationCode(),
        employerName: data.employerName || null,
        employerContact: data.employerContact || null,
        attachments: data.attachments || [],
        notes: data.notes || null,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        staff: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'MedicalCertificate', resourceId: certificate.id, details: { certificateType: data.certificateType }, ipAddress: '0.0.0.0' });

    return certificate;
  }

  async findAll(tenantId: string, params: { patientId?: string; certificateType?: string; status?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: any = { tenantId };
    if (params.patientId) where.patientId = params.patientId;
    if (params.certificateType) where.certificateType = params.certificateType;
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      prisma.medicalCertificate.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          staff: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        },
        orderBy: { issueDate: 'desc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.medicalCertificate.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async findOne(id: string, tenantId: string) {
    const certificate = await prisma.medicalCertificate.findFirst({
      where: { id, tenantId },
      include: { patient: true, staff: { include: { user: true } } },
    });
    if (!certificate) throw new NotFoundException('Medical certificate not found');
    return certificate;
  }

  async update(id: string, data: any, tenantId: string, userId: string) {
    const existing = await prisma.medicalCertificate.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Medical certificate not found');
    if (existing.status !== 'DRAFT') throw new BadRequestException('Only draft certificates can be edited');

    const certificate = await prisma.medicalCertificate.update({
      where: { id },
      data: {
        startDate: data.startDate ? new Date(data.startDate) : existing.startDate,
        endDate: data.endDate ? new Date(data.endDate) : existing.endDate,
        diagnosisCode: data.diagnosisCode ?? existing.diagnosisCode,
        diagnosisDesc: data.diagnosisDesc ?? existing.diagnosisDesc,
        restrictions: data.restrictions ?? existing.restrictions,
        recommendations: data.recommendations ?? existing.recommendations,
        body: data.body ?? existing.body,
        employerName: data.employerName ?? existing.employerName,
        employerContact: data.employerContact ?? existing.employerContact,
        notes: data.notes ?? existing.notes,
        attachments: data.attachments ?? existing.attachments,
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.UPDATE, resource: 'MedicalCertificate', resourceId: id, details: { status: certificate.status }, ipAddress: '0.0.0.0' });

    return certificate;
  }

  async issue(id: string, tenantId: string, userId: string) {
    const existing = await prisma.medicalCertificate.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Medical certificate not found');
    if (existing.status !== 'DRAFT') throw new BadRequestException('Certificate has already been issued');

    const certificate = await prisma.medicalCertificate.update({
      where: { id },
      data: { status: 'ISSUED', issueDate: new Date(), signedAt: new Date(), isDigitallySigned: true },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.UPDATE, resource: 'MedicalCertificate', resourceId: id, details: { action: 'ISSUED' }, ipAddress: '0.0.0.0' });

    return certificate;
  }

  async void(id: string, reason: string, tenantId: string, userId: string) {
    const existing = await prisma.medicalCertificate.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Medical certificate not found');

    const certificate = await prisma.medicalCertificate.update({
      where: { id },
      data: { status: 'VOID', voidReason: reason || null },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.UPDATE, resource: 'MedicalCertificate', resourceId: id, details: { action: 'VOIDED', reason }, ipAddress: '0.0.0.0' });

    return certificate;
  }

  async verify(verificationCode: string) {
    const certificate = await prisma.medicalCertificate.findFirst({
      where: { verificationCode, status: 'ISSUED' },
      include: {
        patient: { select: { firstName: true, lastName: true, dateOfBirth: true } },
        staff: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });

    if (!certificate) return { verified: false, message: 'Certificate not found or not valid' };

    return {
      verified: true,
      certificate: {
        number: certificate.certificateNumber,
        type: certificate.certificateType,
        issueDate: certificate.issueDate,
        startDate: certificate.startDate,
        endDate: certificate.endDate,
        patient: certificate.patient,
        issuer: certificate.staff?.user,
        diagnosis: certificate.diagnosisDesc,
      },
    };
  }

  async getStats(tenantId: string) {
    const [total, byType, byStatus] = await Promise.all([
      prisma.medicalCertificate.count({ where: { tenantId } }),
      prisma.medicalCertificate.groupBy({ by: ['certificateType'], where: { tenantId }, _count: true }),
      prisma.medicalCertificate.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
    ]);

    return { total, byType, byStatus };
  }
}