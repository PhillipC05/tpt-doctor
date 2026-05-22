import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction, AppointmentStatus } from '@tpt-doctor/shared';

@Injectable()
export class AppointmentsService {
  async create(data: any, tenantId: string, userId: string) {
    if (new Date(data.startTime) >= new Date(data.endTime)) {
      throw new BadRequestException('End time must be after start time');
    }

    const appointment = await prisma.appointment.create({
      data: {
        tenantId,
        patientId: data.patientId,
        staffId: data.staffId,
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        type: data.type,
        isRecurring: data.isRecurring || false,
        recurringPattern: data.recurringPattern || undefined,
        location: data.location,
        notes: data.notes,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        staff: { select: { id: true, title: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });

    await logAuditEvent({
      tenantId, userId,
      action: AuditAction.CREATE,
      resource: 'Appointment',
      resourceId: appointment.id,
      details: { patientId: data.patientId, staffId: data.staffId },
      ipAddress: '0.0.0.0',
    });

    return appointment;
  }

  async findAll(tenantId: string, params: { startDate?: string; endDate?: string; staffId?: string; status?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const where: any = { tenantId };

    if (params.startDate) where.startTime = { gte: new Date(params.startDate) };
    if (params.endDate) where.endTime = { ...where.endTime, lte: new Date(params.endDate) };
    if (params.staffId) where.staffId = params.staffId;
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, dateOfBirth: true } },
          staff: { select: { id: true, title: true, user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { startTime: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.appointment.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 },
    };
  }

  async findOne(id: string, tenantId: string) {
    const appointment = await prisma.appointment.findFirst({
      where: { id, tenantId },
      include: {
        patient: true,
        staff: { include: { user: true } },
        encounter: true,
      },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }

  async update(id: string, data: any, tenantId: string, userId: string) {
    const existing = await prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Appointment not found');

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.startTime && { startTime: new Date(data.startTime) }),
        ...(data.endTime && { endTime: new Date(data.endTime) }),
        ...(data.status && { status: data.status }),
        ...(data.type && { type: data.type }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        staff: { select: { id: true, title: true } },
      },
    });

    await logAuditEvent({
      tenantId, userId,
      action: AuditAction.UPDATE,
      resource: 'Appointment', resourceId: id,
      details: { status: data.status },
      ipAddress: '0.0.0.0',
    });

    return appointment;
  }

  async cancel(id: string, tenantId: string, userId: string) {
    const existing = await prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Appointment not found');

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await logAuditEvent({
      tenantId, userId,
      action: AuditAction.UPDATE,
      resource: 'Appointment', resourceId: id,
      details: { status: 'CANCELLED' },
      ipAddress: '0.0.0.0',
    });

    return appointment;
  }

  async getUpcoming(tenantId: string, staffId?: string) {
    const where: any = {
      tenantId,
      startTime: { gte: new Date() },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    };
    if (staffId) where.staffId = staffId;

    return prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        staff: { select: { id: true, title: true } },
      },
      orderBy: { startTime: 'asc' },
      take: 20,
    });
  }

  async getCalendar(tenantId: string, startDate: string, endDate: string) {
    return prisma.appointment.findMany({
      where: {
        tenantId,
        startTime: { gte: new Date(startDate) },
        endTime: { lte: new Date(endDate) },
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        staff: { select: { id: true, title: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  // ===== Recurring Appointments =====
  async createRecurring(data: any, tenantId: string, userId: string) {
    const { recurringPattern, ...appointmentData } = data;
    const { frequency, interval, endDate, daysOfWeek, startTime, endTime } = recurringPattern;

    const startDate = new Date();
    const endDateTime = new Date(endDate);
    const appointments: any[] = [];

    // Calculate dates based on frequency
    let currentDate = new Date(startDate);
    while (currentDate <= endDateTime) {
      const dayOfWeek = currentDate.getDay();

      if (daysOfWeek.includes(dayOfWeek)) {
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);

        const apptStart = new Date(currentDate);
        apptStart.setHours(startHour, startMin, 0, 0);

        const apptEnd = new Date(currentDate);
        apptEnd.setHours(endHour, endMin, 0, 0);

        const appointment = await prisma.appointment.create({
          data: {
            tenantId,
            patientId: appointmentData.patientId,
            staffId: appointmentData.staffId,
            title: appointmentData.title,
            type: appointmentData.type,
            isRecurring: true,
            recurringPattern,
            startTime: apptStart,
            endTime: apptEnd,
            location: data.location,
            notes: data.notes,
          },
        });

        appointments.push(appointment);
      }

      // Advance date based on frequency
      switch (frequency) {
        case 'DAILY':
          currentDate.setDate(currentDate.getDate() + interval);
          break;
        case 'WEEKLY':
          currentDate.setDate(currentDate.getDate() + (7 * interval));
          break;
        case 'BIWEEKLY':
          currentDate.setDate(currentDate.getDate() + (14 * interval));
          break;
        case 'MONTHLY':
          currentDate.setMonth(currentDate.getMonth() + interval);
          break;
      }
    }

    const batchRef = appointments.length > 0 ? appointments[0].id : 'batch';
    await logAuditEvent({
      tenantId, userId,
      action: AuditAction.CREATE,
      resource: 'Appointment',
      resourceId: batchRef,
      details: { recurring: true, count: appointments.length, frequency },
      ipAddress: '0.0.0.0',
    });

    return { appointments, total: appointments.length };
  }

  // ===== Waitlist =====
  async addToWaitlist(data: any, tenantId: string, userId: string) {
    const expiresAt = new Date(data.preferredDate);
    expiresAt.setDate(expiresAt.getDate() + 14); // waitlist entry expires in 14 days

    const entry = await prisma.waitlistEntry.create({
      data: {
        tenantId,
        patientId: data.patientId,
        preferredDate: new Date(data.preferredDate),
        preferredTime: data.preferredTime || null,
        preferredStaffId: data.preferredStaffId || null,
        encounterType: data.encounterType,
        notes: data.notes || null,
        expiresAt,
        status: 'WAITING',
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      },
    });

    await logAuditEvent({
      tenantId, userId,
      action: AuditAction.CREATE,
      resource: 'WaitlistEntry',
      resourceId: entry.id,
      details: { patientId: data.patientId },
      ipAddress: '0.0.0.0',
    });

    return entry;
  }

  async getWaitlist(tenantId: string, params: { status?: string; date?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const where: any = { tenantId };

    if (params.status) where.status = params.status;
    if (params.date) where.preferredDate = new Date(params.date);

    const [data, total] = await Promise.all([
      prisma.waitlistEntry.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          preferredStaff: { select: { id: true, title: true, user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.waitlistEntry.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 },
    };
  }

  async notifyWaitlistEntry(id: string, tenantId: string, userId: string) {
    const entry = await prisma.waitlistEntry.findFirst({ where: { id, tenantId } });
    if (!entry) throw new NotFoundException('Waitlist entry not found');

    return prisma.waitlistEntry.update({
      where: { id },
      data: { status: 'NOTIFIED', notifiedAt: new Date(), notifiedVia: 'EMAIL' },
    });
  }

  async bookFromWaitlist(id: string, appointmentId: string, tenantId: string) {
    const entry = await prisma.waitlistEntry.findFirst({ where: { id, tenantId } });
    if (!entry) throw new NotFoundException('Waitlist entry not found');

    return prisma.waitlistEntry.update({
      where: { id },
      data: { status: 'BOOKED', bookedAt: new Date(), bookedAppointmentId: appointmentId },
    });
  }

  async removeFromWaitlist(id: string, tenantId: string, userId: string) {
    const entry = await prisma.waitlistEntry.findFirst({ where: { id, tenantId } });
    if (!entry) throw new NotFoundException('Waitlist entry not found');

    await prisma.waitlistEntry.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // ===== Block Times =====
  async createBlockTime(data: any, tenantId: string, userId: string) {
    if (new Date(data.startTime) >= new Date(data.endTime)) {
      throw new BadRequestException('End time must be after start time');
    }

    const blockTime = await prisma.blockTime.create({
      data: {
        tenantId,
        staffId: data.staffId || null,
        title: data.title,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        isAllDay: data.isAllDay || false,
        reason: data.reason || null,
      },
    });

    await logAuditEvent({
      tenantId, userId,
      action: AuditAction.CREATE,
      resource: 'BlockTime',
      resourceId: blockTime.id,
      details: { title: data.title },
      ipAddress: '0.0.0.0',
    });

    return blockTime;
  }

  async getBlockTimes(tenantId: string, params: { startDate?: string; endDate?: string; staffId?: string }) {
    const where: any = { tenantId };

    if (params.startDate) where.startTime = { gte: new Date(params.startDate) };
    if (params.endDate) where.endTime = { ...where.endTime, lte: new Date(params.endDate) };
    if (params.staffId) where.staffId = params.staffId;

    return prisma.blockTime.findMany({
      where,
      include: { staff: { select: { id: true, title: true, user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { startTime: 'asc' },
    });
  }

  async deleteBlockTime(id: string, tenantId: string, userId: string) {
    const blockTime = await prisma.blockTime.findFirst({ where: { id, tenantId } });
    if (!blockTime) throw new NotFoundException('Block time not found');

    await prisma.blockTime.delete({ where: { id } });

    await logAuditEvent({
      tenantId, userId,
      action: AuditAction.DELETE,
      resource: 'BlockTime',
      resourceId: id,
      details: { title: blockTime.title },
      ipAddress: '0.0.0.0',
    });
  }

  // ===== Appointments Reminders =====
  async scheduleReminder(data: { appointmentId: string; channel: string; scheduledFor: string }, tenantId: string) {
    const appointment = await prisma.appointment.findFirst({ where: { id: data.appointmentId, tenantId } });
    if (!appointment) throw new NotFoundException('Appointment not found');

    return prisma.appointmentReminder.create({
      data: {
        tenantId,
        appointmentId: data.appointmentId,
        channel: data.channel as any,
        scheduledFor: new Date(data.scheduledFor),
        status: 'PENDING',
      },
    });
  }

  async getReminders(tenantId: string, params: { status?: string; appointmentId?: string }) {
    const where: any = { tenantId };
    if (params.status) where.status = params.status;
    if (params.appointmentId) where.appointmentId = params.appointmentId;

    return prisma.appointmentReminder.findMany({
      where,
      include: {
        appointment: { select: { id: true, title: true, startTime: true } },
      },
      orderBy: { scheduledFor: 'asc' },
    });
  }

  // ===== Check-in / Check-out =====
  async checkIn(data: { appointmentId: string; notes?: string }, tenantId: string, userId: string) {
    const appointment = await prisma.appointment.findFirst({ where: { id: data.appointmentId, tenantId } });
    if (!appointment) throw new NotFoundException('Appointment not found');

    const [checkInRecord] = await Promise.all([
      prisma.checkInRecord.create({
        data: {
          tenantId,
          appointmentId: data.appointmentId,
          patientId: appointment.patientId,
          checkedInBy: userId,
          status: 'CHECKED_IN',
          notes: data.notes || null,
        },
      }),
      prisma.appointment.update({
        where: { id: data.appointmentId },
        data: { status: 'CHECKED_IN' },
      }),
    ]);

    await logAuditEvent({
      tenantId, userId,
      action: AuditAction.UPDATE,
      resource: 'CheckIn',
      resourceId: checkInRecord.id,
      details: { appointmentId: data.appointmentId },
      ipAddress: '0.0.0.0',
    });

    return checkInRecord;
  }

  async checkOut(appointmentId: string, data: { notes?: string }, tenantId: string, userId: string) {
    const checkInRecord = await prisma.checkInRecord.findFirst({
      where: { appointmentId, tenantId },
    });
    if (!checkInRecord) throw new NotFoundException('Check-in record not found');

    const now = new Date();
    const waitTimeMinutes = Math.round((now.getTime() - checkInRecord.checkedInAt.getTime()) / 60000);

    const [updatedRecord] = await Promise.all([
      prisma.checkInRecord.update({
        where: { id: checkInRecord.id },
        data: {
          status: 'CHECKED_OUT',
          checkedOutAt: now,
          checkedOutBy: userId,
          waitTimeMinutes,
          notes: data.notes || checkInRecord.notes,
        },
      }),
      prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'COMPLETED' },
      }),
    ]);

    await logAuditEvent({
      tenantId, userId,
      action: AuditAction.UPDATE,
      resource: 'CheckOut',
      resourceId: checkInRecord.id,
      details: { appointmentId, waitTimeMinutes },
      ipAddress: '0.0.0.0',
    });

    return updatedRecord;
  }

  async getCheckInRecords(tenantId: string, params: { status?: string; date?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const where: any = { tenantId };

    if (params.status) where.status = params.status;
    if (params.date) {
      const dayStart = new Date(params.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(params.date);
      dayEnd.setHours(23, 59, 59, 999);
      where.checkedInAt = { gte: dayStart, lte: dayEnd };
    }

    const [data, total] = await Promise.all([
      prisma.checkInRecord.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          appointment: { select: { id: true, title: true, startTime: true } },
        },
        orderBy: { checkedInAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.checkInRecord.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize), hasNext: page * pageSize < total, hasPrevious: page > 1 },
    };
  }
}
