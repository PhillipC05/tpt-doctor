import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { prisma } from '@tpt-doctor/database';

// Inline notification sender for email delivery
class EmailSender {
  private config: { apiKey: string; fromAddress: string; fromName: string; provider: string };

  constructor(config: { apiKey: string; fromAddress: string; fromName: string; provider: string }) {
    this.config = config;
  }

  async send(to: string, subject: string, body: string): Promise<boolean> {
    console.log(`[Email:${this.config.provider}] Sending "${subject}" to ${to}`);
    // In production, would call SendGrid/Mailgun API
    return true;
  }
}

@Injectable()
export class ReportSchedulerService {
  private readonly logger = new Logger(ReportSchedulerService.name);
  private emailSender: EmailSender;

  constructor() {
    this.emailSender = new EmailSender({
      apiKey: process.env.EMAIL_API_KEY || '',
      fromAddress: process.env.EMAIL_FROM_ADDRESS || 'reports@tptdoctor.com',
      fromName: 'TPT Doctor Reports',
      provider: 'sendgrid',
    });
  }

  // ==========================================================================
  // Scheduled Report Delivery
  // ==========================================================================

  @Cron(CronExpression.EVERY_HOUR)
  async checkAndDeliverScheduledReports() {
    this.logger.log('Checking for scheduled reports due for delivery...');

    const scheduledReports = await prisma.savedReport.findMany({
      where: { isScheduled: true, isActive: true },
    });

    const now = new Date();

    for (const report of scheduledReports) {
      const shouldDeliver = this.shouldDeliverNow(report, now);
      if (!shouldDeliver) continue;

      const config = report.reportConfig as any;
      const recipients = report.recipients as string[] || [];

      if (recipients.length === 0) {
        this.logger.warn(`Report ${report.name} has no recipients configured. Skipping.`);
        continue;
      }

      try {
        await this.executeAndDeliverReport(report, config, recipients);
      } catch (error: any) {
        this.logger.error(`Failed to deliver scheduled report ${report.name}: ${error.message}`);
        await prisma.reportExecutionLog.create({
          data: {
            tenantId: report.tenantId,
            reportId: report.id,
            reportName: report.name,
            executionType: 'SCHEDULED',
            status: 'FAILED',
            errorMessage: error.message,
            createdBy: report.createdBy,
          },
        });
      }
    }
  }

  private shouldDeliverNow(report: any, now: Date): boolean {
    if (!report.isScheduled || !report.scheduleFrequency) return false;

    const lastExecuted = report.lastDeliveredAt ? new Date(report.lastDeliveredAt) : null;

    switch (report.scheduleFrequency) {
      case 'DAILY':
        if (!lastExecuted || this.isOlderThanDays(lastExecuted, now, 1)) return true;
        break;
      case 'WEEKLY':
        if (!lastExecuted || this.isOlderThanDays(lastExecuted, now, 7)) return true;
        break;
      case 'MONTHLY':
        if (!lastExecuted || this.isOlderThanDays(lastExecuted, now, 30)) return true;
        break;
      case 'QUARTERLY':
        if (!lastExecuted || this.isOlderThanDays(lastExecuted, now, 90)) return true;
        break;
    }

    return false;
  }

  private isOlderThanDays(date: Date, now: Date, days: number): boolean {
    const diffMs = now.getTime() - date.getTime();
    return diffMs >= days * 24 * 60 * 60 * 1000;
  }

  private async executeAndDeliverReport(report: any, config: any, recipients: string[]) {
    const executionLog = await prisma.reportExecutionLog.create({
      data: {
        tenantId: report.tenantId,
        reportId: report.id,
        reportName: report.name,
        executionType: 'SCHEDULED',
        status: 'RUNNING',
        createdBy: report.createdBy,
      },
    });

    try {
      // Execute the report based on type (simplified - uses BI service endpoints)
      const result = await this.executeReportByType(report.tenantId, config);

      // Format as HTML for email
      const htmlContent = this.formatReportAsHtml(report.name, result, config);

      // Deliver to all recipients via email
      for (const recipient of recipients) {
        await this.emailSender.send(recipient, `Scheduled Report: ${report.name}`, htmlContent);

        this.logger.log(`Delivered report "${report.name}" to ${recipient}`);
      }

      // Update execution log
      await prisma.reportExecutionLog.update({
        where: { id: executionLog.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          resultSummary: result,
          durationMs: Math.floor((Date.now() - executionLog.startedAt.getTime())),
        },
      });

      // Update last delivered timestamp
      await prisma.savedReport.update({
        where: { id: report.id },
        data: { lastRunAt: new Date() },
      });

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

  private async executeReportByType(tenantId: string, config: any): Promise<any> {
    // This would call the actual BI service methods in production
    // For now, we return a mock result showing the report metadata
    return {
      reportType: config.reportType,
      period: { start: config.periodStart, end: config.periodEnd },
      generatedAt: new Date().toISOString(),
      status: 'executed',
      message: `Report of type '${config.reportType}' executed successfully`,
    };
  }

  private formatReportAsHtml(name: string, result: any, config: any): string {
    const dataRows = result.data || [result];
    const headers = dataRows.length > 0 ? Object.keys(dataRows[0]) : [];

    const rowsHtml = dataRows.slice(0, 50).map((row: any) => {
      const cells = headers.map(h => {
        const val = row[h];
        return `<td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-size: 12px;">${val !== undefined && val !== null ? val : ''}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${name}</title></head>
<body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: white; margin: 0; font-size: 22px;">${name}</h1>
    <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 13px;">TPT Doctor - Scheduled Report</p>
  </div>
  <p style="color: #6b7280; font-size: 13px;">Generated: ${new Date().toLocaleString()}</p>
  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 16px 0;">
    <pre style="font-size: 12px; white-space: pre-wrap; margin: 0;">${JSON.stringify(result, null, 2).substring(0, 5000)}</pre>
  </div>
  <div style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 30px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
    <p>TPT Doctor — Confidential Report. This email was automatically generated.</p>
  </div>
</body>
</html>`;
  }

  // ==========================================================================
  // Manual Email Delivery
  // ==========================================================================

  async deliverReportViaEmail(tenantId: string, reportId: string, recipients: string[]): Promise<{ delivered: number; failed: number }> {
    const report = await prisma.savedReport.findFirst({
      where: { id: reportId, tenantId, isActive: true },
    });

    if (!report) throw new Error('Report not found');

    const config = report.reportConfig as any;
    let delivered = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        const html = this.formatReportAsHtml(report.name, await this.executeReportByType(tenantId, config), config);
        await this.emailSender.send(recipient, `Report: ${report.name}`, html);
        delivered++;
      } catch {
        failed++;
      }
    }

    return { delivered, failed };
  }
}