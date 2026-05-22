import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction, ReferralStatus } from '@tpt-doctor/shared';

@Injectable()
export class ReferralsService {
  async create(data: any, tenantId: string, userId: string) {
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const referral = await prisma.referral.create({
      data: {
        tenantId,
        patientId: data.patientId,
        referringStaffId: data.referringStaffId || userId,
        referralType: data.referralType,
        priority: data.priority || 'ROUTINE',
        status: 'DRAFT',
        specialistName: data.specialistName || null,
        specialistContact: data.specialistContact || null,
        specialty: data.specialty || null,
        facility: data.facility || null,
        reason: data.reason,
        clinicalNotes: data.clinicalNotes || null,
        letterContent: data.letterContent || null,
        diagnosisCodes: data.diagnosisCodes || null,
        requestedDate: new Date(data.requestedDate || Date.now()),
        isUrgent: data.isUrgent || false,
        attachments: data.attachments || [],
      },
      include: { patient: { select: { id: true, firstName: true, lastName: true } }, referringStaff: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'Referral', resourceId: referral.id, details: { referralType: data.referralType }, ipAddress: '0.0.0.0' });

    return referral;
  }

  async findAll(tenantId: string, params: { patientId?: string; status?: string; referralType?: string; priority?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: any = { tenantId };
    if (params.patientId) where.patientId = params.patientId;
    if (params.status) where.status = params.status;
    if (params.referralType) where.referralType = params.referralType;
    if (params.priority) where.priority = params.priority;

    const [data, total] = await Promise.all([
      prisma.referral.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, medicalRecordNumber: true } },
          referringStaff: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.referral.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async findOne(id: string, tenantId: string) {
    const referral = await prisma.referral.findFirst({
      where: { id, tenantId },
      include: {
        patient: true,
        referringStaff: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });
    if (!referral) throw new NotFoundException('Referral not found');
    return referral;
  }

  async update(id: string, data: any, tenantId: string, userId: string) {
    const existing = await prisma.referral.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Referral not found');

    const referral = await prisma.referral.update({
      where: { id },
      data: {
        specialistName: data.specialistName ?? existing.specialistName,
        specialistContact: data.specialistContact ?? existing.specialistContact,
        specialty: data.specialty ?? existing.specialty,
        facility: data.facility ?? existing.facility,
        reason: data.reason ?? existing.reason,
        clinicalNotes: data.clinicalNotes ?? existing.clinicalNotes,
        letterContent: data.letterContent ?? existing.letterContent,
        diagnosisCodes: data.diagnosisCodes ?? existing.diagnosisCodes,
        priority: data.priority ?? existing.priority,
        isUrgent: data.isUrgent ?? existing.isUrgent,
        attachments: data.attachments ?? existing.attachments,
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.UPDATE, resource: 'Referral', resourceId: id, details: { status: referral.status }, ipAddress: '0.0.0.0' });

    return referral;
  }

  async updateStatus(id: string, status: string, data: any, tenantId: string, userId: string) {
    const existing = await prisma.referral.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Referral not found');

    const updateData: any = { status };
    const now = new Date();

    switch (status) {
      case 'SENT':
        break;
      case 'ACKNOWLEDGED':
        updateData.acknowledgedAt = now;
        break;
      case 'BOOKED':
        updateData.bookedAt = now;
        break;
      case 'COMPLETED':
        updateData.completedAt = now;
        updateData.responseNotes = data.responseNotes || null;
        break;
      case 'CLOSED':
        updateData.closedAt = now;
        break;
      case 'CANCELLED':
        updateData.cancelledAt = now;
        updateData.cancellationReason = data.reason || null;
        break;
    }

    const referral = await prisma.referral.update({ where: { id }, data: updateData });

    await logAuditEvent({ tenantId, userId, action: AuditAction.UPDATE, resource: 'Referral', resourceId: id, details: { status, previousStatus: existing.status }, ipAddress: '0.0.0.0' });

    return referral;
  }

  async delete(id: string, tenantId: string, userId: string) {
    const referral = await prisma.referral.findFirst({ where: { id, tenantId } });
    if (!referral) throw new NotFoundException('Referral not found');
    if (referral.status !== 'DRAFT') throw new BadRequestException('Only draft referrals can be deleted');

    await prisma.referral.delete({ where: { id } });
    await logAuditEvent({ tenantId, userId, action: AuditAction.DELETE, resource: 'Referral', resourceId: id, details: {}, ipAddress: '0.0.0.0' });

    return { deleted: true };
  }

  async getStats(tenantId: string) {
    const [total, byStatus, byPriority, byType] = await Promise.all([
      prisma.referral.count({ where: { tenantId } }),
      prisma.referral.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
      prisma.referral.groupBy({ by: ['priority'], where: { tenantId }, _count: true }),
      prisma.referral.groupBy({ by: ['referralType'], where: { tenantId }, _count: true }),
    ]);

    return { total, byStatus, byPriority, byType };
  }
}