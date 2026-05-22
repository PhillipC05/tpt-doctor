import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction } from '@tpt-doctor/shared';

@Injectable()
export class PrescriptionsService {
  async create(data: any, tenantId: string, userId: string) {
    const prescription = await prisma.prescription.create({
      data: {
        tenantId,
        patientId: data.patientId,
        staffId: data.staffId || userId,
        medicationName: data.medicationName,
        strength: data.strength,
        form: data.form,
        route: data.route,
        frequency: data.frequency,
        duration: data.duration,
        quantity: data.quantity,
        refills: data.refills || 0,
        dispenseAsWritten: data.dispenseAsWritten || false,
        notes: data.notes || null,
        pharmacyId: data.pharmacyId || null,
        expiresAt: new Date(data.expiresAt),
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        staff: { select: { id: true, title: true } },
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'Prescription', resourceId: prescription.id,
      details: { patientId: data.patientId, medication: data.medicationName }, ipAddress: '0.0.0.0',
    });

    return prescription;
  }

  async findAll(tenantId: string, params: { patientId?: string; status?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: any = { tenantId };
    if (params.patientId) where.patientId = params.patientId;
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        include: { patient: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.prescription.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 } };
  }

  async findOne(id: string, tenantId: string) {
    const prescription = await prisma.prescription.findFirst({ where: { id, tenantId }, include: { patient: true, staff: true } });
    if (!prescription) throw new NotFoundException('Prescription not found');
    return prescription;
  }

  async updateStatus(id: string, status: string, tenantId: string, userId: string) {
    const existing = await prisma.prescription.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Prescription not found');

    const data: any = { status };
    if (status === 'SUBMITTED') data.submittedAt = new Date();
    if (status === 'FILLED') data.filledAt = new Date();

    const prescription = await prisma.prescription.update({ where: { id }, data });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.UPDATE, resource: 'Prescription', resourceId: id,
      details: { status }, ipAddress: '0.0.0.0',
    });

    return prescription;
  }

  async getActivePrescriptions(patientId: string, tenantId: string) {
    return prisma.prescription.findMany({
      where: { patientId, tenantId, status: { notIn: ['EXPIRED', 'CANCELLED'] }, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }
}