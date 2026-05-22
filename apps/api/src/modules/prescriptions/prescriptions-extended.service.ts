import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction } from '@tpt-doctor/shared';

@Injectable()
export class PrescriptionsExtendedService {
  // ===========================
  // ePrescribing (Surescripts Integration)
  // ===========================

  async sendToPharmacy(prescriptionId: string, data: any, tenantId: string, userId: string) {
    const prescription = await prisma.prescription.findFirst({ where: { id: prescriptionId, tenantId } });
    if (!prescription) throw new NotFoundException('Prescription not found');

    // In production, format and send via Surescripts API
    const transaction = await prisma.ePrescribingTransaction.create({
      data: {
        tenantId,
        prescriptionId,
        pharmacyId: data.pharmacyId || null,
        transactionType: 'NEW_SCRIPT',
        status: 'SENT',
        requestData: {
          medicationName: prescription.medicationName,
          strength: prescription.strength,
          form: prescription.form,
          route: prescription.route,
          frequency: prescription.frequency,
          quantity: prescription.quantity,
          refills: prescription.refills,
          dispenseAsWritten: prescription.dispenseAsWritten,
          notes: prescription.notes,
          patientId: prescription.patientId,
          prescriberId: prescription.staffId,
          pharmacyId: data.pharmacyId,
        },
        sentAt: new Date(),
        surescriptsRefId: `SR_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      },
    });

    await prisma.prescription.update({
      where: { id: prescriptionId },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'EPrescribingTransaction', resourceId: transaction.id,
      details: { prescriptionId, pharmacyId: data.pharmacyId }, ipAddress: '0.0.0.0',
    });

    return transaction;
  }

  async getEPrescribingTransactions(prescriptionId: string, tenantId: string) {
    return prisma.ePrescribingTransaction.findMany({
      where: { tenantId, prescriptionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ===========================
  // Drug Interaction Checker
  // ===========================

  async checkDrugInteractions(patientId: string, tenantId: string) {
    const activePrescriptions = await prisma.prescription.findMany({
      where: { tenantId, patientId, status: { notIn: ['CANCELLED', 'EXPIRED'] } },
    });

    const activeMedications = await prisma.patientMedication.findMany({
      where: { patientId, isActive: true },
    });

    const medicationNames = [
      ...activePrescriptions.map(p => p.medicationName),
      ...activeMedications.map(m => m.medicationName),
    ];

    const interactions: any[] = [];

    // Look up known interactions from the drug database
    for (let i = 0; i < medicationNames.length; i++) {
      for (let j = i + 1; j < medicationNames.length; j++) {
        const drugs = await prisma.drug.findMany({
          where: {
            OR: [
              { name: { contains: medicationNames[i], mode: 'insensitive' } },
              { genericName: { contains: medicationNames[i], mode: 'insensitive' } },
            ],
          },
        });

        for (const drug of drugs) {
          const foundInteractions = await prisma.drugInteraction.findMany({
            where: {
              OR: [
                { drugId: drug.id, interactingDrug: { OR: [{ name: { contains: medicationNames[j], mode: 'insensitive' } }, { genericName: { contains: medicationNames[j], mode: 'insensitive' } }] } },
                { interactingDrugId: drug.id, drug: { OR: [{ name: { contains: medicationNames[j], mode: 'insensitive' } }, { genericName: { contains: medicationNames[j], mode: 'insensitive' } }] } },
              ],
              isActive: true,
            },
            include: { drug: true, interactingDrug: true },
          });

          interactions.push(...foundInteractions);
        }
      }
    }

    return { interactions, medicationCount: medicationNames.length, hasInteractions: interactions.length > 0 };
  }

  async checkSingleDrugInteraction(drugName1: string, drugName2: string) {
    const drug1 = await prisma.drug.findFirst({
      where: { OR: [{ name: { contains: drugName1, mode: 'insensitive' } }, { genericName: { contains: drugName1, mode: 'insensitive' } }] },
    });

    const drug2 = await prisma.drug.findFirst({
      where: { OR: [{ name: { contains: drugName2, mode: 'insensitive' } }, { genericName: { contains: drugName2, mode: 'insensitive' } }] },
    });

    if (!drug1 || !drug2) {
      return { interaction: null, message: 'One or both drugs not found in database' };
    }

    const interaction = await prisma.drugInteraction.findFirst({
      where: {
        OR: [
          { drugId: drug1.id, interactingDrugId: drug2.id },
          { drugId: drug2.id, interactingDrugId: drug1.id },
        ],
        isActive: true,
      },
    });

    return { interaction, drug1, drug2 };
  }

  async createDrugInteraction(data: any) {
    return prisma.drugInteraction.create({ data });
  }

  async getDrugInteractions(params: { severity?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: any = { isActive: true };
    if (params.severity) where.severity = params.severity;

    const [data, total] = await Promise.all([
      prisma.drugInteraction.findMany({
        where,
        include: { drug: true, interactingDrug: true },
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { severity: 'desc' },
      }),
      prisma.drugInteraction.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 } };
  }

  // ===========================
  // Drug Database Management
  // ===========================

  async createDrug(data: any) {
    return prisma.drug.create({ data });
  }

  async findAllDrugs(params: { search?: string; isControlled?: boolean; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { genericName: { contains: params.search, mode: 'insensitive' } },
        { ndc: { contains: params.search } },
      ];
    }
    if (params.isControlled !== undefined) where.isControlled = params.isControlled;

    const [data, total] = await Promise.all([
      prisma.drug.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { name: 'asc' } }),
      prisma.drug.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 } };
  }

  // ===========================
  // Controlled Substance Tracking (DEA Compliance)
  // ===========================

  async logControlledSubstance(data: any, tenantId: string, userId: string) {
    const prescription = await prisma.prescription.findFirst({ where: { id: data.prescriptionId, tenantId } });
    if (!prescription) throw new NotFoundException('Prescription not found');

    const log = await prisma.controlledSubstanceLog.create({
      data: {
        tenantId,
        prescriptionId: data.prescriptionId,
        action: data.action,
        quantity: data.quantity,
        remainingQuantity: data.remainingQuantity || null,
        staffId: userId,
        patientId: prescription.patientId,
        deaNumber: data.deaNumber || null,
        notes: data.notes || null,
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'ControlledSubstanceLog', resourceId: log.id,
      details: { prescriptionId: data.prescriptionId, action: data.action, quantity: data.quantity }, ipAddress: '0.0.0.0',
    });

    return log;
  }

  async getControlledSubstanceLogs(prescriptionId: string, tenantId: string) {
    return prisma.controlledSubstanceLog.findMany({
      where: { tenantId, prescriptionId },
      orderBy: { loggedAt: 'desc' },
    });
  }

  async getControlledSubstanceReport(tenantId: string, params: { startDate?: string; endDate?: string; staffId?: string }) {
    const where: any = { tenantId };
    if (params.startDate || params.endDate) {
      where.loggedAt = {};
      if (params.startDate) where.loggedAt.gte = new Date(params.startDate);
      if (params.endDate) where.loggedAt.lte = new Date(params.endDate);
    }
    if (params.staffId) where.staffId = params.staffId;

    const logs = await prisma.controlledSubstanceLog.findMany({
      where,
      include: { prescription: true, patient: { select: { firstName: true, lastName: true } }, staff: { select: { title: true, user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { loggedAt: 'desc' },
    });

    return logs;
  }

  // ===========================
  // Pharmacy Directory
  // ===========================

  async createPharmacy(data: any) {
    return prisma.pharmacy.create({ data });
  }

  async findAllPharmacies(params: { search?: string; supportsEprescribing?: boolean; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: any = { isActive: true };
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { ncpdpId: { contains: params.search } },
      ];
    }
    if (params.supportsEprescribing !== undefined) where.supportsEprescribing = params.supportsEprescribing;

    const [data, total] = await Promise.all([
      prisma.pharmacy.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { name: 'asc' } }),
      prisma.pharmacy.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 } };
  }
}