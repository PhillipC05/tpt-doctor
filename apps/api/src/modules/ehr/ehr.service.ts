import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction } from '@tpt-doctor/shared';

@Injectable()
export class EhrService {
  async createEncounter(data: any, tenantId: string, userId: string) {
    const encounter = await prisma.encounter.create({
      data: {
        tenantId,
        patientId: data.patientId,
        staffId: data.staffId,
        appointmentId: data.appointmentId || null,
        encounterType: data.encounterType,
        chiefComplaint: data.chiefComplaint,
        subjective: data.subjective || null,
        objective: data.objective || null,
        assessment: data.assessment || null,
        plan: data.plan || null,
        vitals: data.vitals || undefined,
        diagnosisCodes: data.diagnosisCodes ? {
          create: data.diagnosisCodes.map((d: any) => ({
            code: d.code,
            description: d.description,
            isPrimary: d.isPrimary || false,
          })),
        } : undefined,
      },
      include: { diagnosisCodes: true, patient: { select: { id: true, firstName: true, lastName: true } } },
    });

    // If linked to appointment, mark as completed
    if (data.appointmentId) {
      await prisma.appointment.update({
        where: { id: data.appointmentId },
        data: { status: 'COMPLETED' },
      });
    }

    await logAuditEvent({
      tenantId, userId,
      action: AuditAction.CREATE,
      resource: 'Encounter',
      resourceId: encounter.id,
      details: { patientId: data.patientId, encounterType: data.encounterType },
      ipAddress: '0.0.0.0',
    });

    return encounter;
  }

