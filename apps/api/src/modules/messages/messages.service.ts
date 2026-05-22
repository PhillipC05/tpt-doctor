import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction } from '@tpt-doctor/shared';

@Injectable()
export class MessagesService {
  async send(data: any, tenantId: string, userId: string) {
    const message = await prisma.message.create({
      data: {
        tenantId,
        senderId: userId,
        recipientId: data.recipientId,
        subject: data.subject,
        body: data.body,
        attachments: data.attachments || [],
        isUrgent: data.isUrgent || false,
        parentMessageId: data.parentMessageId || null,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        recipient: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'Message', resourceId: message.id,
      details: { recipientId: data.recipientId, isUrgent: data.isUrgent }, ipAddress: '0.0.0.0',
    });

    return message;
  }

  async getInbox(tenantId: string, userId: string, params: { isRead?: boolean; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const where: any = { tenantId, recipientId: userId };
    if (params.isRead !== undefined) where.isRead = params.isRead;

    const [data, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: { sender: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.message.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 } };
  }

  async getSent(tenantId: string, userId: string, params: { page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;

    const [data, total] = await Promise.all([
      prisma.message.findMany({
        where: { tenantId, senderId: userId },
        include: { recipient: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.message.count({ where: { tenantId, senderId: userId } }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 } };
  }

  async getThread(tenantId: string, messageId: string, userId: string) {
    const original = await prisma.message.findFirst({ where: { id: messageId, tenantId } });
    if (!original) throw new NotFoundException('Message not found');

    // Get the full thread
    const threadId = original.parentMessageId || original.id;
    const messages = await prisma.message.findMany({
      where: {
        tenantId,
        OR: [
          { id: threadId },
          { parentMessageId: threadId },
        ],
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Mark as read
    await prisma.message.updateMany({
      where: { id: { in: messages.map(m => m.id) }, recipientId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return messages;
  }

  async markAsRead(tenantId: string, messageId: string, userId: string) {
    const message = await prisma.message.findFirst({ where: { id: messageId, tenantId, recipientId: userId } });
    if (!message) throw new NotFoundException('Message not found');

    return prisma.message.update({
      where: { id: messageId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(tenantId: string, userId: string) {
    return prisma.message.count({ where: { tenantId, recipientId: userId, isRead: false } });
  }
}