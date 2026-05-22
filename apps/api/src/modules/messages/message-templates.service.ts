import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction } from '@tpt-doctor/shared';

@Injectable()
export class MessageTemplatesService {
  async create(data: any, tenantId: string, userId: string) {
    const template = await prisma.messageTemplate.create({
      data: {
        tenantId,
        name: data.name,
        subject: data.subject,
        body: data.body,
        category: data.category,
        variables: data.variables || [],
        createdBy: userId,
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'MessageTemplate', resourceId: template.id,
      details: { name: data.name, category: data.category }, ipAddress: '0.0.0.0',
    });

    return template;
  }

  async findAll(tenantId: string, params: { category?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: any = { tenantId };
    if (params.category) where.category = params.category;

    const [data, total] = await Promise.all([
      prisma.messageTemplate.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.messageTemplate.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 } };
  }

  async findOne(id: string, tenantId: string) {
    const template = await prisma.messageTemplate.findFirst({ where: { id, tenantId } });
    if (!template) throw new NotFoundException('Message template not found');
    return template;
  }

  async update(id: string, data: any, tenantId: string, userId: string) {
    const existing = await prisma.messageTemplate.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Message template not found');

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: {
        name: data.name,
        subject: data.subject,
        body: data.body,
        category: data.category,
        variables: data.variables,
        isActive: data.isActive,
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.UPDATE, resource: 'MessageTemplate', resourceId: id,
      details: { name: data.name }, ipAddress: '0.0.0.0',
    });

    return template;
  }

  async remove(id: string, tenantId: string, userId: string) {
    const existing = await prisma.messageTemplate.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Message template not found');

    await prisma.messageTemplate.delete({ where: { id } });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.DELETE, resource: 'MessageTemplate', resourceId: id,
      details: {}, ipAddress: '0.0.0.0',
    });
  }

  async render(id: string, variables: Record<string, string>, tenantId: string) {
    const template = await prisma.messageTemplate.findFirst({ where: { id, tenantId } });
    if (!template) throw new NotFoundException('Message template not found');

    let subject = template.subject;
    let body = template.body;

    for (const [key, value] of Object.entries(variables)) {
      subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), value);
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return { subject, body };
  }
}