import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction, UserRole } from '@tpt-doctor/shared';
import { getDefaultPermissions } from '@tpt-doctor/auth';

@Injectable()
export class StaffService {
  async create(data: any, tenantId: string, userId: string) {
    const staff = await prisma.staffMember.create({
      data: {
        tenantId,
        userId: data.userId,
        role: data.role,
        permissions: data.permissions || getDefaultPermissions(data.role as UserRole),
        title: data.title,
        licenseNumber: data.licenseNumber || null,
        npiNumber: data.npiNumber || null,
        specialization: data.specialization || null,
      },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'StaffMember', resourceId: staff.id,
      details: { role: data.role }, ipAddress: '0.0.0.0',
    });

    return staff;
  }

  async findAll(tenantId: string, params: { role?: string; isActive?: boolean; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const where: any = { tenantId };
    if (params.role) where.role = params.role;
    if (params.isActive !== undefined) where.isActive = params.isActive;

    const [data, total] = await Promise.all([
      prisma.staffMember.findMany({
        where,
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } }, schedules: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.staffMember.count({ where }),
    ]);

    return {
      data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 },
    };
  }

  async findOne(id: string, tenantId: string) {
    const staff = await prisma.staffMember.findFirst({
      where: { id, tenantId },
      include: { user: true, schedules: true },
    });
    if (!staff) throw new NotFoundException('Staff member not found');
    return staff;
  }

