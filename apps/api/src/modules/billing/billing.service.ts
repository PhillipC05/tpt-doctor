import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction } from '@tpt-doctor/shared';

@Injectable()
export class BillingService {
  async createInvoice(data: any, tenantId: string, userId: string) {
    const subtotal = data.items.reduce((sum: number, item: any) => sum + item.quantity * item.unitPrice, 0);
    const total = subtotal - (data.discount || 0);

    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        patientId: data.patientId,
        invoiceNumber: await this.generateInvoiceNumber(tenantId),
        items: data.items,
        subtotal,
        tax: data.tax || 0,
        discount: data.discount || 0,
        total,
        amountPaid: 0,
        balanceDue: total,
        dueDate: new Date(data.dueDate),
        notes: data.notes || null,
      },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'Invoice', resourceId: invoice.id,
      details: { amount: total }, ipAddress: '0.0.0.0',
    });

    return invoice;
  }

  async findAllInvoices(tenantId: string, params: { patientId?: string; status?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: any = { tenantId };
    if (params.patientId) where.patientId = params.patientId;
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { patient: { select: { id: true, firstName: true, lastName: true } }, payments: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.invoice.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 } };
  }

  async findInvoice(id: string, tenantId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId },
      include: { patient: true, claims: true, payments: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async processPayment(data: any, tenantId: string, userId: string) {
    const invoice = await prisma.invoice.findFirst({ where: { id: data.invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const payment = await prisma.payment.create({
      data: {
        tenantId,
        invoiceId: data.invoiceId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentProvider: data.paymentProvider,
        transactionId: data.transactionId || null,
        notes: data.notes || null,
      },
    });

    const newAmountPaid = Number(invoice.amountPaid) + Number(data.amount);
    const newBalanceDue = Number(invoice.total) - newAmountPaid;
    const newStatus = newBalanceDue <= 0 ? 'COMPLETED' : 'PENDING';

    await prisma.invoice.update({
      where: { id: data.invoiceId },
      data: { amountPaid: newAmountPaid, balanceDue: Math.max(0, newBalanceDue), status: newStatus },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'Payment', resourceId: payment.id,
      details: { invoiceId: data.invoiceId, amount: data.amount }, ipAddress: '0.0.0.0',
    });

    return payment;
  }

  async createClaim(data: any, tenantId: string, userId: string) {
    const invoice = await prisma.invoice.findFirst({ where: { id: data.invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const claim = await prisma.claim.create({
      data: {
        tenantId,
        patientId: invoice.patientId,
        invoiceId: data.invoiceId,
        claimNumber: `CLM-${Date.now()}`,
        insuranceId: data.insuranceId,
        serviceDate: new Date(data.serviceDate),
        amount: data.amount,
        notes: data.notes || null,
      },
      include: { insurance: true },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'Claim', resourceId: claim.id,
      details: { invoiceId: data.invoiceId }, ipAddress: '0.0.0.0',
    });

    return claim;
  }

  async findAllClaims(tenantId: string, params: { status?: string; patientId?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: any = { tenantId };
    if (params.status) where.status = params.status;
    if (params.patientId) where.patientId = params.patientId;

    const [data, total] = await Promise.all([
      prisma.claim.findMany({
        where,
        include: { patient: { select: { id: true, firstName: true, lastName: true } }, invoice: true, insurance: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.claim.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 } };
  }

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const count = await prisma.invoice.count({ where: { tenantId } });
    return `INV-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;
  }
}