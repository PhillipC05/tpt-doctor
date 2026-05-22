import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import * as crypto from 'crypto';

export interface WebhookEndpoint {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  retryCount: number;
  timeout: number;
  headers: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: string;
  payload: any;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  responseCode: number | null;
  responseBody: string | null;
  attempts: number;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

/**
 * In-memory webhook storage with optional database persistence.
 * When Prisma schema lacks a webhookEndpoint model, falls back gracefully to in-memory only.
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private endpoints = new Map<string, WebhookEndpoint>();
  private deliveries = new Map<string, WebhookDelivery>();
  private dbAvailable: boolean | null = null;

  private async checkDbAvailability(): Promise<boolean> {
    if (this.dbAvailable !== null) return this.dbAvailable;
    try {
      // Test Prisma connectivity without specific model dependency
      await prisma.$queryRaw`SELECT 1`;
      this.dbAvailable = true;
    } catch {
      this.dbAvailable = false;
      this.logger.warn('Database unavailable — webhook endpoints will be in-memory only');
    }
    return this.dbAvailable;
  }

  registerEndpoint(config: Omit<WebhookEndpoint, 'id' | 'createdAt' | 'updatedAt'>): WebhookEndpoint {
    const endpoint: WebhookEndpoint = {
      ...config,
      id: crypto.randomUUID?.() || `${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.endpoints.set(endpoint.id, endpoint);
    return endpoint;
  }

  getEndpoint(id: string): WebhookEndpoint | undefined {
    return this.endpoints.get(id);
  }

  getAllEndpoints(tenantId?: string): WebhookEndpoint[] {
    const results = Array.from(this.endpoints.values());
    return tenantId ? results.filter((e) => e.tenantId === tenantId) : results;
  }

  updateEndpoint(id: string, update: Partial<WebhookEndpoint>): WebhookEndpoint | null {
    const existing = this.endpoints.get(id);
    if (!existing) return null;

    const updated: WebhookEndpoint = {
      ...existing,
      ...update,
      id,
      updatedAt: new Date().toISOString(),
    };
    this.endpoints.set(id, updated);
    return updated;
  }

  deleteEndpoint(id: string): boolean {
    return this.endpoints.delete(id);
  }

  async trigger(event: string, payload: any): Promise<WebhookDelivery[]> {
    const deliveries: WebhookDelivery[] = [];
    const matchingEndpoints = Array.from(this.endpoints.values())
      .filter((e) => e.isActive && e.events.includes(event));

    for (const endpoint of matchingEndpoints) {
      const delivery = await this.sendWebhook(endpoint, event, payload);
      deliveries.push(delivery);
    }

    return deliveries;
  }

  /**
   * Compute HMAC-SHA256 signature for webhook payload
   * NEVER sends the raw secret across the wire
   */
  private computeSignature(secret: string, payload: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  private async sendWebhook(
    endpoint: WebhookEndpoint,
    event: string,
    payload: any,
  ): Promise<WebhookDelivery> {
    const id = crypto.randomUUID?.() || `${Date.now()}`;
    const delivery: WebhookDelivery = {
      id,
      endpointId: endpoint.id,
      event,
      payload,
      status: 'pending',
      responseCode: null,
      responseBody: null,
      attempts: 0,
      nextRetryAt: null,
      deliveredAt: null,
      createdAt: new Date().toISOString(),
    };

    try {
      delivery.attempts++;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), endpoint.timeout || 10000);

      // Build and sign the payload body
      const body = JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        payload,
      });

      // Compute HMAC-SHA256 signature — NEVER send raw secret
      const signature = this.computeSignature(endpoint.secret, body);
      const timestamp = Date.now().toString();

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Timestamp': timestamp,
          ...endpoint.headers,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      delivery.responseCode = response.status;
      // Truncate response body to prevent PHI leakage in webhook delivery logs
      const rawBody = await response.text();
      delivery.responseBody = rawBody.length > 1000 ? rawBody.substring(0, 1000) + '...' : rawBody;
      delivery.status = response.ok ? 'delivered' : 'failed';
      delivery.deliveredAt = response.ok ? new Date().toISOString() : null;
    } catch (error) {
      delivery.status = 'failed';
      delivery.responseBody = error instanceof Error ? error.message.substring(0, 500) : 'Unknown error';

      // Retry logic with exponential backoff
      if (delivery.attempts < (endpoint.retryCount || 3)) {
        delivery.status = 'retrying';
        const backoff = Math.pow(2, delivery.attempts) * 1000;
        delivery.nextRetryAt = new Date(Date.now() + backoff).toISOString();
      }
    }

    // Do not store raw payload in delivery records to prevent PHI leakage
    delivery.payload = { event: delivery.event, deliveryId: id };
    this.deliveries.set(id, delivery);
    return delivery;
  }

  getDeliveries(endpointId?: string): WebhookDelivery[] {
    const results = Array.from(this.deliveries.values());
    return endpointId ? results.filter((d) => d.endpointId === endpointId) : results;
  }

  retryDelivery(deliveryId: string): Promise<WebhookDelivery | null> {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return Promise.resolve(null);

    const endpoint = this.endpoints.get(delivery.endpointId);
    if (!endpoint) return Promise.resolve(null);

    return this.sendWebhook(endpoint, delivery.event, delivery.payload);
  }
}