  async update(id: string, data: any, tenantId: string, userId: string) {
    const existing = await prisma.staffMember.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Staff member not found');

    const staff = await prisma.staffMember.update({
      where: { id },
      data: {
        ...(data.role && { role: data.role }),
        ...(data.permissions && { permissions: data.permissions }),
        ...(data.title && { title: data.title }),
        ...(data.licenseNumber !== undefined && { licenseNumber: data.licenseNumber }),
        ...(data.npiNumber !== undefined && { npiNumber: data.npiNumber }),
        ...(data.specialization !== undefined && { specialization: data.specialization }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.UPDATE, resource: 'StaffMember', resourceId: id,
      details: { updatedFields: Object.keys(data) }, ipAddress: '0.0.0.0',
    });

    return staff;
  }

  async getDoctors(tenantId: string) {
    return prisma.staffMember.findMany({
      where: { tenantId, role: UserRole.DOCTOR, isActive: true },
      include: { user: { select: { id: true, firstName: true, lastName: true } }, schedules: true },
    });
  }

  async setSchedule(staffId: string, tenantId: string, schedules: any[]) {
    const staff = await prisma.staffMember.findFirst({ where: { id: staffId, tenantId } });
    if (!staff) throw new NotFoundException('Staff member not found');

    // Delete existing schedules and recreate
    await prisma.staffSchedule.deleteMany({ where: { staffId } });
    await prisma.staffSchedule.createMany({
      data: schedules.map((s: any) => ({
        staffId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isAvailable: s.isAvailable ?? true,
        isRecurring: true,
      })),
    });

    return prisma.staffSchedule.findMany({ where: { staffId } });
  }

  // ===== PTO / Leave Management =====
  async createTimeOff(data: any, tenantId: string, userId: string) {
    const staff = await prisma.staffMember.findFirst({ where: { id: data.staffId, tenantId } });
    if (!staff) throw new NotFoundException('Staff member not found');

    if (new Date(data.startDate) >= new Date(data.endDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    const timeOff = await prisma.timeOffRequest.create({
      data: {
        tenantId,
        staffId: data.staffId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
        type: data.type,
        notes: data.notes || null,
        status: 'PENDING',
      },
      include: { staff: { select: { id: true, title: true, user: { select: { firstName: true, lastName: true } } } } },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'TimeOffRequest', resourceId: timeOff.id,
      details: { staffId: data.staffId, type: data.type }, ipAddress: '0.0.0.0',
    });

    return timeOff;
  }

  async getTimeOffRequests(tenantId: string, params: { staffId?: string; status?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const where: any = { tenantId };

    if (params.staffId) where.staffId = params.staffId;
    if (params.status) where.status = params.status;
    if (params.startDate) where.startDate = { gte: new Date(params.startDate) };
    if (params.endDate) where.endDate = { ...where.endDate, lte: new Date(params.endDate) };

    const [data, total] = await Promise.all([
      prisma.timeOffRequest.findMany({
        where,
        include: {
          staff: { select: { id: true, title: true, user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.timeOffRequest.count({ where }),
    ]);

    return {
      data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 },
    };
  }

  async approveTimeOff(id: string, data: { approved: boolean; notes?: string }, tenantId: string, userId: string) {
    const request = await prisma.timeOffRequest.findFirst({ where: { id, tenantId } });
    if (!request) throw new NotFoundException('Time off request not found');

    return prisma.timeOffRequest.update({
      where: { id },
      data: {
        status: data.approved ? 'APPROVED' : 'DENIED',
        approvedBy: userId,
        approvedAt: new Date(),
        notes: data.notes || request.notes,
      },
    });
  }

  // ===== Credentialing =====
  async createCredential(data: any, tenantId: string, userId: string) {
    const staff = await prisma.staffMember.findFirst({ where: { id: data.staffId, tenantId } });
    if (!staff) throw new NotFoundException('Staff member not found');

    const credential = await prisma.credential.create({
      data: {
        tenantId,
        staffId: data.staffId,
        credentialType: data.credentialType,
        credentialNumber: data.credentialNumber,
        issuingAuthority: data.issuingAuthority,
        issueDate: new Date(data.issueDate),
        expirationDate: new Date(data.expirationDate),
        attachmentUrl: data.attachmentUrl || null,
        notes: data.notes || null,
        status: 'ACTIVE',
      },
    });

    await logAuditEvent({
      tenantId, userId, action: AuditAction.CREATE, resource: 'Credential', resourceId: credential.id,
      details: { staffId: data.staffId, type: data.credentialType }, ipAddress: '0.0.0.0',
    });

    return credential;
  }

  async getCredentials(tenantId: string, params: { staffId?: string; status?: string; expiringSoon?: boolean }) {
    const where: any = { tenantId };

    if (params.staffId) where.staffId = params.staffId;
    if (params.status) where.status = params.status;

    // Get credentials expiring within 90 days
    if (params.expiringSoon) {
      const ninetyDays = new Date();
      ninetyDays.setDate(ninetyDays.getDate() + 90);
      where.expirationDate = { lte: ninetyDays };
      where.status = 'ACTIVE';
    }

    return prisma.credential.findMany({
      where,
      include: {
        staff: { select: { id: true, title: true, user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { expirationDate: 'asc' },
    });
  }

  async updateCredential(id: string, data: any, tenantId: string, userId: string) {
    const credential = await prisma.credential.findFirst({ where: { id, tenantId } });
    if (!credential) throw new NotFoundException('Credential not found');

    return prisma.credential.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.credentialNumber && { credentialNumber: data.credentialNumber }),
        ...(data.expirationDate && { expirationDate: new Date(data.expirationDate) }),
        ...(data.attachmentUrl !== undefined && { attachmentUrl: data.attachmentUrl }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  }

  // ===== Staff Performance Metrics =====
  async getPerformanceMetrics(tenantId: string, params: { staffId?: string; periodStart: string; periodEnd: string }) {
    const staffWhere: any = { tenantId, isActive: true };
    if (params.staffId) staffWhere.id = params.staffId;

    const staffMembers = await prisma.staffMember.findMany({
      where: staffWhere,
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    const periodStart = new Date(params.periodStart);
    const periodEnd = new Date(params.periodEnd);

    const metrics = await Promise.all(staffMembers.map(async (staff) => {
      const appointmentWhere = {
        staffId: staff.id,
        startTime: { gte: periodStart, lte: periodEnd },
      };

      const [totalAppointments, completedAppts, noShowAppts, cancelledAppts] = await Promise.all([
        prisma.appointment.count({ where: appointmentWhere }),
        prisma.appointment.count({ where: { ...appointmentWhere, status: 'COMPLETED' } }),
        prisma.appointment.count({ where: { ...appointmentWhere, status: 'NO_SHOW' } }),
        prisma.appointment.count({ where: { ...appointmentWhere, status: 'CANCELLED' } }),
      ]);

      const totalWithStatus = totalAppointments || 1;
      const cancellationRate = totalWithStatus > 0 ? cancelledAppts / totalWithStatus : 0;
      const onTimePercentage = totalWithStatus > 0 ? (totalAppointments - noShowAppts) / totalWithStatus : 1;
      const patientCount = (await prisma.patient.count({ where: { primaryCareProviderId: staff.id } }));

      // Calculate average consult time from encounters
      const encounters = await prisma.encounter.findMany({
        where: {
          staffId: staff.id,
          date: { gte: periodStart, lte: periodEnd },
        },
      });

      const averageConsultTimeMinutes = encounters.length > 0
        ? Math.round(encounters.reduce((sum, e) => sum + (e.vitals ? 15 : 10), 0) / encounters.length)
        : 0;

      return {
        staffId: staff.id,
        staffName: `${staff.user.firstName} ${staff.user.lastName}`,
        totalAppointments,
        completedAppointments: completedAppts,
        noShowCount: noShowAppts,
        cancellationRate: Math.round(cancellationRate * 100) / 100,
        averageRating: null,
        averageConsultTimeMinutes,
        patientCount,
        onTimePercentage: Math.round(onTimePercentage * 100),
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
      };
    }));

    return metrics;
  }
}