  async findEncounters(patientId: string, tenantId: string) {
    return prisma.encounter.findMany({
      where: { patientId, tenantId },
      include: { diagnosisCodes: true, staff: { select: { title: true, user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { date: 'desc' },
    });
  }

  async findEncounter(id: string, tenantId: string) {
    const encounter = await prisma.encounter.findFirst({
      where: { id, tenantId },
      include: {
        diagnosisCodes: true,
        documents: true,
        patient: true,
        staff: { include: { user: true } },
      },
    });
    if (!encounter) throw new NotFoundException('Encounter not found');
    return encounter;
  }

  async updateEncounter(id: string, data: any, tenantId: string, userId: string) {
    const existing = await prisma.encounter.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Encounter not found');

    const encounter = await prisma.encounter.update({
      where: { id },
      data: {
        ...(data.subjective !== undefined && { subjective: data.subjective }),
        ...(data.objective !== undefined && { objective: data.objective }),
        ...(data.assessment !== undefined && { assessment: data.assessment }),
        ...(data.plan !== undefined && { plan: data.plan }),
        ...(data.vitals !== undefined && { vitals: data.vitals }),
        ...(data.chiefComplaint && { chiefComplaint: data.chiefComplaint }),
        ...(data.isSigned && { isSigned: true, signedAt: new Date(), signedBy: userId }),
      },
      include: { diagnosisCodes: true },
    });

    await logAuditEvent({
      tenantId, userId,
      action: AuditAction.UPDATE,
      resource: 'Encounter',
      resourceId: id,
      details: { signed: data.isSigned },
      ipAddress: '0.0.0.0',
    });

    return encounter;
  }

  async createMedicalCondition(data: any, tenantId: string, userId: string) {
    const condition = await prisma.medicalCondition.create({
      data: {
        patientId: data.patientId,
        code: data.code,
        description: data.description,
        onsetDate: new Date(data.onsetDate),
        resolvedDate: data.resolvedDate ? new Date(data.resolvedDate) : null,
        isChronic: data.isChronic || false,
        severity: data.severity || null,
        notes: data.notes || null,
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'MedicalCondition', resourceId: condition.id,
      details: { patientId: data.patientId, code: data.code }, ipAddress: '0.0.0.0',
    });

    return condition;
  }

  async findAllConditions(patientId: string, tenantId: string) {
    return prisma.medicalCondition.findMany({
      where: { patientId },
      orderBy: { onsetDate: 'desc' },
    });
  }

  async createAllergy(data: any, tenantId: string, userId: string) {
    const allergy = await prisma.allergy.create({
      data: {
        patientId: data.patientId,
        allergen: data.allergen,
        reaction: data.reaction,
        severity: data.severity || 'WARNING',
        onsetDate: new Date(data.onsetDate),
        isActive: data.isActive ?? true,
        notes: data.notes || null,
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'Allergy', resourceId: allergy.id,
      details: { patientId: data.patientId, allergen: data.allergen }, ipAddress: '0.0.0.0',
    });

    return allergy;
  }

  async findAllAllergies(patientId: string, tenantId: string) {
    return prisma.allergy.findMany({
      where: { patientId },
      orderBy: { onsetDate: 'desc' },
    });
  }

  async createMedication(data: any, tenantId: string, userId: string) {
    const medication = await prisma.patientMedication.create({
      data: {
        patientId: data.patientId,
        medicationName: data.medicationName,
        strength: data.strength,
        form: data.form,
        route: data.route,
        frequency: data.frequency,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        isActive: data.isActive ?? true,
        prescribedBy: userId,
        notes: data.notes || null,
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'PatientMedication', resourceId: medication.id,
      details: { patientId: data.patientId, medication: data.medicationName }, ipAddress: '0.0.0.0',
    });

    return medication;
  }

  async findAllMedications(patientId: string, tenantId: string) {
    return prisma.patientMedication.findMany({
      where: { patientId },
      orderBy: { startDate: 'desc' },
    });
  }

  async getPatientTimeline(patientId: string, tenantId: string) {
    const [encounters, appointments, labOrders, prescriptions] = await Promise.all([
      prisma.encounter.findMany({ where: { patientId, tenantId }, orderBy: { date: 'desc' } }),
      prisma.appointment.findMany({ where: { patientId, tenantId }, orderBy: { startTime: 'desc' } }),
      prisma.labOrder.findMany({ where: { patientId, tenantId }, orderBy: { orderedAt: 'desc' } }),
      prisma.prescription.findMany({ where: { patientId, tenantId }, orderBy: { createdAt: 'desc' } }),
    ]);

    // Merge and sort all events by date
    const timeline = [
      ...encounters.map((e: any) => ({ type: 'encounter', date: e.date, data: e })),
      ...appointments.map((a: any) => ({ type: 'appointment', date: a.startTime, data: a })),
      ...labOrders.map((l: any) => ({ type: 'lab_order', date: l.orderedAt, data: l })),
      ...prescriptions.map((p: any) => ({ type: 'prescription', date: p.createdAt, data: p })),
    ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return timeline;
  }

  // ===== EHR Templates =====
  async createTemplate(data: any, tenantId: string, userId: string) {
    const template = await prisma.ehrTemplate.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description || null,
        templateType: data.templateType,
        category: data.category,
        content: data.content,
        isPublic: data.isPublic ?? true,
        createdBy: userId,
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'EhrTemplate', resourceId: template.id,
      details: { name: data.name, templateType: data.templateType }, ipAddress: '0.0.0.0',
    });

    return template;
  }

  async getTemplates(tenantId: string, params: { templateType?: string; category?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const where: any = { tenantId, isActive: true };

    if (params.templateType) where.templateType = params.templateType;
    if (params.category) where.category = params.category;

    const [data, total] = await Promise.all([
      prisma.ehrTemplate.findMany({
        where,
        include: { creator: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.ehrTemplate.count({ where }),
    ]);

    return {
      data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 },
    };
  }

  async getTemplate(id: string, tenantId: string) {
    const template = await prisma.ehrTemplate.findFirst({ where: { id, tenantId } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async updateTemplate(id: string, data: any, tenantId: string, userId: string) {
    const existing = await prisma.ehrTemplate.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Template not found');

    return prisma.ehrTemplate.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.templateType && { templateType: data.templateType }),
        ...(data.category && { category: data.category }),
        ...(data.content && { content: data.content }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async deleteTemplate(id: string, tenantId: string, userId: string) {
    const existing = await prisma.ehrTemplate.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Template not found');

    await prisma.ehrTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.DELETE, resource: 'EhrTemplate', resourceId: id,
      details: { name: existing.name }, ipAddress: '0.0.0.0',
    });
  }

  // ===== Clinical Decision Support Rules =====
  async createDecisionRule(data: any, tenantId: string, userId: string) {
    const rule = await prisma.decisionSupportRule.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description || null,
        category: data.category,
        severity: data.severity || 'WARNING',
        condition: data.condition,
        action: data.action,
        appliesToRoles: data.appliesToRoles || [],
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'DecisionSupportRule', resourceId: rule.id,
      details: { name: data.name, category: data.category }, ipAddress: '0.0.0.0',
    });

    return rule;
  }

  async getDecisionRules(tenantId: string, params: { category?: string; isActive?: boolean; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const where: any = { tenantId };

    if (params.category) where.category = params.category;
    if (params.isActive !== undefined) where.isActive = params.isActive;

    const [data, total] = await Promise.all([
      prisma.decisionSupportRule.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.decisionSupportRule.count({ where }),
    ]);

    return {
      data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 },
    };
  }

  async evaluateDecisionRules(patientId: string, context: any, tenantId: string) {
    // Get active rules for the tenant
    const rules = await prisma.decisionSupportRule.findMany({
      where: { tenantId, isActive: true },
    });

    // Get patient data for evaluation
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      include: {
        medicalConditions: true,
        allergies: true,
        medications: { where: { isActive: true } },
      },
    });

    if (!patient) throw new NotFoundException('Patient not found');

    const triggeredRules: any[] = [];

    // Evaluate each rule against patient data
    for (const rule of rules) {
      const condition = rule.condition as any;
      let triggered = false;

      // Basic rule evaluation based on condition type
      switch (condition.type) {
        case 'allergy_check': {
          if (condition.allergen) {
            triggered = patient.allergies.some(
              (a) => a.allergen.toLowerCase().includes(condition.allergen.toLowerCase()) && a.isActive,
            );
          }
          break;
        }
        case 'age_based': {
          if (condition.minAge || condition.maxAge) {
            const age = Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            if (condition.minAge && age < condition.minAge) triggered = true;
            if (condition.maxAge && age > condition.maxAge) triggered = true;
          }
          break;
        }
        case 'condition_based': {
          if (condition.icdCode) {
            triggered = patient.medicalConditions.some(
              (mc) => mc.code.startsWith(condition.icdCode),
            );
          }
          break;
        }
        case 'duplicate_therapy': {
          if (condition.medicationName && context?.medicationName) {
            const lowerName = condition.medicationName.toLowerCase();
            triggered = patient.medications.some(
              (m) => m.medicationName.toLowerCase().includes(lowerName) && m.isActive,
            );
          }
          break;
        }
        default:
          // For drug interaction, dosage check — requires external system integration
          triggered = false;
      }

      if (triggered) {
        triggeredRules.push({
          ruleId: rule.id,
          name: rule.name,
          severity: rule.severity,
          category: rule.category,
          message: (rule.action as any).message || rule.name,
          recommendation: (rule.action as any).recommendation || null,
        });
      }
    }

    return {
      patientId,
      evaluatedAt: new Date().toISOString(),
      rulesEvaluated: rules.length,
      triggeredRules,
    };
  }

  async updateDecisionRule(id: string, data: any, tenantId: string, userId: string) {
    const existing = await prisma.decisionSupportRule.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Decision support rule not found');

    return prisma.decisionSupportRule.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category && { category: data.category }),
        ...(data.severity && { severity: data.severity }),
        ...(data.condition && { condition: data.condition }),
        ...(data.action && { action: data.action }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.appliesToRoles && { appliesToRoles: data.appliesToRoles }),
      },
    });
  }

  async deleteDecisionRule(id: string, tenantId: string, userId: string) {
    const existing = await prisma.decisionSupportRule.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Decision support rule not found');

    await prisma.decisionSupportRule.delete({ where: { id } });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.DELETE, resource: 'DecisionSupportRule', resourceId: id,
      details: { name: existing.name }, ipAddress: '0.0.0.0',
    });
  }
}
