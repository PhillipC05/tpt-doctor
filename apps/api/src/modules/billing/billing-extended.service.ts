import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction } from '@tpt-doctor/shared';

@Injectable()
export class BillingExtendedService {
  // ===========================
  // CPT / ICD-10 Code Management
  // ===========================

  async createCptCode(data: any) {
    return prisma.cptCode.create({ data });
  }

  async findAllCptCodes(params: { category?: string; search?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const where: any = {};
    if (params.category) where.category = params.category;
    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.cptCode.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { code: 'asc' } }),
      prisma.cptCode.count({ where }),
    ]);
    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 } };
  }

  async createIcd10Code(data: any) {
    return prisma.icd10Code.create({ data });
  }

  async findAllIcd10Codes(params: { category?: string; search?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const where: any = {};
    if (params.category) where.category = params.category;
    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.icd10Code.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { code: 'asc' } }),
      prisma.icd10Code.count({ where }),
    ]);
    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 } };
  }

  // ===========================
  // Insurance Verification
  // ===========================

  async verifyInsurance(data: any, tenantId: string, userId: string) {
    const insurance = await prisma.patientInsurance.findFirst({ where: { id: data.insuranceId, patientId: data.patientId } });
    if (!insurance) throw new NotFoundException('Insurance not found');

    // Simulated eligibility check. In production, call payer API (e.g. Change Healthcare, Availity)
    const verification = await prisma.insuranceVerification.create({
      data: {
        tenantId,
        patientId: data.patientId,
        insuranceId: data.insuranceId,
        status: 'VERIFIED',
        eligibilityData: data.eligibilityData || { verified: true, coverageLevel: 'IN_NETWORK' },
        copay: data.copay || insurance.copay,
        deductible: data.deductible || insurance.deductible,
        deductibleMet: data.deductibleMet || insurance.deductibleMet,
        outOfPocketMax: data.outOfPocketMax || null,
        verifiedBy: userId,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        notes: data.notes || null,
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'InsuranceVerification', resourceId: verification.id,
      details: { patientId: data.patientId, insuranceId: data.insuranceId }, ipAddress: '0.0.0.0',
    });

    return verification;
  }

  async getInsuranceVerifications(patientId: string, tenantId: string) {
    return prisma.insuranceVerification.findMany({
      where: { tenantId, patientId },
      orderBy: { verificationDate: 'desc' },
      include: { insurance: true },
    });
  }

  async getLatestVerification(patientId: string, insuranceId: string, tenantId: string) {
    return prisma.insuranceVerification.findFirst({
      where: { tenantId, patientId, insuranceId, status: 'VERIFIED', expiresAt: { gte: new Date() } },
      orderBy: { verificationDate: 'desc' },
    });
  }

  // ===========================
  // Claim Submission (837 format)
  // ===========================

  async submitClaim(data: any, tenantId: string, userId: string) {
    const claim = await prisma.claim.findFirst({ where: { id: data.claimId, tenantId } });
    if (!claim) throw new NotFoundException('Claim not found');

    // Generate 837 format data structure
    const submissionData = this.build837Format(claim, data);

    const submission = await prisma.claimSubmission.create({
      data: {
        tenantId,
        claimId: data.claimId,
        submissionType: data.submissionType || 'ORIGINAL',
        submissionData,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    await prisma.claim.update({
      where: { id: data.claimId },
      data: { status: 'SUBMITTED', submittedDate: new Date() },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'ClaimSubmission', resourceId: submission.id,
      details: { claimId: data.claimId }, ipAddress: '0.0.0.0',
    });

    return submission;
  }

  async getClaimSubmissions(claimId: string, tenantId: string) {
    return prisma.claimSubmission.findMany({
      where: { tenantId, claimId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private build837Format(claim: any, data: any): any {
    return {
      isa: {
        isa01: '00', isa02: '', isa03: '00', isa04: '',
        isa05: 'ZZ', isa06: 'SUBMITTER_ID', isa07: 'ZZ',
        isa08: 'RECEIVER_ID', isa09: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
        isa10: new Date().toISOString().slice(11, 13) + new Date().toISOString().slice(14, 16),
        isa11: '^', isa12: '00501', isa13: '000000001',
        isa14: '0', isa15: 'P', isa16: ':',
      },
      gs: { gs01: 'HC', gs02: 'SUBMITTER_ID', gs03: 'RECEIVER_ID', gs04: new Date().toISOString().slice(0, 10).replace(/-/g, ''), gs05: new Date().toISOString().slice(11, 13) + new Date().toISOString().slice(14, 16), gs06: '1', gs07: 'X', gs08: '005010X222A1' },
      claim: {
        claimId: claim.id,
        claimNumber: claim.claimNumber,
        amount: Number(claim.amount),
        serviceDate: claim.serviceDate.toISOString(),
        patientName: data.patientName || '',
        diagnosisCodes: data.diagnosisCodes || [],
        procedureCodes: data.procedureCodes || [],
        providerInfo: data.providerInfo || {},
        payerInfo: data.payerInfo || {},
      },
      se: { se01: 1, se02: '000000001' },
      iea: { iea01: '1', iea02: '000000001' },
    };
  }

  // ===========================
  // ERA / EOB Processing
  // ===========================

  async processEra(data: any, tenantId: string) {
    const claim = await prisma.claim.findFirst({ where: { claimNumber: data.payerClaimNumber, tenantId } });
    if (!claim) throw new NotFoundException('Claim not found for ERA processing');

    const era = await prisma.eraRecord.create({
      data: {
        tenantId,
        claimId: claim.id,
        payerClaimNumber: data.payerClaimNumber,
        patientResponsibility: data.patientResponsibility || null,
        amountPaid: data.amountPaid || null,
        adjustmentReason: data.adjustmentReason || null,
        adjustmentAmount: data.adjustmentAmount || null,
        serviceDate: data.serviceDate ? new Date(data.serviceDate) : null,
        processedDate: data.processedDate ? new Date(data.processedDate) : new Date(),
        status: 'RECEIVED',
        eraData: data.eraData || {},
      },
    });

    if (data.amountPaid) {
      // Update claim paid status
      const totalPaid = Number(claim.paidAmount) + Number(data.amountPaid);
      const newStatus = totalPaid >= Number(claim.amount) ? 'PAID' : claim.status;
      await prisma.claim.update({
        where: { id: claim.id },
        data: { paidAmount: totalPaid, status: newStatus },
      });
    }

    return era;
  }

  async getEraRecords(claimId: string, tenantId: string) {
    return prisma.eraRecord.findMany({
      where: { tenantId, claimId },
      orderBy: { processedDate: 'desc' },
    });
  }

  async applyEra(id: string, tenantId: string, userId: string) {
    const era = await prisma.eraRecord.findFirst({ where: { id, tenantId } });
    if (!era) throw new NotFoundException('ERA record not found');

    return prisma.eraRecord.update({
      where: { id },
      data: { status: 'APPLIED' },
    });
  }

  // ===========================
  // Patient Billing Statements
  // ===========================

  async generateStatement(patientId: string, tenantId: string, userId: string) {
    const invoices = await prisma.invoice.findMany({
      where: { tenantId, patientId, status: { notIn: ['COMPLETED', 'REFUNDED'] } },
      orderBy: { createdAt: 'desc' },
    });

    const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0);
    const balanceDue = totalBilled - totalPaid;

    const statementNumber = `STMT-${Date.now()}`;
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const statement = await prisma.billingStatement.create({
      data: {
        tenantId,
        patientId,
        statementNumber,
        periodStart,
        periodEnd,
        totalBilled,
        totalPaid,
        balanceDue,
        items: invoices.map(inv => ({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.createdAt,
          total: Number(inv.total),
          amountPaid: Number(inv.amountPaid),
          balanceDue: Number(inv.balanceDue),
        })),
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'BillingStatement', resourceId: statement.id,
      details: { patientId, balanceDue }, ipAddress: '0.0.0.0',
    });

    return statement;
  }

  async getStatements(patientId: string, tenantId: string) {
    return prisma.billingStatement.findMany({
      where: { tenantId, patientId },
      orderBy: { statementDate: 'desc' },
    });
  }

  async markStatementSent(id: string, data: { sentVia: string }, tenantId: string) {
    const statement = await prisma.billingStatement.findFirst({ where: { id, tenantId } });
    if (!statement) throw new NotFoundException('Statement not found');

    return prisma.billingStatement.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date(), sentVia: data.sentVia },
    });
  }

  // ===========================
  // Payment Processing (Stripe/Airwallex)
  // ===========================

  async processPaymentWithProvider(data: any, tenantId: string, userId: string) {
    // In production, delegate to Stripe SDK or Airwallex SDK
    const provider = data.paymentProvider; // STRIPE or AIRWALLEX
    let transactionId = '';

    if (provider === 'STRIPE') {
      transactionId = `pi_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    } else if (provider === 'AIRWALLEX') {
      transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    return { transactionId, status: 'COMPLETED', provider };
  }

  // ===========================
  // Copay Tracking
  // ===========================

  async recordCopay(data: any, tenantId: string, userId: string) {
    const appointment = await prisma.appointment.findFirst({ where: { id: data.appointmentId, tenantId } });
    if (!appointment) throw new NotFoundException('Appointment not found');

    const copay = await prisma.copayCollection.create({
      data: {
        tenantId,
        patientId: appointment.patientId,
        appointmentId: data.appointmentId,
        amount: data.amount,
        collectionMethod: data.collectionMethod,
        collectedBy: userId,
        isVerified: data.isVerified || false,
        notes: data.notes || null,
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'CopayCollection', resourceId: copay.id,
      details: { appointmentId: data.appointmentId, amount: data.amount }, ipAddress: '0.0.0.0',
    });

    return copay;
  }

  async getCopayHistory(patientId: string, tenantId: string) {
    return prisma.copayCollection.findMany({
      where: { tenantId, patientId },
      orderBy: { collectedAt: 'desc' },
      include: { appointment: { select: { id: true, startTime: true, title: true } } },
    });
  }

  // ===========================
  // HSA / FSA Accounts
  // ===========================

  async createHsaFsaAccount(data: any, tenantId: string, userId: string) {
    const account = await prisma.hsaFsaAccount.create({
      data: {
        tenantId,
        patientId: data.patientId,
        accountType: data.accountType,
        accountNumber: data.accountNumber,
        providerName: data.providerName,
        balance: data.balance || 0,
        contributionLimit: data.contributionLimit || null,
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'HsaFsaAccount', resourceId: account.id,
      details: { patientId: data.patientId, accountType: data.accountType }, ipAddress: '0.0.0.0',
    });

    return account;
  }

  async getHsaFsaAccounts(patientId: string, tenantId: string) {
    return prisma.hsaFsaAccount.findMany({ where: { tenantId, patientId, isActive: true } });
  }

  async updateHsaFsaBalance(id: string, balance: number, tenantId: string) {
    const account = await prisma.hsaFsaAccount.findFirst({ where: { id, tenantId } });
    if (!account) throw new NotFoundException('HSA/FSA account not found');

    return prisma.hsaFsaAccount.update({ where: { id }, data: { balance } });
  }

  // ===========================
  // Aging Reports
  // ===========================

  async generateAgingReport(tenantId: string, userId: string) {
    const invoices = await prisma.invoice.findMany({
      where: { tenantId, status: { notIn: ['COMPLETED', 'REFUNDED'] } },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
    });

    const now = new Date();
    let aging_0_30 = 0;
    let aging_31_60 = 0;
    let aging_61_90 = 0;
    let aging_91_120 = 0;
    let aging_120plus = 0;
    const breakdown: any[] = [];

    for (const invoice of invoices) {
      const daysSinceDue = Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const balance = Number(invoice.balanceDue);

      if (daysSinceDue <= 0) aging_0_30 += balance;
      else if (daysSinceDue <= 30) aging_0_30 += balance;
      else if (daysSinceDue <= 60) aging_31_60 += balance;
      else if (daysSinceDue <= 90) aging_61_90 += balance;
      else if (daysSinceDue <= 120) aging_91_120 += balance;
      else aging_120plus += balance;

      breakdown.push({
        patientId: invoice.patient.id,
        patientName: `${invoice.patient.firstName} ${invoice.patient.lastName}`,
        invoiceNumber: invoice.invoiceNumber,
        total: Number(invoice.total),
        balanceDue: balance,
        daysOverdue: daysSinceDue <= 0 ? 0 : daysSinceDue,
        dueDate: invoice.dueDate,
      });
    }

    const totalOutstanding = aging_0_30 + aging_31_60 + aging_61_90 + aging_91_120 + aging_120plus;

    const report = await prisma.agingReport.create({
      data: {
        tenantId,
        reportDate: now,
        currentBalance: aging_0_30,
        aging_0_30, aging_31_60, aging_61_90, aging_91_120, aging_120plus,
        totalOutstanding,
        breakdown,
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'AgingReport', resourceId: report.id,
      details: { totalOutstanding }, ipAddress: '0.0.0.0',
    });

    return report;
  }

  async getAgingReports(tenantId: string) {
    return prisma.agingReport.findMany({
      where: { tenantId },
      orderBy: { reportDate: 'desc' },
      take: 12,
    });
  }

  // ===========================
  // Write-off Management
  // ===========================

  async createWriteOff(data: any, tenantId: string, userId: string) {
    const invoice = await prisma.invoice.findFirst({ where: { id: data.invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const writeOff = await prisma.writeOff.create({
      data: {
        tenantId,
        invoiceId: data.invoiceId,
        amount: data.amount,
        reason: data.reason,
        writeOffType: data.writeOffType,
        approvedBy: userId,
        notes: data.notes || null,
      },
    });

    // Update invoice balance
    const newBalanceDue = Math.max(0, Number(invoice.balanceDue) - Number(data.amount));
    await prisma.invoice.update({
      where: { id: data.invoiceId },
      data: { balanceDue: newBalanceDue },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'WriteOff', resourceId: writeOff.id,
      details: { invoiceId: data.invoiceId, amount: data.amount }, ipAddress: '0.0.0.0',
    });

    return writeOff;
  }

  async getWriteOffs(tenantId: string, params: { invoiceId?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: any = { tenantId };
    if (params.invoiceId) where.invoiceId = params.invoiceId;

    const [data, total] = await Promise.all([
      prisma.writeOff.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.writeOff.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 } };
  }

  // ===========================
  // Refund Processing
  // ===========================

  async processRefund(data: any, tenantId: string, userId: string) {
    const payment = await prisma.payment.findFirst({ where: { id: data.paymentId, tenantId } });
    if (!payment) throw new NotFoundException('Payment not found');

    if (Number(data.amount) > Number(payment.amount)) {
      throw new BadRequestException('Refund amount cannot exceed payment amount');
    }

    const refund = await prisma.refund.create({
      data: {
        tenantId,
        paymentId: data.paymentId,
        invoiceId: payment.invoiceId,
        amount: data.amount,
        reason: data.reason,
        status: 'PROCESSED',
        transactionId: `ref_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        processedBy: userId,
        processedAt: new Date(),
        notes: data.notes || null,
      },
    });

    // Update invoice and payment records
    const invoice = await prisma.invoice.findFirst({ where: { id: payment.invoiceId } });
    if (invoice) {
      const newAmountPaid = Math.max(0, Number(invoice.amountPaid) - Number(data.amount));
      const newBalanceDue = Number(invoice.balanceDue) + Number(data.amount);
      await prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: { amountPaid: newAmountPaid, balanceDue: newBalanceDue },
      });
    }

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'Refund', resourceId: refund.id,
      details: { paymentId: data.paymentId, amount: data.amount }, ipAddress: '0.0.0.0',
    });

    return refund;
  }

  async getRefunds(tenantId: string, params: { invoiceId?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: any = { tenantId };
    if (params.invoiceId) where.invoiceId = params.invoiceId;

    const [data, total] = await Promise.all([
      prisma.refund.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.refund.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 } };
  }
}