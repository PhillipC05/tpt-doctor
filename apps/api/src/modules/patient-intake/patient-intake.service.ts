import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma, Prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction, Gender } from '@tpt-doctor/shared';
import * as crypto from 'crypto';

@Injectable()
export class PatientIntakeService {
  private generateRegistrationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async submit(data: any, tenantId: string) {
    // Check for duplicate email
    const existingPatient = await prisma.patient.findFirst({ where: { email: data.email, tenantId } });
    const existingIntake = await prisma.patientIntake.findFirst({ where: { email: data.email, tenantId, status: 'PENDING' } });

    if (existingPatient) throw new BadRequestException('A patient with this email already exists');
    if (existingIntake) throw new BadRequestException('There is already a pending intake for this email');

    const intake = await prisma.patientIntake.create({
      data: {
        tenantId,
        status: 'PENDING',
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        address: data.address || {},
        emergencyContact: data.emergencyContact || null,
        medicalHistory: data.medicalHistory || null,
        insuranceInfo: data.insuranceInfo || null,
        consentToTreat: data.consentToTreat || false,
        consentPrivacy: data.consentPrivacy || false,
        consentTelehealth: data.consentTelehealth || false,
        identifiers: data.identifiers || null,
        documents: data.documents || [],
        registrationToken: this.generateRegistrationToken(),
        tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        source: data.source || 'PORTAL',
        notes: data.notes || null,
      },
    });

    return {
      ...intake,
      registrationToken: undefined, // Don't expose full token in production - would be emailed
    };
  }

  async findAll(tenantId: string, params: { status?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: any = { tenantId };
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      prisma.patientIntake.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.patientIntake.count({ where }),
    ]);

    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  async findOne(id: string, tenantId: string) {
    const intake = await prisma.patientIntake.findFirst({ where: { id, tenantId } });
    if (!intake) throw new NotFoundException('Patient intake not found');
    return intake;
  }

  async approve(id: string, tenantId: string, userId: string) {
    const intake = await prisma.patientIntake.findFirst({ where: { id, tenantId } });
    if (!intake) throw new NotFoundException('Patient intake not found');
    if (intake.status !== 'PENDING') throw new BadRequestException('Intake is not in pending status');

    // Generate MRN
    const mrn = `MRN-${tenantId.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // Create user account (would integrate with Auth0 in production)
    const user = await prisma.user.create({
      data: {
        email: intake.email,
        firstName: intake.firstName,
        lastName: intake.lastName,
        phone: intake.phone,
        auth0Id: `pending-${intake.id}`, // placeholder - Auth0 integration
      },
    });

    // Create patient record
    const patient = await prisma.patient.create({
      data: {
        tenantId,
        userId: user.id,
        medicalRecordNumber: mrn,
        firstName: intake.firstName,
        lastName: intake.lastName,
        dateOfBirth: intake.dateOfBirth,
        gender: intake.gender,
        email: intake.email,
        phone: intake.phone || '',
        address: intake.address as any,
        emergencyContact: intake.emergencyContact ?? Prisma.JsonNull,
      },
    });

    // Update intake status
    await prisma.patientIntake.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        patientId: patient.id,
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'Patient', resourceId: patient.id, details: { source: 'INTAKE', intakeId: id }, ipAddress: '0.0.0.0' });

    return { patient, user, message: 'Patient registration approved and account created' };
  }

  async reject(id: string, reason: string, tenantId: string, userId: string) {
    const intake = await prisma.patientIntake.findFirst({ where: { id, tenantId } });
    if (!intake) throw new NotFoundException('Patient intake not found');
    if (intake.status !== 'PENDING') throw new BadRequestException('Intake is not in pending status');

    await prisma.patientIntake.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason: reason || null, reviewedBy: userId, reviewedAt: new Date() },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.UPDATE, resource: 'PatientIntake', resourceId: id, details: { action: 'REJECTED', reason }, ipAddress: '0.0.0.0' });

    return { rejected: true };
  }

  async getStats(tenantId: string) {
    const [total, byStatus, bySource] = await Promise.all([
      prisma.patientIntake.count({ where: { tenantId } }),
      prisma.patientIntake.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
      prisma.patientIntake.groupBy({ by: ['source'], where: { tenantId }, _count: true }),
    ]);

    return { total, byStatus, bySource };
  }
}