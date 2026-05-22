// ============================================================================
// TPT Doctor — Auth Service (Auth0 Integration + RBAC)
// ============================================================================

import { config } from '@tpt-doctor/config';
import { prisma } from '@tpt-doctor/database';
import { UserRole, Permission } from '@tpt-doctor/shared';
import jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  tenantSlug: string;
  role: UserRole;
  permissions: Permission[];
  isStaff: boolean;
  auth0Id: string;
}

// JWKS client singleton for RSA public key retrieval
let jwksClient: JwksClient | null = null;

function getJwksClient(): JwksClient {
  if (!jwksClient) {
    const domain = config.auth0.domain;
    if (!domain) {
      throw new Error('Auth0 domain is not configured');
    }
    jwksClient = new JwksClient({
      jwksUri: `https://${domain}/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }
  return jwksClient;
}

/**
 * Verify an Auth0 JWT access token with proper JWKS signature verification
 */
export async function verifyAccessToken(token: string): Promise<AuthUser | null> {
  try {
    // First decode the token header to get the kid (key ID)
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader || typeof decodedHeader === 'string' || !decodedHeader.header || !decodedHeader.payload) {
      return null;
    }

    const kid = decodedHeader.header.kid;
    if (!kid) {
      return null;
    }

    // Retrieve the signing key from Auth0's JWKS endpoint
    const jwksClient = getJwksClient();
    let signingKey: string;
    try {
      const key = await jwksClient.getSigningKey(kid);
      signingKey = key.getPublicKey();
    } catch {
      return null; // Key not found or JWKS unreachable
    }

    // Verify the token signature using the retrieved public key
    const audience = config.auth0.audience;
    const domain = config.auth0.domain;
    const verifiedPayload = jwt.verify(token, signingKey, {
      algorithms: ['RS256'],
      audience,
      issuer: `https://${domain}/`,
    }) as jwt.JwtPayload;

    if (!verifiedPayload || !verifiedPayload.sub) {
      return null;
    }

    const auth0Id = verifiedPayload.sub;

    // Find user by Auth0 ID
    const user = await prisma.user.findUnique({
      where: { auth0Id },
      include: {
        staffProfile: {
          include: { tenant: { select: { id: true, slug: true, name: true } } },
        },
        patientProfile: {
          include: { tenant: { select: { id: true, slug: true, name: true } } },
        },
      },
    });

    if (!user || !user.isActive) return null;

    const staffProfile = user.staffProfile;
    const patientProfile = user.patientProfile;

    if (!staffProfile && !patientProfile) return null;

    if (staffProfile) {
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: staffProfile.tenantId,
        tenantSlug: staffProfile.tenant.slug,
        role: staffProfile.role as UserRole,
        permissions: staffProfile.permissions as Permission[],
        isStaff: true,
        auth0Id: user.auth0Id,
      };
    }

    // Patient portal access
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: patientProfile!.tenantId,
      tenantSlug: patientProfile!.tenant.slug,
      role: UserRole.PATIENT,
      permissions: [
        Permission.PATIENT_READ,
        Permission.EHR_READ,
        Permission.APPOINTMENT_READ,
        Permission.APPOINTMENT_CREATE,
      ],
      isStaff: false,
      auth0Id: user.auth0Id,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: AuthUser, permission: Permission): boolean {
  if (user.role === UserRole.SUPER_ADMIN) return true;
  return user.permissions.includes(permission);
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(user: AuthUser, permissions: Permission[]): boolean {
  if (user.role === UserRole.SUPER_ADMIN) return true;
  return permissions.every((p) => user.permissions.includes(p));
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(user: AuthUser, permissions: Permission[]): boolean {
  if (user.role === UserRole.SUPER_ADMIN) return true;
  return permissions.some((p) => user.permissions.includes(p));
}

/**
 * Check if a user has a specific role
 */
export function hasRole(user: AuthUser, role: UserRole): boolean {
  return user.role === role || user.role === UserRole.SUPER_ADMIN;
}

/**
 * Get default permissions for a role
 */
export function getDefaultPermissions(role: UserRole): Permission[] {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return Object.values(Permission);
    case UserRole.PRACTICE_ADMIN:
      return [
        Permission.PATIENT_READ, Permission.PATIENT_CREATE, Permission.PATIENT_UPDATE,
        Permission.EHR_READ, Permission.EHR_CREATE,
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_CREATE, Permission.APPOINTMENT_UPDATE, Permission.APPOINTMENT_DELETE,
        Permission.BILLING_READ, Permission.BILLING_CREATE, Permission.BILLING_UPDATE,
        Permission.STAFF_READ, Permission.STAFF_CREATE, Permission.STAFF_UPDATE,
        Permission.ADMIN_ACCESS, Permission.AUDIT_LOG_VIEW, Permission.REPORT_VIEW, Permission.REPORT_CREATE,
        Permission.LAB_READ, Permission.LAB_CREATE,
      ];
    case UserRole.DOCTOR:
      return [
        Permission.PATIENT_READ, Permission.PATIENT_CREATE, Permission.PATIENT_UPDATE,
        Permission.EHR_READ, Permission.EHR_CREATE, Permission.EHR_UPDATE,
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_CREATE, Permission.APPOINTMENT_UPDATE,
        Permission.PRESCRIPTION_READ, Permission.PRESCRIPTION_CREATE, Permission.PRESCRIPTION_UPDATE,
        Permission.LAB_READ, Permission.LAB_CREATE, Permission.LAB_UPDATE,
        Permission.REPORT_VIEW,
      ];
    case UserRole.NURSE:
      return [
        Permission.PATIENT_READ, Permission.PATIENT_CREATE, Permission.PATIENT_UPDATE,
        Permission.EHR_READ, Permission.EHR_CREATE, Permission.EHR_UPDATE,
        Permission.APPOINTMENT_READ,
        Permission.LAB_READ, Permission.LAB_CREATE,
      ];
    case UserRole.RECEPTIONIST:
      return [
        Permission.PATIENT_READ, Permission.PATIENT_CREATE, Permission.PATIENT_UPDATE,
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_CREATE, Permission.APPOINTMENT_UPDATE, Permission.APPOINTMENT_DELETE,
        Permission.BILLING_READ,
      ];
    case UserRole.PATIENT:
      return [
        Permission.PATIENT_READ,
        Permission.EHR_READ,
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_CREATE,
      ];
  }
}

/**
 * NestJS Guard helper — validates user has required permissions
 */
export function validateAccess(
  user: AuthUser,
  requiredPermissions?: Permission[],
  requiredRole?: UserRole,
): boolean {
  if (requiredRole && !hasRole(user, requiredRole)) return false;
  if (requiredPermissions && !hasAllPermissions(user, requiredPermissions)) return false;
  return true;
}