import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction } from '@tpt-doctor/shared';

/**
 * In-memory retry queue for failed audit log writes.
 * Prevents audit record loss when the database is temporarily unavailable.
 * Flushed every 30 seconds via the retry processor.
 */
interface PendingAuditEvent {
  params: {
    tenantId: string;
    userId: string;
    action: AuditAction;
    resource: string;
    resourceId: string;
    details: Record<string, unknown>;
    ipAddress: string;
    userAgent?: string;
  };
  attempts: number;
  lastAttempt: number;
}

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditMiddleware.name);
  private static retryQueue: PendingAuditEvent[] = [];
  private static readonly MAX_RETRY_ATTEMPTS = 5;
  private static readonly RETRY_INTERVAL_MS = 30000; // 30 seconds
  private static retryProcessorInitialized = false;

  constructor() {
    if (!AuditMiddleware.retryProcessorInitialized) {
      AuditMiddleware.retryProcessorInitialized = true;
      this.startRetryProcessor();
    }
  }

  use(request: Request, response: Response, next: NextFunction): void {
    const originalEnd = response.end.bind(response) as (...args: any[]) => Response;
    const startTime = Date.now();
    const self = this;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response.end = function (this: Response, ...args: any[]): Response {
      const { method, originalUrl } = request;
      const user = (request as any).user;
      const duration = Date.now() - startTime;

      // Only log mutations and PHI access (GET with PHI is intentionally excluded from mutation audit,
      // but PHI access is tracked via the HIPAA-compliant audit log service separately)
      if (user && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const action = method === 'POST' ? AuditAction.CREATE
          : ['PUT', 'PATCH'].includes(method) ? AuditAction.UPDATE
          : AuditAction.DELETE;

        // Extract resource from URL path: /api/{version}/{resource}/{id}
        const pathParts = originalUrl.replace(/^\/+/, '').split('/');
        const resource = pathParts[1] || pathParts[0] || 'unknown';
        const resourceId = pathParts[2] || null;

        const auditParams = {
          tenantId: user.tenantId,
          userId: user.id,
          action,
          resource,
          resourceId: resourceId || 'unknown',
          details: { method, duration, statusCode: response.statusCode },
          ipAddress: request.ip || '0.0.0.0',
          userAgent: request.headers['user-agent'],
        };

        // Fire-and-forget with retry queue fallback
        logAuditEvent(auditParams).catch((err) => {
          self.logger.warn(`Audit log write failed, queuing for retry: ${err.message}`);
          self.enqueueRetry(auditParams);
        });
      }

      return originalEnd.apply(this, args);
    };

    next();
  }

  /**
   * Add a failed audit event to the retry queue
   */
  private enqueueRetry(params: PendingAuditEvent['params']): void {
    AuditMiddleware.retryQueue.push({
      params,
      attempts: 0,
      lastAttempt: Date.now(),
    });
  }

  /**
   * Process queued audit events with exponential backoff
   */
  private startRetryProcessor(): void {
    const processQueue = async () => {
      if (AuditMiddleware.retryQueue.length === 0) {
        return;
      }

      const batch = [...AuditMiddleware.retryQueue];
      AuditMiddleware.retryQueue = [];

      for (const event of batch) {
        try {
          event.attempts++;
          event.lastAttempt = Date.now();
          await logAuditEvent(event.params);
        } catch (err: any) {
          if (event.attempts < AuditMiddleware.MAX_RETRY_ATTEMPTS) {
            // Re-enqueue with backoff
            AuditMiddleware.retryQueue.push(event);
            this.logger.warn(
              `Audit retry ${event.attempts}/${AuditMiddleware.MAX_RETRY_ATTEMPTS} failed: ${err.message}`,
            );
          } else {
            this.logger.error(
              `Audit event permanently failed after ${AuditMiddleware.MAX_RETRY_ATTEMPTS} attempts. ` +
              `Action: ${event.params.action}, Resource: ${event.params.resource}/${event.params.resourceId}`,
            );
          }
        }
      }
    };

    // Run retry processor at the configured interval
    setInterval(processQueue, AuditMiddleware.RETRY_INTERVAL_MS);
    this.logger.log(`Audit retry processor started (interval: ${AuditMiddleware.RETRY_INTERVAL_MS}ms)`);
  }
}
