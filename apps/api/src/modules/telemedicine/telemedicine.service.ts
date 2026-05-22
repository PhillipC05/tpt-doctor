import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import * as crypto from 'crypto';

@Injectable()
export class TelemedicineService {
  /**
   * Create a telemedicine session for an appointment
   */
  async createSession(appointmentId: string, tenantId: string): Promise<any> {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId },
      include: { patient: true, staff: true },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.type !== 'TELEMEDICINE') {
      throw new BadRequestException('Appointment is not a telemedicine appointment');
    }

    // Check if telemedicine consent exists
    const consent = await prisma.patientConsent.findUnique({
      where: {
        patientId_consentType: {
          patientId: appointment.patientId,
          consentType: 'TELEMEDICINE',
        },
      },
    });

    if (!consent || !consent.isGranted) {
      throw new ForbiddenException('Patient has not granted telemedicine consent');
    }

    // Check for recording consent
    const recordingConsent = await prisma.patientConsent.findUnique({
      where: {
        patientId_consentType: {
          patientId: appointment.patientId,
          consentType: 'RECORDING',
        },
      },
    });

    // Generate a unique room name
    const roomName = `telemed-${tenantId.slice(0, 8)}-${appointmentId.slice(0, 8)}-${Date.now().toString(36)}`;
    const roomToken = crypto.randomBytes(32).toString('hex');

    const session = await prisma.telemedicineSession.create({
      data: {
        tenantId,
        appointmentId,
        patientId: appointment.patientId,
        staffId: appointment.staffId,
        status: 'SCHEDULED',
        roomName,
        roomToken,
        isRecorded: false,
        recordingConsent: recordingConsent?.isGranted || false,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        staff: { select: { id: true, title: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });

    return session;
  }

  /**
   * Start a telemedicine session (move to virtual waiting room)
   */
  async enterWaitingRoom(sessionId: string, tenantId: string): Promise<any> {
    const session = await this.findSessionOrThrow(sessionId, tenantId);

    if (session.status !== 'SCHEDULED') {
      throw new BadRequestException(`Cannot enter waiting room. Session is ${session.status}`);
    }

    const updated = await prisma.telemedicineSession.update({
      where: { id: sessionId },
      data: { status: 'IN_WAITING_ROOM' },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        staff: { select: { id: true, title: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });

    return updated;
  }

  /**
   * Start the video consultation
   */
  async startConsultation(sessionId: string, tenantId: string): Promise<any> {
    const session = await this.findSessionOrThrow(sessionId, tenantId);

    if (session.status !== 'IN_WAITING_ROOM' && session.status !== 'SCHEDULED') {
      throw new BadRequestException(`Cannot start consultation. Session is ${session.status}`);
    }

    const updated = await prisma.telemedicineSession.update({
      where: { id: sessionId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        staff: { select: { id: true, title: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });

    // Log system message for chat
    await prisma.telemedicineChatMessage.create({
      data: {
        sessionId,
        senderId: session.staffId,
        senderType: 'STAFF',
        message: 'Consultation started',
        isSystem: true,
      },
    });

    return updated;
  }

  /**
   * End the consultation
   */
  async endConsultation(sessionId: string, tenantId: string, notes?: string): Promise<any> {
    const session = await this.findSessionOrThrow(sessionId, tenantId);

    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Cannot end consultation. Session is ${session.status}`);
    }

    const now = new Date();
    const durationMinutes = session.startedAt
      ? Math.round((now.getTime() - session.startedAt.getTime()) / 60000)
      : null;

    const updated = await prisma.telemedicineSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endedAt: now,
        durationMinutes,
        notes: notes || undefined,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        staff: { select: { id: true, title: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });

    // Update appointment status
    await prisma.appointment.update({
      where: { id: session.appointmentId },
      data: { status: 'COMPLETED' },
    });

    // Log system message
    await prisma.telemedicineChatMessage.create({
      data: {
        sessionId,
        senderId: session.staffId,
        senderType: 'STAFF',
        message: 'Consultation ended',
        isSystem: true,
      },
    });

    return updated;
  }

  /**
   * Cancel a telemedicine session
   */
  async cancelSession(sessionId: string, tenantId: string, reason?: string): Promise<any> {
    const session = await this.findSessionOrThrow(sessionId, tenantId);

    if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot cancel session with status ${session.status}`);
    }

    const updated = await prisma.telemedicineSession.update({
      where: { id: sessionId },
      data: {
        status: 'CANCELLED',
        notes: reason ? `Cancelled: ${reason}` : session.notes,
      },
    });

    await prisma.telemedicineChatMessage.create({
      data: {
        sessionId,
        senderId: session.staffId,
        senderType: 'STAFF',
        message: reason ? `Session cancelled: ${reason}` : 'Session cancelled',
        isSystem: true,
      },
    });

    return updated;
  }

  /**
   * Send a chat message during consultation
   */
  async sendChatMessage(sessionId: string, senderId: string, senderType: 'STAFF' | 'PATIENT', message: string, tenantId: string): Promise<any> {
    const session = await this.findSessionOrThrow(sessionId, tenantId);

    if (session.status !== 'IN_WAITING_ROOM' && session.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Cannot send messages in this session state');
    }

    return prisma.telemedicineChatMessage.create({
      data: {
        sessionId,
        senderId,
        senderType,
        message,
        isSystem: false,
      },
    });
  }

  /**
   * Get chat messages for a session
   */
  async getChatMessages(sessionId: string, tenantId: string): Promise<any> {
    const session = await this.findSessionOrThrow(sessionId, tenantId);

    return prisma.telemedicineChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
  }

  /**
   * Record bandwidth/quality stats
   */
  async updateSessionStats(
    sessionId: string,
    tenantId: string,
    stats: { bandwidthScore?: string; qualityScore?: string },
  ): Promise<any> {
    const session = await this.findSessionOrThrow(sessionId, tenantId);

    return prisma.telemedicineSession.update({
      where: { id: sessionId },
      data: {
        bandwidthScore: stats.bandwidthScore || undefined,
        qualityScore: stats.qualityScore || undefined,
      },
    });
  }

  /**
   * Get session by appointment
   */
  async getSessionByAppointment(appointmentId: string, tenantId: string): Promise<any> {
    const session = await prisma.telemedicineSession.findFirst({
      where: { appointmentId, tenantId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        staff: { select: { id: true, title: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });

    if (!session) {
      throw new NotFoundException('Telemedicine session not found for this appointment');
    }

    return session;
  }

  /**
   * Get all sessions for a tenant with filters
   */
  async getSessions(
    tenantId: string,
    params: { status?: string; page?: number; pageSize?: number },
  ): Promise<any> {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;

    const where: any = { tenantId };
    if (params.status) {
      where.status = params.status;
    }

    const [data, total] = await Promise.all([
      prisma.telemedicineSession.findMany({
        where,
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          staff: { select: { id: true, title: true, user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.telemedicineSession.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Toggle recording for a session
   */
  async toggleRecording(sessionId: string, tenantId: string, isRecorded: boolean): Promise<any> {
    const session = await this.findSessionOrThrow(sessionId, tenantId);

    if (isRecorded && !session.recordingConsent) {
      throw new ForbiddenException('Recording consent has not been granted by the patient');
    }

    return prisma.telemedicineSession.update({
      where: { id: sessionId },
      data: { isRecorded },
    });
  }

  /**
   * Get a single session by ID
   */
  async getSession(sessionId: string, tenantId: string): Promise<any> {
    const session = await prisma.telemedicineSession.findFirst({
      where: { id: sessionId, tenantId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        staff: { select: { id: true, title: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });

    if (!session) {
      throw new NotFoundException('Telemedicine session not found');
    }

    return session;
  }

  /**
   * Get telemedicine stats for reporting
   */
  async getTelemedicineStats(tenantId: string, startDate: string, endDate: string): Promise<any> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const sessions = await prisma.telemedicineSession.findMany({
      where: { tenantId, createdAt: { gte: start, lte: end } },
    });

    const total = sessions.length;
    const completed = sessions.filter(s => s.status === 'COMPLETED').length;
    const cancelled = sessions.filter(s => s.status === 'CANCELLED').length;
    const inProgress = sessions.filter(s => s.status === 'IN_PROGRESS').length;
    const averageDuration = sessions
      .filter(s => s.durationMinutes)
      .reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / (completed || 1);

    return {
      period: { startDate, endDate },
      totalSessions: total,
      completed,
      cancelled,
      inProgress,
      cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
      averageDurationMinutes: Math.round(averageDuration),
      recordedSessions: sessions.filter(s => s.isRecorded).length,
    };
  }

  private async findSessionOrThrow(sessionId: string, tenantId: string): Promise<any> {
    const session = await prisma.telemedicineSession.findFirst({
      where: { id: sessionId, tenantId },
    });

    if (!session) {
      throw new NotFoundException('Telemedicine session not found');
    }

    return session;
  }
}