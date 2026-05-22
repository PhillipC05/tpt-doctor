import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction } from '@tpt-doctor/shared';

@Injectable()
export class CarePlansService {
  async create(data: any, tenantId: string, userId: string) {
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, tenantId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const plan = await prisma.carePlan.create({
      data: {
        tenantId,
        patientId: data.patientId,
        staffId: data.staffId || userId,
        planType: data.planType,
        status: 'ACTIVE',
        title: data.title,
        description: data.description || null,
        diagnosisCodes: data.diagnosisCodes || null,
        goals: data.goals || [],
        interventions: data.interventions || [],
        teamMembers: data.teamMembers || [],
        clinicalIndicators: data.clinicalIndicators || null,
        startDate: new Date(data.startDate),
        reviewDate: data.reviewDate ? new Date(data.reviewDate) : null,
        nextReviewDate: data.nextReviewDate ? new Date(data.nextReviewDate) : null,
        isSharedWithPatient: data.isSharedWithPatient || false,
        patientNotes: data.patientNotes || null,
        clinicalNotes: data.clinicalNotes || null,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, medicalRecordNumber: true } },
        staff: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'CarePlan', resourceId: plan.id, details: { planType: data.planType }, ipAddress: '0.0.0.0' });

    return plan;
  }

  async findAll(tenantId: string, params: { patientId?: string; planType?: string; status?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: any = { tenantId };
    if (params.patientId) where.patientId = params.patientId;
    if (params.planType) where.planType = params.planType;
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      prisma.carePlan.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, medicalRecordNumber: true } },
          staff: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        },
        orderBy: { nextReviewDate: 'asc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.carePlan.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async findOne(id: string, tenantId: string) {
    const plan = await prisma.carePlan.findFirst({
      where: { id, tenantId },
      include: {
        patient: true,
        staff: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });
    if (!plan) throw new NotFoundException('Care plan not found');
    return plan;
  }

  async update(id: string, data: any, tenantId: string, userId: string) {
    const existing = await prisma.carePlan.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Care plan not found');

    const plan = await prisma.carePlan.update({
      where: { id },
      data: {
        title: data.title ?? existing.title,
        description: data.description ?? existing.description,
        diagnosisCodes: data.diagnosisCodes ?? existing.diagnosisCodes,
        goals: data.goals ?? existing.goals,
        interventions: data.interventions ?? existing.interventions,
        teamMembers: data.teamMembers ?? existing.teamMembers,
        clinicalIndicators: data.clinicalIndicators ?? existing.clinicalIndicators,
        reviewDate: data.reviewDate ? new Date(data.reviewDate) : existing.reviewDate,
        nextReviewDate: data.nextReviewDate ? new Date(data.nextReviewDate) : existing.nextReviewDate,
        isSharedWithPatient: data.isSharedWithPatient ?? existing.isSharedWithPatient,
        patientNotes: data.patientNotes ?? existing.patientNotes,
        clinicalNotes: data.clinicalNotes ?? existing.clinicalNotes,
        externalReferences: data.externalReferences ?? existing.externalReferences,
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.UPDATE, resource: 'CarePlan', resourceId: id, details: { planType: plan.planType }, ipAddress: '0.0.0.0' });

    return plan;
  }

  async updateStatus(id: string, status: string, tenantId: string, userId: string) {
    const existing = await prisma.carePlan.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Care plan not found');

    const updateData: any = { status };
    if (status === 'COMPLETED') updateData.completedDate = new Date();
    if (status === 'REVIEW_DUE') updateData.lastReviewDate = new Date();
    if (status === 'CANCELLED') updateData.status = status;

    const plan = await prisma.carePlan.update({ where: { id }, data: updateData });

    await logAuditEvent({ tenantId, userId, action: AuditAction.UPDATE, resource: 'CarePlan', resourceId: id, details: { status, previousStatus: existing.status }, ipAddress: '0.0.0.0' });

    return plan;
  }

  async getDueReviews(tenantId: string) {
    const now = new Date();
    const plans = await prisma.carePlan.findMany({
      where: { tenantId, status: 'ACTIVE', nextReviewDate: { lte: now } },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        staff: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
      orderBy: { nextReviewDate: 'asc' },
    });

    return { data: plans, count: plans.length };
  }

  async getStats(tenantId: string) {
    const [total, byType, byStatus] = await Promise.all([
      prisma.carePlan.count({ where: { tenantId } }),
      prisma.carePlan.groupBy({ by: ['planType'], where: { tenantId }, _count: true }),
      prisma.carePlan.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
    ]);

    return { total, byType, byStatus };
  }
}