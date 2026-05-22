import { Injectable } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';

@Injectable()
export class BusinessIntelligenceService {
  // ==========================================================================
  // Revenue Analytics
  // ==========================================================================

  async getRevenueAnalytics(tenantId: string, periodStart: string, periodEnd: string) {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    end.setHours(23, 59, 59, 999);

    const invoices = await prisma.invoice.findMany({
      where: { tenantId, createdAt: { gte: start, lte: end } },
      include: { payments: true, patient: { select: { insurance: { where: { isPrimary: true } } } } },
    });

    const totalBilled = invoices.reduce((s, i) => s + Number(i.total), 0);
    const totalCollected = invoices.reduce((s, i) => s + Number(i.amountPaid), 0);
    const totalOutstanding = invoices.reduce((s, i) => s + Number(i.balanceDue), 0);

    // Payer mix
    const payerMix: Record<string, { billed: number; collected: number; count: number }> = {};
    for (const inv of invoices) {
      const payer = inv.patient.insurance[0]?.insuranceType || 'UNKNOWN';
      if (!payerMix[payer]) payerMix[payer] = { billed: 0, collected: 0, count: 0 };
      payerMix[payer].billed += Number(inv.total);
      payerMix[payer].collected += Number(inv.amountPaid);
      payerMix[payer].count++;
    }

    // Procedure revenue from invoice items
    const procedureRevenue: Record<string, { revenue: number; count: number }> = {};
    for (const inv of invoices) {
      const items = inv.items as any[];
      for (const item of items) {
        const code = item.cptCode || item.description || 'OTHER';
        if (!procedureRevenue[code]) procedureRevenue[code] = { revenue: 0, count: 0 };
        procedureRevenue[code].revenue += Number(item.total || item.amount || 0);
        procedureRevenue[code].count++;
      }
    }

    // A/R aging from unpaid invoices
    const unpaidInvoices = invoices.filter(i => Number(i.balanceDue) > 0);
    const now = new Date();
    const totalAR = unpaidInvoices.reduce((s, i) => s + Number(i.balanceDue), 0);
    const claimAges = unpaidInvoices.map(i => Math.floor((now.getTime() - i.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    const avgClaimAge = claimAges.length > 0 ? Math.round(claimAges.reduce((s, a) => s + a, 0) / claimAges.length) : 0;

    const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;
    const arDaysOutstanding = (totalAR / Math.max(totalCollected, 1)) * 365;

    return {
      period: { start: periodStart, end: periodEnd },
      totalBilled,
      totalCollected,
      totalOutstanding,
      netRevenue: totalCollected - totalOutstanding,
      collectionRate: Math.round(collectionRate * 100) / 100,
      payerMix: Object.entries(payerMix).map(([payer, data]) => ({ payer, ...data })),
      procedureRevenue: Object.entries(procedureRevenue).map(([code, data]) => ({ code, ...data })),
      totalAR,
      arDaysOutstanding: Math.round(arDaysOutstanding * 100) / 100,
      averageClaimAge: avgClaimAge,
    };
  }

  // ==========================================================================
  // Appointment Utilization Analytics
  // ==========================================================================

  async getAppointmentUtilization(tenantId: string, periodStart: string, periodEnd: string) {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    end.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: { tenantId, startTime: { gte: start }, endTime: { lte: end } },
      include: { staff: { select: { id: true, title: true, user: { select: { firstName: true, lastName: true } } } } },
    });

    // Calculate fill rates from staff schedules
    const totalSlots = appointments.length;
    const filledSlots = appointments.filter(a => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW').length;
    const cancelledSlots = appointments.filter(a => a.status === 'CANCELLED').length;
    const noShowSlots = appointments.filter(a => a.status === 'NO_SHOW').length;

    // Peak times by hour
    const peakTimes: Record<string, number> = {};
    for (const a of appointments) {
      const hour = a.startTime.getHours();
      const dow = a.startTime.getDay();
      const key = `${dow}-${hour}`;
      peakTimes[key] = (peakTimes[key] || 0) + 1;
    }

    // By day of week
    const byDayOfWeek: Record<number, { total: number; filled: number; cancelled: number; noShow: number }> = {};
    for (const a of appointments) {
      const dow = a.startTime.getDay();
      if (!byDayOfWeek[dow]) byDayOfWeek[dow] = { total: 0, filled: 0, cancelled: 0, noShow: 0 };
      byDayOfWeek[dow].total++;
      if (a.status !== 'CANCELLED' && a.status !== 'NO_SHOW') byDayOfWeek[dow].filled++;
      if (a.status === 'CANCELLED') byDayOfWeek[dow].cancelled++;
      if (a.status === 'NO_SHOW') byDayOfWeek[dow].noShow++;
    }

    // By staff
    const byStaff: Record<string, { total: number; filled: number }> = {};
    for (const a of appointments) {
      const staffId = a.staffId;
      if (!byStaff[staffId]) {
        byStaff[staffId] = { total: 0, filled: 0 };
      }
      byStaff[staffId].total++;
      if (a.status !== 'CANCELLED' && a.status !== 'NO_SHOW') byStaff[staffId].filled++;
    }

    // No-show rate
    const noShowRate = totalSlots > 0 ? (noShowSlots / totalSlots) * 100 : 0;
    const fillRate = totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 0;

    return {
      period: { start: periodStart, end: periodEnd },
      totalSlots,
      filledSlots,
      fillRate: Math.round(fillRate * 100) / 100,
      cancelledSlots,
      noShowSlots,
      noShowRate: Math.round(noShowRate * 100) / 100,
      peakTimes: Object.entries(peakTimes)
        .map(([key, count]) => {
          const [dow, hour] = key.split('-').map(Number);
          return { dayOfWeek: dow, hour, count };
        })
        .sort((a, b) => b.count - a.count),
      byDayOfWeek: Object.entries(byDayOfWeek).map(([day, data]) => ({ day: parseInt(day), ...data })),
      byStaff: Object.entries(byStaff).map(([staffId, data]) => ({
        staffId,
        staffName: appointments.find(a => a.staffId === staffId)?.staff?.user
          ? `${appointments.find(a => a.staffId === staffId)!.staff.user.firstName} ${appointments.find(a => a.staffId === staffId)!.staff.user.lastName}`
          : 'Unknown',
        title: appointments.find(a => a.staffId === staffId)?.staff?.title,
        ...data,
        fillRate: data.total > 0 ? Math.round((data.filled / data.total) * 10000) / 100 : 0,
      })),
    };
  }

  // ==========================================================================
  // Clinician Productivity
  // ==========================================================================

  async getClinicianProductivity(tenantId: string, periodStart: string, periodEnd: string) {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    end.setHours(23, 59, 59, 999);

    const workingDays = this.getWorkingDays(start, end);

    const staff = await prisma.staffMember.findMany({
      where: { tenantId, isActive: true },
      include: {
        user: { select: { firstName: true, lastName: true } },
        encounters: {
          where: { date: { gte: start, lte: end } },
        },
        appointments: {
          where: { startTime: { gte: start }, endTime: { lte: end } },
        },
      },
    });

    return staff.map(s => {
      const encounters = s.encounters;
      const appointments = s.appointments;

      const totalEncounters = encounters.length;
      const newPatients = encounters.filter(e => e.encounterType === 'OFFICE_VISIT').length; // Proxy metric
      const telemedicineEncounters = encounters.filter(e => e.encounterType === 'TELEMEDICINE').length;

      // Calculate estimated RVUs from encounter types
      const rvuMap: Record<string, number> = { OFFICE_VISIT: 1.5, TELEMEDICINE: 1.0, FOLLOW_UP: 1.0, CONSULTATION: 2.0, EMERGENCY: 3.0, ROUTINE_CHECKUP: 0.75, HOME_VISIT: 1.5 };
      const totalRVUs = encounters.reduce((sum, e) => sum + (rvuMap[e.encounterType] || 1.0), 0);

      // Appointment metrics
      const completedApps = appointments.filter(a => a.status === 'COMPLETED').length;
      const noShowApps = appointments.filter(a => a.status === 'NO_SHOW').length;
      const noShowRate = appointments.length > 0 ? (noShowApps / appointments.length) * 100 : 0;
      const onTimeRate = appointments.length > 0 ? (completedApps / appointments.length) * 100 : 0;

      return {
        staffId: s.id,
        staffName: `${s.user.firstName} ${s.user.lastName}`,
        title: s.title,
        totalEncounters,
        encountersPerDay: workingDays > 0 ? Math.round((totalEncounters / workingDays) * 100) / 100 : 0,
        newPatients,
        followUpPatients: totalEncounters - newPatients,
        telemedicineEncounters,
        totalRVUs: Math.round(totalRVUs * 100) / 100,
        rvusPerEncounter: totalEncounters > 0 ? Math.round((totalRVUs / totalEncounters) * 100) / 100 : 0,
        rvusPerDay: workingDays > 0 ? Math.round((totalRVUs / workingDays) * 100) / 100 : 0,
        totalAppointments: appointments.length,
        completedAppointments: completedApps,
        noShowRate: Math.round(noShowRate * 100) / 100,
        onTimeRate: Math.round(onTimeRate * 100) / 100,
      };
    });
  }

  // ==========================================================================
  // Patient Demographics & Population Health
  // ==========================================================================

  async getPatientDemographics(tenantId: string) {
    const patients = await prisma.patient.findMany({
      where: { tenantId, isActive: true },
      include: {
        medicalConditions: { select: { code: true, description: true, isChronic: true } },
        insurance: { where: { isPrimary: true }, select: { insuranceType: true } },
      },
    });

    const byGender: Record<string, number> = {};
    const byAgeGroup: Record<string, number> = {};
    const byInsuranceType: Record<string, number> = {};

    const now = new Date();
    const chronicConditions: Record<string, number> = {};

    for (const p of patients) {
      // Gender
      byGender[p.gender] = (byGender[p.gender] || 0) + 1;

      // Age group
      const age = now.getFullYear() - p.dateOfBirth.getFullYear();
      const group = age < 5 ? '0-4' : age < 12 ? '5-11' : age < 18 ? '12-17' : age < 35 ? '18-34' : age < 50 ? '35-49' : age < 65 ? '50-64' : age < 80 ? '65-79' : '80+';
      byAgeGroup[group] = (byAgeGroup[group] || 0) + 1;

      // Insurance
      const insType = p.insurance[0]?.insuranceType || 'UNINSURED';
      byInsuranceType[insType] = (byInsuranceType[insType] || 0) + 1;

      // Chronic conditions
      for (const cond of p.medicalConditions) {
        if (cond.isChronic) {
          chronicConditions[cond.code] = (chronicConditions[cond.code] || 0) + 1;
        }
      }
    }

    return {
      totalPatients: patients.length,
      byGender,
      byAgeGroup,
      byInsuranceType,
      topChronicConditions: Object.entries(chronicConditions)
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
    };
  }

  // ==========================================================================
  // Referral Analytics
  // ==========================================================================

  async getReferralAnalytics(tenantId: string, periodStart: string, periodEnd: string) {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    end.setHours(23, 59, 59, 999);

    const referrals = await prisma.referral.findMany({
      where: { tenantId, createdAt: { gte: start, lte: end } },
      include: {
        referringStaff: { select: { id: true, title: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });

    const total = referrals.length;
    const sent = referrals.filter(r => r.status !== 'DRAFT').length;
    const completed = referrals.filter(r => r.status === 'COMPLETED').length;
    const conversionRate = sent > 0 ? (completed / sent) * 100 : 0;

    // By specialty
    const bySpecialty: Record<string, number> = {};
    for (const r of referrals) {
      const spec = r.specialty || 'UNSPECIFIED';
      bySpecialty[spec] = (bySpecialty[spec] || 0) + 1;
    }

    // By referrer
    const byReferrer: Record<string, number> = {};
    for (const r of referrals) {
      const name = r.referringStaff?.user
        ? `${r.referringStaff.user.firstName} ${r.referringStaff.user.lastName}`
        : 'Unknown';
      byReferrer[name] = (byReferrer[name] || 0) + 1;
    }

    // Wait times
    const waitTimes = referrals
      .filter(r => r.createdAt && r.bookedAt)
      .map(r => Math.floor((r.bookedAt!.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    const avgWaitDays = waitTimes.length > 0 ? Math.round(waitTimes.reduce((s, w) => s + w, 0) / waitTimes.length) : 0;

    return {
      period: { start: periodStart, end: periodEnd },
      total,
      sent,
      completed,
      conversionRate: Math.round(conversionRate * 100) / 100,
      byStatus: {
        DRAFT: referrals.filter(r => r.status === 'DRAFT').length,
        SENT: referrals.filter(r => r.status === 'SENT').length,
        ACKNOWLEDGED: referrals.filter(r => r.status === 'ACKNOWLEDGED').length,
        BOOKED: referrals.filter(r => r.status === 'BOOKED').length,
        COMPLETED: completed,
        CLOSED: referrals.filter(r => r.status === 'CLOSED').length,
        CANCELLED: referrals.filter(r => r.status === 'CANCELLED').length,
      },
      bySpecialty: Object.entries(bySpecialty).map(([specialty, count]) => ({ specialty, count })),
      byReferrer: Object.entries(byReferrer).map(([referrer, count]) => ({ referrer, count })),
      averageWaitDays: avgWaitDays,
    };
  }

  // ==========================================================================
  // Saved Reports (Custom Report Builder)
  // ==========================================================================

  async createSavedReport(tenantId: string, data: any) {
    return prisma.savedReport.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        category: data.category,
        reportConfig: data.reportConfig,
        format: data.format || 'TABLE',
        isScheduled: data.isScheduled || false,
        scheduleFrequency: data.scheduleFrequency,
        scheduleConfig: data.scheduleConfig,
        deliveryMethod: data.deliveryMethod,
        recipients: data.recipients || [],
        createdBy: data.createdBy,
      },
    });
  }

  async getSavedReports(tenantId: string, category?: string) {
    const where: any = { tenantId, isActive: true };
    if (category) where.category = category;
    return prisma.savedReport.findMany({ where, orderBy: { updatedAt: 'desc' } });
  }

  async updateSavedReport(id: string, tenantId: string, data: any) {
    return prisma.savedReport.update({
      where: { id },
      data,
    });
  }

  async deleteSavedReport(id: string, tenantId: string) {
    return prisma.savedReport.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async executeSavedReport(id: string, tenantId: string) {
    const report = await prisma.savedReport.findFirst({ where: { id, tenantId, isActive: true } });
    if (!report) throw new Error('Report not found');

    const executionLog = await prisma.reportExecutionLog.create({
      data: {
        tenantId,
        reportId: id,
        reportName: report.name,
        executionType: 'MANUAL',
        status: 'RUNNING',
        createdBy: report.createdBy,
      },
    });

    try {
      // Execute based on report config
      const config = report.reportConfig as any;
      let result: any;

      switch (config.reportType) {
        case 'revenue':
          result = await this.getRevenueAnalytics(tenantId, config.periodStart, config.periodEnd);
          break;
        case 'appointments':
          result = await this.getAppointmentUtilization(tenantId, config.periodStart, config.periodEnd);
          break;
        case 'productivity':
          result = await this.getClinicianProductivity(tenantId, config.periodStart, config.periodEnd);
          break;
        case 'demographics':
          result = await this.getPatientDemographics(tenantId);
          break;
        case 'referrals':
          result = await this.getReferralAnalytics(tenantId, config.periodStart, config.periodEnd);
          break;
        default:
          result = { message: 'Unknown report type' };
      }

      await prisma.reportExecutionLog.update({
        where: { id: executionLog.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          resultSummary: result,
          durationMs: Math.floor((Date.now() - executionLog.startedAt.getTime())),
        },
      });

      return { executionId: executionLog.id, result };
    } catch (error: any) {
      await prisma.reportExecutionLog.update({
        where: { id: executionLog.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error.message,
          durationMs: Math.floor((Date.now() - executionLog.startedAt.getTime())),
        },
      });
      throw error;
    }
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private getWorkingDays(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }
}