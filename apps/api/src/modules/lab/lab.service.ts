import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction } from '@tpt-doctor/shared';

@Injectable()
export class LabService {
  async create(data: any, tenantId: string, userId: string) {
    const labOrder = await prisma.labOrder.create({
      data: {
        tenantId,
        patientId: data.patientId,
        staffId: data.staffId || userId,
        labName: data.labName,
        testName: data.testName,
        loincCode: data.loincCode,
        notes: data.notes || null,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'LabOrder', resourceId: labOrder.id,
      details: { patientId: data.patientId, test: data.testName }, ipAddress: '0.0.0.0',
    });

    return labOrder;
  }

  async findAll(tenantId: string, params: { patientId?: string; status?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: any = { tenantId };
    if (params.patientId) where.patientId = params.patientId;
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      prisma.labOrder.findMany({
        where,
        include: { patient: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { orderedAt: 'desc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.labOrder.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 } };
  }

  async findOne(id: string, tenantId: string) {
    const labOrder = await prisma.labOrder.findFirst({ where: { id, tenantId }, include: { patient: true } });
    if (!labOrder) throw new NotFoundException('Lab order not found');
    return labOrder;
  }

  async updateResult(id: string, data: { result: any; status?: string }, tenantId: string, userId: string) {
    const existing = await prisma.labOrder.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Lab order not found');

    const labOrder = await prisma.labOrder.update({
      where: { id },
      data: {
        result: data.result,
        status: data.status || 'COMPLETED',
        resultAt: new Date(),
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.UPDATE, resource: 'LabOrder', resourceId: id,
      details: { status: data.status, isAbnormal: data.result?.isAbnormal }, ipAddress: '0.0.0.0',
    });

    return labOrder;
  }

  async updateStatus(id: string, status: string, tenantId: string) {
    const existing = await prisma.labOrder.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Lab order not found');

    const data: any = { status };
    if (status === 'SPECIMEN_COLLECTED') data.collectedAt = new Date();

    return prisma.labOrder.update({ where: { id }, data });
  }

  async getPendingResults(tenantId: string) {
    return prisma.labOrder.findMany({
      where: { tenantId, status: { in: ['ORDERED', 'SPECIMEN_COLLECTED', 'IN_TRANSIT', 'IN_PROGRESS'] } },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { orderedAt: 'asc' },
    });
  }

  async getAbnormalResults(tenantId: string) {
    const orders = await prisma.labOrder.findMany({
      where: { tenantId, status: 'COMPLETED' },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { resultAt: 'desc' },
    });
    return orders.filter((o: any) => o.result?.isAbnormal);
  }
}