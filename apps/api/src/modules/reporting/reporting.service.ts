import { Injectable } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import * as crypto from 'crypto';

@Injectable()
export class ReportingService {
  // ==========================================================================
  // Dashboard KPIs
  // ==========================================================================

  async getDashboardKPIs(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalPatients,
      todayAppointments,
      upcomingAppointments,
      pendingLabResults,
      activePrescriptions,
      outstandingInvoices,
      totalRevenue,
      unreadMessages,
      activeStaff,
      onlineSessions,
    ] = await Promise.all([
      prisma.patient.count({ where: { tenantId, isActive: true } }),
      prisma.appointment.count({
        where: { tenantId, startTime: { gte: today }, endTime: { lt: tomorrow }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
      }),
      prisma.appointment.count({
        where: { tenantId, startTime: { gte: tomorrow }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
      }),
      prisma.labOrder.count({
        where: { tenantId, status: { in: ['ORDERED', 'SPECIMEN_COLLECTED', 'IN_TRANSIT', 'IN_PROGRESS'] } },
      }),
      prisma.prescription.count({
        where: { tenantId, status: { notIn: ['EXPIRED', 'CANCELLED'] }, expiresAt: { gte: new Date() } },
      }),
      prisma.invoice.count({
        where: { tenantId, status: { notIn: ['COMPLETED', 'REFUNDED'] } },
      }),
      prisma.invoice.aggregate({
        where: { tenantId, status: 'COMPLETED' },
        _sum: { total: true },
      }),
      prisma.message.count({ where: { recipientId: { not: undefined }, isRead: false } }),
      prisma.staffMember.count({ where: { tenantId, isActive: true } }),
      prisma.telemedicineSession.count({
        where: { tenantId, status: { in: ['IN_WAITING_ROOM', 'IN_PROGRESS'] } },
      }),
    ]);

    // Calculate new patients this month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const newPatientsThisMonth = await prisma.patient.count({
      where: { tenantId, createdAt: { gte: monthStart } },
    });

