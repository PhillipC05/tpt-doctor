import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  async login(credentials: LoginDto): Promise<{ accessToken: string; refreshToken: string; user: unknown }> {
    // Auth0 handles authentication — this endpoint is a passthrough for non-SPA flows.
    // In production, validate credentials against Auth0 Management API or Resource Owner Password grant.
    this.logger.log(`Login attempt for ${credentials.email}`);
    throw new UnauthorizedException('Use Auth0 Universal Login or the SPA SDK for authentication');
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    this.logger.log(`Password reset requested for ${email}`);
    // Auth0 sends the reset email — trigger via Management API in production.
    return { message: 'If an account exists for that email, a password reset link has been sent.' };
  }

  async verifyMfa(userId: string, code: string): Promise<{ verified: boolean }> {
    this.logger.log(`MFA verification for user ${userId}`);
    // Auth0 manages TOTP/SMS MFA — verify via Auth0 MFA API in production.
    void code;
    throw new UnauthorizedException('MFA verification must be completed through Auth0');
  }
}
