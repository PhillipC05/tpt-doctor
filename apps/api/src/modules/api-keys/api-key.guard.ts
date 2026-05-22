// ============================================================================
// TPT Doctor — API Key Guard (Phase 15.4)
// Validates X-API-Key header for external integration endpoints (FHIR, webhooks).
// ============================================================================

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from './api-keys.service';

export const REQUIRED_SCOPE_KEY = 'requiredApiScope';
export const RequireApiScope = (scope: string) => SetMetadata(REQUIRED_SCOPE_KEY, scope);

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawKey = request.headers['x-api-key'] as string | undefined;

    if (!rawKey) {
      throw new UnauthorizedException('X-API-Key header is required');
    }
    if (!rawKey.startsWith('tpt_')) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const apiKey = await this.apiKeysService.validateApiKey(rawKey);

    // Check optional scope requirement from @RequireApiScope decorator
    const requiredScope = this.reflector.get<string>(REQUIRED_SCOPE_KEY, context.getHandler());
    if (requiredScope && !this.apiKeysService.hasScope(apiKey, requiredScope)) {
      throw new UnauthorizedException(`API key does not have required scope: ${requiredScope}`);
    }

    // Attach tenant context to request so controllers can use it
    request.apiKey = apiKey;
    request.tenantId = apiKey.tenantId;

    return true;
  }
}
