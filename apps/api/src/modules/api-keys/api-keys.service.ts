// ============================================================================
// TPT Doctor — API Key Service (Phase 15.4)
// Manages API keys for external integrations (FHIR clients, webhooks).
// Keys are stored as SHA-256 hashes; raw key shown only at creation time.
// ============================================================================

import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import * as crypto from 'crypto';

const KEY_PREFIX = 'tpt_';
const KEY_BYTES = 32; // 32 random bytes → 64-char hex raw key

function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function generateRawKey(): string {
  return KEY_PREFIX + crypto.randomBytes(KEY_BYTES).toString('hex');
}

export interface CreateApiKeyOptions {
  name: string;
  scopes: string[];
  expiresAt?: Date;
}

@Injectable()
export class ApiKeysService {
  async createApiKey(
    tenantId: string,
    createdBy: string,
    options: CreateApiKeyOptions,
  ): Promise<{ apiKey: any; rawKey: string }> {
    if (!options.name?.trim()) {
      throw new BadRequestException('API key name is required');
    }

    const rawKey = generateRawKey();
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 8); // "tpt_" + first 4 hex chars

    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId,
        name: options.name.trim(),
        keyHash,
        keyPrefix,
        scopes: options.scopes ?? [],
        expiresAt: options.expiresAt ?? null,
        createdBy,
      },
    });

    // rawKey is returned ONCE and never stored — caller must save it securely
    return { apiKey, rawKey };
  }

  async listApiKeys(tenantId: string) {
    return prisma.apiKey.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeApiKey(id: string, tenantId: string): Promise<void> {
    const key = await prisma.apiKey.findFirst({ where: { id, tenantId } });
    if (!key) throw new NotFoundException('API key not found');
    await prisma.apiKey.update({ where: { id }, data: { isActive: false } });
  }

  async deleteApiKey(id: string, tenantId: string): Promise<void> {
    const key = await prisma.apiKey.findFirst({ where: { id, tenantId } });
    if (!key) throw new NotFoundException('API key not found');
    await prisma.apiKey.delete({ where: { id } });
  }

  async validateApiKey(rawKey: string): Promise<any> {
    const keyHash = hashApiKey(rawKey);

    const apiKey = await prisma.apiKey.findFirst({
      where: { keyHash, isActive: true },
      include: { tenant: { select: { id: true, name: true, isActive: true } } },
    });

    if (!apiKey) throw new UnauthorizedException('Invalid API key');
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }
    if (!apiKey.tenant.isActive) {
      throw new UnauthorizedException('Tenant account is inactive');
    }

    // Update last-used timestamp (fire-and-forget, don't block the request)
    prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

    return apiKey;
  }

  hasScope(apiKey: { scopes: string[] }, requiredScope: string): boolean {
    return apiKey.scopes.includes(requiredScope) || apiKey.scopes.includes('*');
  }
}
