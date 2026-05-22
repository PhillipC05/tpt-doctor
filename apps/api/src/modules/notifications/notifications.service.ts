// ============================================================================
// TPT Doctor — Notifications Service
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

// ============================================================================
// Types
// ============================================================================

export interface NotificationTemplate {
  id: string;
  tenantId: string;
  type: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  channels: Array<{ type: 'sms' | 'email' | 'in_app'; enabled: boolean; config: Record<string, unknown> }>;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationPreference {
  userId: string;
  tenantId: string;
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
    in_app: boolean;
  };
  types: Record<string, boolean>;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: 'sms' | 'email' | 'in_app';
  recipient: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  errorMessage: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface SmsConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  messagingServiceSid?: string;
}

export interface EmailConfig {
  apiKey: string;
  fromAddress: string;
  fromName: string;
  provider: 'sendgrid' | 'mailgun';
}

// ============================================================================
// Notifications Service
// ============================================================================

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private templates: Map<string, NotificationTemplate> = new Map();
  private preferences: Map<string, CommunicationPreference> = new Map();
  private deliveries: NotificationDelivery[] = [];
  private smsConfig: SmsConfig | null = null;
  private emailConfig: EmailConfig | null = null;

  constructor() {
    this.seedDefaultTemplates();
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  configureSms(config: SmsConfig): void {
    this.smsConfig = config;
    this.logger.log('SMS notification channel configured');
  }

  configureEmail(config: EmailConfig): void {
    this.emailConfig = config;
    this.logger.log(`Email notification channel configured (${config.provider})`);
  }

  // ==========================================================================
  // Templates
  // ==========================================================================

  createTemplate(template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): NotificationTemplate {
    const id = `tmpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const newTemplate: NotificationTemplate = { ...template, id, createdAt: now, updatedAt: now };
    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  getTemplate(id: string): NotificationTemplate | null {
    return this.templates.get(id) || null;
  }

  updateTemplate(id: string, update: Partial<NotificationTemplate>): NotificationTemplate | null {
    const existing = this.templates.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...update, id, updatedAt: new Date().toISOString() };
    this.templates.set(id, updated);
    return updated;
  }

  deleteTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  listTemplates(tenantId: string, type?: string): NotificationTemplate[] {
    let results = Array.from(this.templates.values()).filter((t) => t.tenantId === tenantId);
    if (type) results = results.filter((t) => t.type === type);
    return results;
  }

  renderTemplate(templateId: string, variables: Record<string, string>): { subject: string; body: string } | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    let subject = template.subject;
    let body = template.body;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }

    return { subject, body };
  }

  // ==========================================================================
  // Preferences
  // ==========================================================================

  getPreference(userId: string): CommunicationPreference | null {
    return this.preferences.get(userId) || null;
  }

  setPreference(pref: CommunicationPreference): CommunicationPreference {
    this.preferences.set(pref.userId, pref);
    return pref;
  }

  updatePreference(userId: string, update: Partial<CommunicationPreference>): CommunicationPreference | null {
    const existing = this.preferences.get(userId);
    if (!existing) return null;
    const updated = { ...existing, ...update, userId };
    this.preferences.set(userId, updated);
    return updated;
  }

  // ==========================================================================
  // Sending Notifications
  // ==========================================================================

  async send(options: {
    userId: string;
    tenantId: string;
    type: string;
    templateId?: string;
    variables?: Record<string, string>;
    channels?: ('sms' | 'email' | 'in_app')[];
    customSubject?: string;
    customBody?: string;
    recipientEmail?: string;
    recipientPhone?: string;
  }): Promise<NotificationDelivery[]> {
    const deliveries: NotificationDelivery[] = [];
    const pref = this.preferences.get(options.userId);

    // Render template
    let subject = options.customSubject || '';
    let body = options.customBody || '';
    if (options.templateId) {
      const rendered = this.renderTemplate(options.templateId, options.variables || {});
      if (rendered) {
        subject = rendered.subject;
        body = rendered.body;
      }
    }

    const channels = options.channels || ['in_app'];

    for (const channel of channels) {
      // Check user preferences
      if (pref && !pref.channels[channel]) continue;
      if (pref && pref.types[options.type] === false) continue;

      // Check quiet hours (pref, quietHoursStart, and quietHoursEnd are all confirmed truthy here)
      if (pref) {
        const qhStart = pref.quietHoursStart;
        const qhEnd = pref.quietHoursEnd;
        if (qhStart && qhEnd) {
          const now = new Date();
          const hours = now.getHours();
          const start = Number(qhStart.split(':')[0]) || 0;
          const end = Number(qhEnd.split(':')[0]) || 0;
          if (hours >= start && hours < end) continue;
        }
      }

      let delivery: NotificationDelivery;

      switch (channel) {
        case 'sms':
          delivery = await this.sendSms(options.recipientPhone ?? options.userId, body);
          break;
        case 'email':
          delivery = await this.sendEmail(options.recipientEmail ?? options.userId, subject, body);
          break;
        case 'in_app':
          delivery = this.sendInApp(options.userId, options.type, subject, body);
          break;
        default:
          continue;
      }

      deliveries.push(delivery);
    }

    return deliveries;
  }

  private async sendSms(to: string, body: string): Promise<NotificationDelivery> {
    const delivery = this.createDelivery('sms', to);

    try {
      if (this.smsConfig) {
        // In production, this would call Twilio API via @tpt-doctor/notifications
        this.logger.log(`[SMS] Sending to ${to} via Twilio (${this.smsConfig.fromNumber})`);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else {
        this.logger.warn(`[SMS] No SMS config configured. Stubbing send to ${to}`);
      }

      delivery.status = 'sent';
      delivery.sentAt = new Date().toISOString();
    } catch (error) {
      delivery.status = 'failed';
      delivery.errorMessage = error instanceof Error ? error.message : 'Unknown SMS error';
    }

    this.deliveries.push(delivery);
    return delivery;
  }

  private async sendEmail(to: string, subject: string, body: string): Promise<NotificationDelivery> {
    const delivery = this.createDelivery('email', to);

    try {
      if (this.emailConfig) {
        this.logger.log(`[Email:${this.emailConfig.provider}] Sending "${subject}" to ${to} from ${this.emailConfig.fromAddress}`);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else {
        this.logger.warn(`[Email] No Email config configured. Stubbing send to ${to}`);
      }

      delivery.status = 'sent';
      delivery.sentAt = new Date().toISOString();
    } catch (error) {
      delivery.status = 'failed';
      delivery.errorMessage = error instanceof Error ? error.message : 'Unknown email error';
    }

    this.deliveries.push(delivery);
    return delivery;
  }

  private sendInApp(userId: string, type: string, title: string, message: string): NotificationDelivery {
    const delivery = this.createDelivery('in_app', userId);
    delivery.status = 'sent';
    delivery.sentAt = new Date().toISOString();

    this.logger.log(`[In-App] Notification for ${userId}: ${title}`);
    this.deliveries.push(delivery);
    return delivery;
  }

  private createDelivery(channel: 'sms' | 'email' | 'in_app', recipient: string): NotificationDelivery {
    return {
      id: `del-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      notificationId: '',
      channel,
      recipient,
      status: 'pending',
      errorMessage: null,
      sentAt: null,
      deliveredAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // Delivery History
  // ==========================================================================

  getDeliveryHistory(userId: string, limit = 50): NotificationDelivery[] {
    return this.deliveries
      .filter((d) => d.recipient === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  // ==========================================================================
  // Scheduled Reminder Tasks
  // ==========================================================================

  @Cron(CronExpression.EVERY_HOUR)
  async processAppointmentReminders(): Promise<void> {
    this.logger.log('Processing appointment reminders...');
    // In production, this would query upcoming appointments and send reminders
    // For now, we log that reminders would be processed
  }

  @Cron('0 8 * * *') // Every day at 8 AM
  async processDailyDigest(): Promise<void> {
    this.logger.log('Processing daily digest notifications...');
  }

  // ==========================================================================
  // Default Templates
  // ==========================================================================

  private seedDefaultTemplates(): void {
    const templates: Array<Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>> = [
      {
        tenantId: 'default',
        type: 'APPOINTMENT_REMINDER',
        name: 'Appointment Reminder (24h)',
        subject: 'Reminder: Your appointment tomorrow at {{time}}',
        body: 'Dear {{patientName}},\n\nThis is a reminder that you have an appointment with {{providerName}} on {{date}} at {{time}}.\n\nLocation: {{location}}\nType: {{type}}\n\nPlease arrive 15 minutes early.\n\nThank you,\n{{practiceName}}',
        variables: ['patientName', 'providerName', 'date', 'time', 'location', 'type', 'practiceName'],
        channels: [
          { type: 'sms', enabled: true, config: {} },
          { type: 'email', enabled: true, config: {} },
          { type: 'in_app', enabled: true, config: {} },
        ],
      },
      {
        tenantId: 'default',
        type: 'LAB_RESULT',
        name: 'Lab Result Ready',
        subject: 'Your lab results are ready',
        body: 'Dear {{patientName}},\n\nYour lab results for {{testName}} are now available. Please log in to the patient portal to view them.\n\nIf you have any questions, please contact our office.\n\nThank you,\n{{practiceName}}',
        variables: ['patientName', 'testName', 'practiceName'],
        channels: [
          { type: 'email', enabled: true, config: {} },
          { type: 'in_app', enabled: true, config: {} },
        ],
      },
      {
        tenantId: 'default',
        type: 'PRESCRIPTION_REFILL',
        name: 'Prescription Refill Available',
        subject: 'Prescription refill ready for {{medication}}',
        body: 'Dear {{patientName}},\n\nYour prescription for {{medication}} ({{dosage}}) is ready for refill.\n\nPlease contact your pharmacy to arrange pickup.\n\nThank you,\n{{practiceName}}',
        variables: ['patientName', 'medication', 'dosage', 'practiceName'],
        channels: [
          { type: 'sms', enabled: true, config: {} },
          { type: 'email', enabled: true, config: {} },
          { type: 'in_app', enabled: true, config: {} },
        ],
      },
      {
        tenantId: 'default',
        type: 'BILLING',
        name: 'Billing Notification',
        subject: 'New invoice available',
        body: 'Dear {{patientName}},\n\nA new invoice (#{{invoiceNumber}}) has been generated for ${{amount}}.\n\nDue date: {{dueDate}}\n\nPlease make payment at your earliest convenience.\n\nThank you,\n{{practiceName}}',
        variables: ['patientName', 'invoiceNumber', 'amount', 'dueDate', 'practiceName'],
        channels: [
          { type: 'email', enabled: true, config: {} },
          { type: 'in_app', enabled: true, config: {} },
        ],
      },
      {
        tenantId: 'default',
        type: 'WELCOME',
        name: 'Welcome Message',
        subject: 'Welcome to {{practiceName}}',
        body: 'Dear {{patientName}},\n\nWelcome to {{practiceName}}! We are pleased to have you as a patient.\n\nYour next appointment is scheduled for {{date}} at {{time}}.\n\nPlease complete your intake forms before your visit.\n\nThank you,\n{{practiceName}}',
        variables: ['patientName', 'practiceName', 'date', 'time'],
        channels: [
          { type: 'email', enabled: true, config: {} },
          { type: 'in_app', enabled: true, config: {} },
        ],
      },
      {
        tenantId: 'default',
        type: 'FOLLOW_UP',
        name: 'Follow-up Reminder',
        subject: 'Follow-up appointment needed',
        body: 'Dear {{patientName}},\n\nIt has been {{daysSinceVisit}} days since your last visit. We recommend scheduling a follow-up appointment.\n\nPlease call our office to schedule.\n\nThank you,\n{{practiceName}}',
        variables: ['patientName', 'daysSinceVisit', 'practiceName'],
        channels: [
          { type: 'email', enabled: true, config: {} },
          { type: 'in_app', enabled: true, config: {} },
        ],
      },
    ];

    for (const tpl of templates) {
      this.createTemplate(tpl);
    }

    this.logger.log(`Seeded ${templates.length} default notification templates`);
  }
}