    return {
      totalPatients,
      newPatientsThisMonth,
      todayAppointments,
      upcomingAppointments,
      pendingLabResults,
      activePrescriptions,
      outstandingInvoices,
      totalRevenue: totalRevenue._sum.total || 0,
      unreadMessages,
      activeStaff,
      activeTelemedicineSessions: onlineSessions,
    };
  }

  // ==========================================================================
  // Revenue Report
  // ==========================================================================

  async getRevenueReport(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const invoices = await prisma.invoice.findMany({
      where: { tenantId, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'asc' },
    });

    const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + Number(inv.amountPaid), 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + Number(inv.balanceDue), 0);

    // Monthly breakdown
    const monthlyBreakdown = invoices.reduce((acc: any, inv) => {
      const month = inv.createdAt.toISOString().slice(0, 7);
      if (!acc[month]) acc[month] = { month, billed: 0, collected: 0, outstanding: 0 };
      acc[month].billed += Number(inv.total);
      acc[month].collected += Number(inv.amountPaid);
      acc[month].outstanding += Number(inv.balanceDue);
      return acc;
    }, {});

    return {
      period: { startDate, endDate },
      totalInvoices: invoices.length,
      totalBilled,
      totalCollected,
      totalOutstanding,
      collectionRate: totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
      monthlyBreakdown: Object.values(monthlyBreakdown),
    };
  }

  // ==========================================================================
  // Appointment Analytics
  // ==========================================================================

  async getAppointmentReport(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: { tenantId, startTime: { gte: start }, endTime: { lte: end } },
    });

    const total = appointments.length;
    const completed = appointments.filter(a => a.status === 'COMPLETED').length;
    const cancelled = appointments.filter(a => a.status === 'CANCELLED').length;
    const noShow = appointments.filter(a => a.status === 'NO_SHOW').length;
    const rescheduled = appointments.filter(a => a.status === 'RESCHEDULED').length;

    // Daily breakdown
    const dailyBreakdown = appointments.reduce((acc: any, a) => {
      const day = a.startTime.toISOString().slice(0, 10);
      if (!acc[day]) acc[day] = { date: day, total: 0, completed: 0, cancelled: 0, noShow: 0 };
      acc[day].total++;
      if (a.status === 'COMPLETED') acc[day].completed++;
      if (a.status === 'CANCELLED') acc[day].cancelled++;
      if (a.status === 'NO_SHOW') acc[day].noShow++;
      return acc;
    }, {});

    return {
      period: { startDate, endDate },
      total,
      completed,
      cancelled,
      noShow,
      rescheduled,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      noShowRate: total > 0 ? (noShow / total) * 100 : 0,
      cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
      dailyBreakdown: Object.values(dailyBreakdown),
      breakdown: {
        byStatus: {
          SCHEDULED: appointments.filter(a => a.status === 'SCHEDULED').length,
          CONFIRMED: appointments.filter(a => a.status === 'CONFIRMED').length,
          CHECKED_IN: appointments.filter(a => a.status === 'CHECKED_IN').length,
          IN_PROGRESS: appointments.filter(a => a.status === 'IN_PROGRESS').length,
          COMPLETED: completed,
          CANCELLED: cancelled,
          NO_SHOW: noShow,
          RESCHEDULED: rescheduled,
        },
        byType: appointments.reduce((acc: any, a: any) => {
          acc[a.type] = (acc[a.type] || 0) + 1;
          return acc;
        }, {}),
      },
    };
  }

  // ==========================================================================
  // Patient Demographics
  // ==========================================================================

  async getPatientDemographics(tenantId: string) {
    const patients = await prisma.patient.findMany({
      where: { tenantId, isActive: true },
      select: { gender: true, dateOfBirth: true, bloodType: true, maritalStatus: true, insurance: { select: { insuranceType: true } } },
    });

    const byGender = patients.reduce((acc: any, p: any) => {
      acc[p.gender] = (acc[p.gender] || 0) + 1;
      return acc;
    }, {});

    const now = new Date();
    const byAgeGroup = patients.reduce((acc: any, p: any) => {
      const age = now.getFullYear() - p.dateOfBirth.getFullYear();
      const group = age < 18 ? '0-17' : age < 35 ? '18-34' : age < 50 ? '35-49' : age < 65 ? '50-64' : '65+';
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {});

    const byBloodType = patients.reduce((acc: any, p: any) => {
      if (p.bloodType) acc[p.bloodType] = (acc[p.bloodType] || 0) + 1;
      return acc;
    }, {});

    const byMaritalStatus = patients.reduce((acc: any, p: any) => {
      if (p.maritalStatus) acc[p.maritalStatus] = (acc[p.maritalStatus] || 0) + 1;
      return acc;
    }, {});

    const byInsuranceType = patients.reduce((acc: any, p: any) => {
      if (p.insurance && p.insurance.length > 0) {
        const primary = p.insurance.find((i: any) => i.isPrimary) || p.insurance[0];
        acc[primary.insuranceType] = (acc[primary.insuranceType] || 0) + 1;
      } else {
        acc['UNINSURED'] = (acc['UNINSURED'] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      totalPatients: patients.length,
      byGender,
      byAgeGroup,
      byBloodType,
      byMaritalStatus,
      byInsuranceType,
    };
  }

  // ==========================================================================
  // Lab Report
  // ==========================================================================

  async getLabReport(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const orders = await prisma.labOrder.findMany({
      where: { tenantId, orderedAt: { gte: start, lte: end } },
    });

    const abnormal = orders.filter(o => {
      const result = o.result as any;
      return result && result.isAbnormal;
    });

    return {
      period: { startDate, endDate },
      totalOrders: orders.length,
      completed: orders.filter(o => o.status === 'COMPLETED').length,
      pending: orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length,
      cancelled: orders.filter(o => o.status === 'CANCELLED').length,
      abnormal: abnormal.length,
      abnormalRate: orders.length > 0 ? (abnormal.length / orders.length) * 100 : 0,
      averageTurnaroundDays: this.calculateAvgTurnaround(orders),
      byStatus: orders.reduce((acc: any, o: any) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  // ==========================================================================
  // Clinical Report
  // ==========================================================================

  async getClinicalReport(tenantId: string) {
    const conditions = await prisma.medicalCondition.groupBy({
      by: ['code'],
      where: { patient: { tenantId } },
      _count: { code: true },
      orderBy: { _count: { code: 'desc' } },
      take: 20,
    });

    // Get condition descriptions
    const conditionCodes = conditions.map(c => c.code);
    const conditionDetails = conditionCodes.length > 0
      ? await prisma.icd10Code.findMany({
          where: { code: { in: conditionCodes } },
          select: { code: true, description: true, category: true },
        })
      : [];

    const conditionMap = new Map(conditionDetails.map(c => [c.code, c]));

    const topConditions = conditions.map((c: any) => ({
      code: c.code,
      description: (conditionMap.get(c.code) as any)?.description || 'Unknown',
      category: (conditionMap.get(c.code) as any)?.category || 'Unknown',
      count: c._count.code,
    }));

    const allergies = await prisma.allergy.groupBy({
      by: ['allergen'],
      where: { patient: { tenantId } },
      _count: { allergen: true },
      orderBy: { _count: { allergen: 'desc' } },
      take: 20,
    });

    const topAllergies = allergies.map(a => ({
      allergen: a.allergen,
      count: a._count.allergen,
    }));

    // Immunization coverage
    const totalPatients = await prisma.patient.count({ where: { tenantId, isActive: true } });
    const patientsWithImmunizations = await prisma.immunization.groupBy({
      by: ['patientId'],
      where: { patient: { tenantId } },
    });

    return {
      topConditions,
      topAllergies,
      immunizationCoverage: {
        totalPatients,
        patientsWithRecord: patientsWithImmunizations.length,
        coverageRate: totalPatients > 0 ? (patientsWithImmunizations.length / totalPatients) * 100 : 0,
      },
    };
  }

  // ==========================================================================
  // Staff Performance Report
  // ==========================================================================

  async getStaffPerformanceReport(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const staff = await prisma.staffMember.findMany({
      where: { tenantId, isActive: true },
      include: {
        user: { select: { firstName: true, lastName: true } },
        appointments: {
          where: { startTime: { gte: start }, endTime: { lte: end } },
        },
      },
    });

    return staff.map(s => {
      const appointments = s.appointments;
      const total = appointments.length;
      const completed = appointments.filter(a => a.status === 'COMPLETED').length;
      const cancelled = appointments.filter(a => a.status === 'CANCELLED').length;
      const noShow = appointments.filter(a => a.status === 'NO_SHOW').length;

      return {
        staffId: s.id,
        staffName: `${s.user.firstName} ${s.user.lastName}`,
        title: s.title,
        totalAppointments: total,
        completedAppointments: completed,
        cancelledAppointments: cancelled,
        noShowCount: noShow,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
        noShowRate: total > 0 ? (noShow / total) * 100 : 0,
      };
    });
  }

  // ==========================================================================
  // Ad-hoc Report Builder
  // ==========================================================================

  async buildAdhocReport(
    tenantId: string,
    config: {
      entity: string;
      fields?: string[];
      filters?: Record<string, any>;
      groupBy?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      dateRange?: { start: string; end: string };
    },
  ) {
    const where: any = { tenantId };

    // Apply date range filter
    if (config.dateRange) {
      const start = new Date(config.dateRange.start);
      const end = new Date(config.dateRange.end);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }

    // Apply custom filters
    if (config.filters) {
      for (const [key, value] of Object.entries(config.filters)) {
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'string' && value.includes('%')) {
            where[key] = { contains: value.replace(/%/g, ''), mode: 'insensitive' };
          } else {
            where[key] = value;
          }
        }
      }
    }

    const orderBy = config.sortBy
      ? { [config.sortBy]: (config.sortOrder || 'asc') as 'asc' | 'desc' }
      : { createdAt: 'desc' as const };

    let data: any[] = [];

    switch (config.entity) {
      case 'patients': {
        data = await prisma.patient.findMany({
          where,
          orderBy,
          take: config.limit || 100,
          include: { insurance: true },
        });
        break;
      }
      case 'appointments': {
        data = await prisma.appointment.findMany({
          where,
          orderBy,
          take: config.limit || 100,
          include: {
            patient: { select: { firstName: true, lastName: true } },
            staff: { select: { title: true, user: { select: { firstName: true, lastName: true } } } },
          },
        });
        break;
      }
      case 'encounters': {
        data = await prisma.encounter.findMany({
          where,
          orderBy,
          take: config.limit || 100,
          include: {
            patient: { select: { firstName: true, lastName: true } },
            staff: { select: { title: true, user: { select: { firstName: true, lastName: true } } } },
          },
        });
        break;
      }
      case 'invoices': {
        data = await prisma.invoice.findMany({
          where,
          orderBy,
          take: config.limit || 100,
          include: { patient: { select: { firstName: true, lastName: true } } },
        });
        break;
      }
      case 'prescriptions': {
        data = await prisma.prescription.findMany({
          where,
          orderBy,
          take: config.limit || 100,
          include: { patient: { select: { firstName: true, lastName: true } } },
        });
        break;
      }
      case 'lab_orders': {
        data = await prisma.labOrder.findMany({
          where,
          orderBy,
          take: config.limit || 100,
          include: { patient: { select: { firstName: true, lastName: true } } },
        });
        break;
      }
      default:
        throw new Error(`Unknown entity: ${config.entity}`);
    }

    // Filter to requested fields only
    const fields = config.fields;
    if (fields && fields.length > 0) {
      data = data.map((item: any) => {
        const filtered: Record<string, any> = {};
        for (const field of fields) {
          const value = this.getNestedValue(item, field);
          if (value !== undefined) {
            filtered[field] = value;
          }
        }
        return filtered;
      });
    }

    // Apply grouping
    if (config.groupBy) {
      const grouped = data.reduce((acc: any, item: any) => {
        const key = this.getNestedValue(item, config.groupBy!) ?? 'unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});
      return {
        config,
        totalRecords: data.length,
        grouped,
        groups: Object.keys(grouped).length,
      };
    }

    return {
      config,
      totalRecords: data.length,
      data,
    };
  }

  // ==========================================================================
  // Export Functions
  // ==========================================================================

  async exportReportCSV(tenantId: string, config: any): Promise<string> {
    const result = await this.buildAdhocReport(tenantId, config);
    const rows = result.grouped
      ? Object.entries(result.grouped).flatMap(([group, items]: [string, any]) =>
          (items as any[]).map((item: any) => ({ group, ...item }))
        )
      : result.data;

    if (!rows || rows.length === 0) return 'No data';

    const headers = Object.keys(rows[0] || {});
    const csvLines = [headers.join(',')];

    for (const row of rows || []) {
      const values = headers.map(h => {
        const val = this.getNestedValue(row, h);
        if (val === null || val === undefined) return '';
        const str = String(val);
        // Escape CSV values
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvLines.push(values.join(','));
    }

    return csvLines.join('\n');
  }

  async exportReportJSON(tenantId: string, config: any): Promise<any> {
    return this.buildAdhocReport(tenantId, config);
  }

  async exportReportPDF(tenantId: string, config: any): Promise<{ html: string; filename: string }> {
    const result = await this.buildAdhocReport(tenantId, config);
    const rows = result.grouped
      ? Object.entries(result.grouped).flatMap(([group, items]: [string, any]) =>
          (items as any[]).map((item: any) => ({ group, ...item }))
        )
      : (result.data ?? []);

    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const rowsHtml = rows.map((row: any) => {
      const cells = headers.map(h => {
        const val = this.getNestedValue(row, h);
        return `<td class="px-4 py-2 border border-gray-300 text-sm">${val ?? ''}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${config.entity} Report</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; }
  h1 { color: #1e40af; font-size: 24px; margin-bottom: 5px; }
  .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
  table { border-collapse: collapse; width: 100%; }
  th { background-color: #1e40af; color: white; padding: 8px 12px; text-align: left; font-size: 13px; }
  td { padding: 6px 12px; font-size: 12px; }
  tr:nth-child(even) { background-color: #f9fafb; }
  .footer { margin-top: 20px; font-size: 11px; color: #9ca3af; text-align: center; }
</style>
</head>
<body>
  <h1>${config.entity.replace('_', ' ').toUpperCase()} Report</h1>
  <p class="subtitle">Generated: ${new Date().toISOString()} | Records: ${result.totalRecords}</p>
  <table>
    <thead><tr>${headers.map(h => `<th>${h.replace(/_/g, ' ')}</th>`).join('')}</tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="footer">TPT Doctor — Confidential Report</div>
</body>
</html>`;

    const filename = `report-${config.entity}-${Date.now()}.html`;

    return { html, filename };
  }

  // ==========================================================================
  // Custom Dashboard Widgets
  // ==========================================================================

  async getCustomWidgets(tenantId: string): Promise<any> {
    // Widget definitions that can be exposed to a UI builder
    const widgets = [
      {
        id: 'total-patients',
        name: 'Total Patients',
        category: 'patients',
        type: 'stat',
        icon: 'users',
        color: 'blue',
        query: { entity: 'patients', fields: ['id'], filters: { isActive: 'true' } },
        aggregation: 'count',
      },
      {
        id: 'today-appointments',
        name: "Today's Appointments",
        category: 'appointments',
        type: 'stat',
        icon: 'calendar',
        color: 'green',
        query: { entity: 'appointments' },
        aggregation: 'count',
        timeFilter: 'today',
      },
      {
        id: 'revenue-month',
        name: 'Monthly Revenue',
        category: 'financial',
        type: 'stat',
        icon: 'dollar-sign',
        color: 'yellow',
        query: { entity: 'invoices', fields: ['total'], filters: { status: 'COMPLETED' } },
        aggregation: 'sum',
        timeFilter: 'this-month',
      },
      {
        id: 'pending-lab-results',
        name: 'Pending Lab Results',
        category: 'lab',
        type: 'stat',
        icon: 'flask',
        color: 'purple',
        query: { entity: 'lab_orders', fields: ['id'], filters: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } },
        aggregation: 'count',
      },
      {
        id: 'appointments-by-type',
        name: 'Appointments by Type',
        category: 'appointments',
        type: 'pie-chart',
        icon: 'pie-chart',
        color: 'indigo',
        query: { entity: 'appointments', fields: ['type'] },
        aggregation: 'group',
        groupBy: 'type',
      },
      {
        id: 'revenue-trend',
        name: 'Revenue Trend',
        category: 'financial',
        type: 'line-chart',
        icon: 'trending-up',
        color: 'green',
        query: { entity: 'invoices', fields: ['total', 'createdAt'], filters: { status: 'COMPLETED' } },
        aggregation: 'sum-by-month',
      },
      {
        id: 'patient-demographics',
        name: 'Patient Demographics',
        category: 'patients',
        type: 'bar-chart',
        icon: 'bar-chart',
        color: 'pink',
        query: { entity: 'patients', fields: ['gender', 'ageGroup'] },
        aggregation: 'group',
        groupBy: 'gender',
      },
      {
        id: 'appointment-completion',
        name: 'Appointment Completion Rate',
        category: 'appointments',
        type: 'stat',
        icon: 'check-circle',
        color: 'teal',
        query: { entity: 'appointments', fields: ['status'] },
        aggregation: 'rate',
        rateMetric: 'COMPLETED',
      },
      {
        id: 'active-telemedicine',
        name: 'Active Telemedicine Sessions',
        category: 'telemedicine',
        type: 'stat',
        icon: 'video',
        color: 'red',
        query: { entity: 'telemedicine', fields: ['id'], filters: { status: { in: ['IN_WAITING_ROOM', 'IN_PROGRESS'] } } },
        aggregation: 'count',
      },
      {
        id: 'top-diagnoses',
        name: 'Top Diagnoses',
        category: 'clinical',
        type: 'list',
        icon: 'activity',
        color: 'orange',
        query: { entity: 'medical_conditions', fields: ['code', 'description'], aggregation: 'top', limit: 10 },
      },
      {
        id: 'staff-performance',
        name: 'Staff Performance',
        category: 'staff',
        type: 'bar-chart',
        icon: 'users',
        color: 'cyan',
        query: { entity: 'staff_performance', fields: ['staffName', 'completedAppointments'] },
        aggregation: 'list',
      },
      {
        id: 'no-show-rate',
        name: 'No-Show Rate',
        category: 'appointments',
        type: 'stat',
        icon: 'x-circle',
        color: 'red',
        query: { entity: 'appointments', fields: ['status'] },
        aggregation: 'rate',
        rateMetric: 'NO_SHOW',
      },
    ];

    return widgets;
  }

  async getWidgetData(tenantId: string, widgetId: string): Promise<any> {
    const widgets = await this.getCustomWidgets(tenantId);
    const widget = widgets.find((w: any) => w.id === widgetId);
    if (!widget) {
      throw new Error(`Widget not found: ${widgetId}`);
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Build date range from timeFilter
    let dateRange: { start: string; end: string } | undefined;
    switch (widget.timeFilter) {
      case 'today':
        dateRange = {
          start: today.toISOString(),
          end: new Date(today.getTime() + 86400000).toISOString(),
        };
        break;
      case 'this-month':
        dateRange = {
          start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString(),
        };
        break;
      case 'this-week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        dateRange = {
          start: weekStart.toISOString(),
          end: new Date(today.getTime() + 86400000).toISOString(),
        };
        break;
      case 'this-year':
        dateRange = {
          start: new Date(now.getFullYear(), 0, 1).toISOString(),
          end: new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString(),
        };
        break;
    }

    // Execute the widget
    switch (widget.aggregation) {
      case 'count':
        return this.getWidgetCount(tenantId, widget.query, dateRange);
      case 'sum':
        return this.getWidgetSum(tenantId, widget.query, dateRange);
      case 'group':
        return this.getWidgetGrouped(tenantId, widget.query, widget.groupBy, dateRange);
      case 'rate':
        return this.getWidgetRate(tenantId, widget.query, widget.rateMetric, dateRange);
      default:
        return this.buildAdhocReport(tenantId, { ...widget.query, dateRange });
    }
  }

  private async getWidgetCount(tenantId: string, query: any, dateRange?: { start: string; end: string }): Promise<any> {
    const result = await this.buildAdhocReport(tenantId, { ...query, dateRange, limit: 1 });
    return { value: result.totalRecords };
  }

  private async getWidgetSum(tenantId: string, query: any, dateRange?: { start: string; end: string }): Promise<any> {
    const result = await this.buildAdhocReport(tenantId, { ...query, dateRange, limit: 1000 });
    const data = result.data || [];
    const total = data.reduce((sum: number, row: any) => {
      const field = (query.fields && query.fields[0]) || 'total';
      const val = row[field];
      return sum + (Number(val) || 0);
    }, 0);
    return { value: total };
  }

  private async getWidgetGrouped(tenantId: string, query: any, groupBy: string, dateRange?: { start: string; end: string }): Promise<any> {
    const result = await this.buildAdhocReport(tenantId, { ...query, groupBy, dateRange, limit: 1000 });
    const labels: string[] = [];
    const values: number[] = [];
    if (result.grouped) {
      for (const [key, items] of Object.entries(result.grouped)) {
        labels.push(key);
        values.push((items as any[]).length);
      }
    }
    return { labels, values };
  }

  private async getWidgetRate(tenantId: string, query: any, metric: string, dateRange?: { start: string; end: string }): Promise<any> {
    const result = await this.buildAdhocReport(tenantId, { ...query, dateRange, limit: 10000 });
    const total = result.totalRecords;
    const data = result.data || [];
    const matching = data.filter((row: any) => row.status === metric).length;
    return {
      value: total > 0 ? (matching / total) * 100 : 0,
      total,
      matching,
      rate: metric,
    };
  }

  // ==========================================================================
  // Phase 14.1 — Advanced Analytics Reports
  // ==========================================================================

  async getAppointmentUtilizationReport(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: { tenantId, startTime: { gte: start }, endTime: { lte: end } },
      include: { staff: { select: { id: true, title: true, user: { select: { firstName: true, lastName: true } } } } },
    });

    const totalSlots = appointments.length;
    const filledSlots = appointments.filter(a => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW').length;
    const cancelledSlots = appointments.filter(a => a.status === 'CANCELLED').length;
    const noShowSlots = appointments.filter(a => a.status === 'NO_SHOW').length;

    const fillRate = totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 0;
    const noShowRate = totalSlots > 0 ? (noShowSlots / totalSlots) * 100 : 0;

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

    return {
      period: { start: startDate, end: endDate },
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
        ...data,
        fillRate: data.total > 0 ? Math.round((data.filled / data.total) * 10000) / 100 : 0,
      })),
    };
  }

  async getNoShowPatternsReport(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: { tenantId, startTime: { gte: start }, endTime: { lte: end }, status: 'NO_SHOW' },
    });

    // By day of week
    const byDayOfWeek: Record<number, number> = {};
    // By hour of day
    const byHour: Record<number, number> = {};
    // By month
    const byMonth: Record<string, number> = {};

    for (const a of appointments) {
      const dow = a.startTime.getDay();
      byDayOfWeek[dow] = (byDayOfWeek[dow] || 0) + 1;

      const hour = a.startTime.getHours();
      byHour[hour] = (byHour[hour] || 0) + 1;

      const month = a.startTime.toISOString().slice(0, 7);
      byMonth[month] = (byMonth[month] || 0) + 1;
    }

    return {
      period: { start: startDate, end: endDate },
      totalNoShows: appointments.length,
      byDayOfWeek: Object.entries(byDayOfWeek).map(([day, count]) => ({ day: parseInt(day), count })),
      byHour: Object.entries(byHour).map(([hour, count]) => ({ hour: parseInt(hour), count })),
      byMonth: Object.entries(byMonth).map(([month, count]) => ({ month, count })),
    };
  }

  async getChronicPrevalenceReport(tenantId: string) {
    const conditions = await prisma.medicalCondition.groupBy({
      by: ['code'],
      where: { patient: { tenantId }, isChronic: true },
      _count: { code: true },
      orderBy: { _count: { code: 'desc' } },
      take: 20,
    });

    const conditionCodes = conditions.map(c => c.code);
    const conditionDetails = conditionCodes.length > 0
      ? await prisma.icd10Code.findMany({
          where: { code: { in: conditionCodes } },
          select: { code: true, description: true, category: true },
        })
      : [];

    const conditionMap = new Map(conditionDetails.map((c: any) => [c.code, c]));

    const totalPatients = await prisma.patient.count({ where: { tenantId, isActive: true } });

    return {
      totalPatients,
      totalChronicConditions: conditions.reduce((sum, c) => sum + c._count.code, 0),
      conditions: conditions.map((c: any) => ({
        code: c.code,
        description: (conditionMap.get(c.code) as any)?.description || 'Unknown',
        category: (conditionMap.get(c.code) as any)?.category || 'Unknown',
        patientCount: c._count.code,
        prevalenceRate: totalPatients > 0 ? Math.round((c._count.code / totalPatients) * 10000) / 100 : 0,
      })),
    };
  }

  async getReferralConversionReport(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const referrals = await prisma.referral.findMany({
      where: { tenantId, createdAt: { gte: start, lte: end } },
    });

    const total = referrals.length;
    const sent = referrals.filter(r => r.status !== 'DRAFT').length;
    const completed = referrals.filter(r => r.status === 'COMPLETED').length;
    const conversionRate = sent > 0 ? (completed / sent) * 100 : 0;

    return {
      period: { start: startDate, end: endDate },
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
    };
  }

  async getReferralWaitTimesReport(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const referrals = await prisma.referral.findMany({
      where: { tenantId, createdAt: { gte: start, lte: end }, bookedAt: { not: null } },
    });

    const waitTimes = referrals
      .filter(r => r.createdAt && r.bookedAt)
      .map(r => Math.floor((r.bookedAt!.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      period: { start: startDate, end: endDate },
      totalBooked: referrals.length,
      averageWaitDays: waitTimes.length > 0 ? Math.round(waitTimes.reduce((s, w) => s + w, 0) / waitTimes.length) : 0,
      minWaitDays: waitTimes.length > 0 ? Math.min(...waitTimes) : 0,
      maxWaitDays: waitTimes.length > 0 ? Math.max(...waitTimes) : 0,
    };
  }

  async getTopReferrersReport(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const referrals = await prisma.referral.findMany({
      where: { tenantId, createdAt: { gte: start, lte: end } },
      include: {
        referringStaff: { select: { id: true, title: true, user: { select: { firstName: true, lastName: true } } } },
      },
    });

    const byReferrer: Record<string, { count: number; completed: number }> = {};
    for (const r of referrals) {
      const name = r.referringStaff?.user
        ? `${r.referringStaff.user.firstName} ${r.referringStaff.user.lastName}`
        : 'Unknown';
      if (!byReferrer[name]) byReferrer[name] = { count: 0, completed: 0 };
      byReferrer[name].count++;
      if (r.status === 'COMPLETED') byReferrer[name].completed++;
    }

    return {
      period: { start: startDate, end: endDate },
      referrers: Object.entries(byReferrer)
        .map(([name, data]) => ({
          name,
          ...data,
          conversionRate: data.count > 0 ? Math.round((data.completed / data.count) * 10000) / 100 : 0,
        }))
        .sort((a, b) => b.count - a.count),
    };
  }

  async getPayerMixReport(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const invoices = await prisma.invoice.findMany({
      where: { tenantId, createdAt: { gte: start, lte: end } },
      include: { patient: { select: { insurance: { where: { isPrimary: true } } } } },
    });

    const payerMix: Record<string, { billed: number; collected: number; count: number }> = {};
    for (const inv of invoices) {
      const payer = ((inv.patient as any)?.insurance?.[0]?.insuranceType) || 'UNKNOWN';
      if (!payerMix[payer]) payerMix[payer] = { billed: 0, collected: 0, count: 0 };
      payerMix[payer].billed += Number(inv.total);
      payerMix[payer].collected += Number(inv.amountPaid);
      payerMix[payer].count++;
    }

    const totalBilled = Object.values(payerMix).reduce((s, p) => s + p.billed, 0);

    return {
      period: { start: startDate, end: endDate },
      totalBilled,
      payerMix: Object.entries(payerMix).map(([payer, data]) => ({
        payer,
        ...data,
        percentage: totalBilled > 0 ? Math.round((data.billed / totalBilled) * 10000) / 100 : 0,
      })),
    };
  }

  async getProcedureProfitabilityReport(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const invoices = await prisma.invoice.findMany({
      where: { tenantId, createdAt: { gte: start, lte: end } },
    });

    const procedureRevenue: Record<string, { revenue: number; count: number }> = {};
    for (const inv of invoices) {
      const items = (inv as any).items as any[] || [];
      for (const item of items) {
        const code = item.cptCode || item.description || 'OTHER';
        if (!procedureRevenue[code]) procedureRevenue[code] = { revenue: 0, count: 0 };
        procedureRevenue[code].revenue += Number(item.total || item.amount || 0);
        procedureRevenue[code].count++;
      }
    }

    return {
      period: { start: startDate, end: endDate },
      procedures: Object.entries(procedureRevenue)
        .map(([code, data]) => ({
          code,
          ...data,
          averageRevenue: data.count > 0 ? Math.round((data.revenue / data.count) * 100) / 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue),
    };
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return current[key];
      }
      return undefined;
    }, obj);
  }

  private calculateAvgTurnaround(orders: any[]): number {
    const completed = orders.filter(o => o.status === 'COMPLETED' && o.orderedAt && o.resultAt);
    if (completed.length === 0) return 0;
    const totalDays = completed.reduce((sum: number, o: any) => {
      const diff = o.resultAt.getTime() - o.orderedAt.getTime();
      return sum + diff / (1000 * 60 * 60 * 24);
    }, 0);
    return Math.round((totalDays / completed.length) * 10) / 10;
  }
}