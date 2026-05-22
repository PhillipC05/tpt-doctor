// ============================================================================
// TPT Doctor — Notifications Package
// ============================================================================

export interface NotificationChannelConfig {
  type: 'sms' | 'email' | 'in_app' | 'push';
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface NotificationTemplate {
  id: string;
  tenantId: string;
  type: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  channels: NotificationChannelConfig[];
  createdAt: string;
  updatedAt: string;
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

export interface CommunicationPreference {
  userId: string;
  tenantId: string;
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
    in_app: boolean;
  };
  types: Record<string, boolean>; // notification type -> enabled
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
}

// ============================================================================
// Template Engine
// ============================================================================

export class NotificationTemplateEngine {
  private templates: Map<string, NotificationTemplate> = new Map();

  registerTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  getTemplate(id: string): NotificationTemplate | undefined {
    return this.templates.get(id);
  }

  render(templateId: string, variables: Record<string, string>): { subject: string; body: string } | null {
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

  getTemplatesByType(type: string): NotificationTemplate[] {
    return Array.from(this.templates.values()).filter((t) => t.type === type);
  }
}

// ============================================================================
// SMS Channel (Twilio)
// ============================================================================

export interface SmsConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  messagingServiceSid?: string;
}

export class SmsNotificationChannel {
  private config: SmsConfig;

  constructor(config: SmsConfig) {
    this.config = config;
  }

  async send(to: string, body: string): Promise<NotificationDelivery> {
    const delivery: NotificationDelivery = {
      id: crypto.randomUUID?.() || `${Date.now()}`,
      notificationId: '',
      channel: 'sms',
      recipient: to,
      status: 'pending',
      errorMessage: null,
      sentAt: null,
      deliveredAt: null,
      createdAt: new Date().toISOString(),
    };

    try {
      // In production, this would call Twilio API
      console.log(`[SMS] Sending to ${to}: ${body.substring(0, 50)}...`);
      delivery.status = 'sent';
      delivery.sentAt = new Date().toISOString();
    } catch (error) {
      delivery.status = 'failed';
      delivery.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    return delivery;
  }
}

// ============================================================================
// Email Channel (SendGrid/Mailgun)
// ============================================================================

export interface EmailConfig {
  apiKey: string;
  fromAddress: string;
  fromName: string;
  provider: 'sendgrid' | 'mailgun';
}

export class EmailNotificationChannel {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  async send(to: string, subject: string, body: string): Promise<NotificationDelivery> {
    const delivery: NotificationDelivery = {
      id: crypto.randomUUID?.() || `${Date.now()}`,
      notificationId: '',
      channel: 'email',
      recipient: to,
      status: 'pending',
      errorMessage: null,
      sentAt: null,
      deliveredAt: null,
      createdAt: new Date().toISOString(),
    };

    try {
      console.log(`[Email:${this.config.provider}] Sending "${subject}" to ${to}`);
      delivery.status = 'sent';
      delivery.sentAt = new Date().toISOString();
    } catch (error) {
      delivery.status = 'failed';
      delivery.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    return delivery;
  }
}

// ============================================================================
// Notification Hub
// ============================================================================

export class NotificationHub {
  private smsChannel: SmsNotificationChannel | null = null;
  private emailChannel: EmailNotificationChannel | null = null;
  private templateEngine: NotificationTemplateEngine;
  private preferences: Map<string, CommunicationPreference> = new Map();
  private onInAppNotification?: (userId: string, notification: any) => void;

  constructor(templateEngine?: NotificationTemplateEngine) {
    this.templateEngine = templateEngine || new NotificationTemplateEngine();
  }

  configureSms(config: SmsConfig): void {
    this.smsChannel = new SmsNotificationChannel(config);
  }

  configureEmail(config: EmailConfig): void {
    this.emailChannel = new EmailNotificationChannel(config);
  }

  setInAppHandler(handler: (userId: string, notification: any) => void): void {
    this.onInAppNotification = handler;
  }

  setPreference(pref: CommunicationPreference): void {
    this.preferences.set(pref.userId, pref);
  }

  getPreference(userId: string): CommunicationPreference | undefined {
    return this.preferences.get(userId);
  }

  async send(options: {
    userId: string;
    type: string;
    templateId?: string;
    variables?: Record<string, string>;
    channels?: ('sms' | 'email' | 'in_app')[];
    customSubject?: string;
    customBody?: string;
  }): Promise<NotificationDelivery[]> {
    const deliveries: NotificationDelivery[] = [];
    const pref = this.preferences.get(options.userId);

    // Render template if provided
    let subject = options.customSubject || '';
    let body = options.customBody || '';

    if (options.templateId) {
      const rendered = this.templateEngine.render(options.templateId, options.variables || {});
      if (rendered) {
        subject = rendered.subject;
        body = rendered.body;
      }
    }

    const channels = options.channels || ['in_app'];

    // Check user preferences
    for (const channel of channels) {
      if (pref && !pref.channels[channel]) continue;
      if (pref && pref.types[options.type] === false) continue;

      switch (channel) {
        case 'sms':
          if (this.smsChannel) {
            const delivery = await this.smsChannel.send('', body);
            deliveries.push(delivery);
          }
          break;
        case 'email':
          if (this.emailChannel) {
            const delivery = await this.emailChannel.send('', subject, body);
            deliveries.push(delivery);
          }
          break;
        case 'in_app':
          if (this.onInAppNotification) {
            this.onInAppNotification(options.userId, {
              type: options.type,
              title: subject,
              message: body,
              data: options.variables,
            });
          }
          deliveries.push({
            id: crypto.randomUUID?.() || `${Date.now()}`,
            notificationId: '',
            channel: 'in_app',
            recipient: options.userId,
            status: 'sent',
            errorMessage: null,
            sentAt: new Date().toISOString(),
            deliveredAt: null,
            createdAt: new Date().toISOString(),
          });
          break;
      }
    }

    return deliveries;
  }
}

// ============================================================================
// Default Notification Templates
// ============================================================================

export const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'appointment-reminder-24h',
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lab-result-ready',
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prescription-refill',
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'billing-notification',
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'welcome-message',
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'follow-up',
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];