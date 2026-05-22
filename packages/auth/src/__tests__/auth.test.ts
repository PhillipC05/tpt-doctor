import { describe, it, expect } from '@jest/globals';
import { 
  hasPermission, 
  hasAllPermissions, 
  hasAnyPermission, 
  hasRole, 
  getDefaultPermissions,
  validateAccess,
  AuthUser 
} from '../index';
import { UserRole, Permission } from '@tpt-doctor/shared';

const mockStaffUser: AuthUser = {
  id: 'user-1',
  email: 'doctor@clinic.com',
  firstName: 'John',
  lastName: 'Doe',
  tenantId: 'tenant-1',
  tenantSlug: 'clinic-a',
  role: UserRole.DOCTOR,
  permissions: [
    Permission.PATIENT_READ,
    Permission.PATIENT_CREATE,
    Permission.PATIENT_UPDATE,
    Permission.EHR_READ,
    Permission.EHR_CREATE,
    Permission.EHR_UPDATE,
    Permission.APPOINTMENT_READ,
    Permission.APPOINTMENT_CREATE,
    Permission.APPOINTMENT_UPDATE,
    Permission.PRESCRIPTION_READ,
    Permission.PRESCRIPTION_CREATE,
    Permission.PRESCRIPTION_UPDATE,
    Permission.LAB_READ,
    Permission.LAB_CREATE,
    Permission.LAB_UPDATE,
    Permission.REPORT_VIEW,
  ],
  isStaff: true,
  auth0Id: 'auth0|12345',
};

const mockSuperAdmin: AuthUser = {
  id: 'user-super',
  email: 'admin@tpt.com',
  firstName: 'Super',
  lastName: 'Admin',
  tenantId: 'tenant-1',
  tenantSlug: 'clinic-a',
  role: UserRole.SUPER_ADMIN,
  permissions: Object.values(Permission),
  isStaff: true,
  auth0Id: 'auth0|99999',
};

const mockReceptionist: AuthUser = {
  id: 'user-rec',
  email: 'receptionist@clinic.com',
  firstName: 'Jane',
  lastName: 'Smith',
  tenantId: 'tenant-1',
  tenantSlug: 'clinic-a',
  role: UserRole.RECEPTIONIST,
  permissions: [
    Permission.PATIENT_READ,
    Permission.PATIENT_CREATE,
    Permission.PATIENT_UPDATE,
    Permission.APPOINTMENT_READ,
    Permission.APPOINTMENT_CREATE,
    Permission.APPOINTMENT_UPDATE,
    Permission.APPOINTMENT_DELETE,
    Permission.BILLING_READ,
  ],
  isStaff: true,
  auth0Id: 'auth0|67890',
};

describe('hasPermission', () => {
  it('should return true when user has the permission', () => {
    expect(hasPermission(mockStaffUser, Permission.PATIENT_READ)).toBe(true);
  });

  it('should return false when user lacks the permission', () => {
    expect(hasPermission(mockStaffUser, Permission.ADMIN_ACCESS)).toBe(false);
  });

  it('should return true for super admin regardless of permission', () => {
    expect(hasPermission(mockSuperAdmin, Permission.ADMIN_ACCESS)).toBe(true);
    expect(hasPermission(mockSuperAdmin, Permission.PATIENT_DELETE)).toBe(true);
  });
});

describe('hasAllPermissions', () => {
  it('should return true when user has all permissions', () => {
    expect(hasAllPermissions(mockStaffUser, [Permission.PATIENT_READ, Permission.EHR_READ])).toBe(true);
  });

  it('should return false when user lacks any permission', () => {
    expect(hasAllPermissions(mockStaffUser, [Permission.PATIENT_READ, Permission.ADMIN_ACCESS])).toBe(false);
  });

  it('should return true for super admin', () => {
    expect(hasAllPermissions(mockSuperAdmin, [Permission.ADMIN_ACCESS, Permission.STAFF_DELETE])).toBe(true);
  });

  it('should return true for empty permissions array', () => {
    expect(hasAllPermissions(mockStaffUser, [])).toBe(true);
  });
});

describe('hasAnyPermission', () => {
  it('should return true when user has any of the permissions', () => {
    expect(hasAnyPermission(mockReceptionist, [Permission.PATIENT_READ, Permission.ADMIN_ACCESS])).toBe(true);
  });

  it('should return false when user has none of the permissions', () => {
    expect(hasAnyPermission(mockReceptionist, [Permission.ADMIN_ACCESS, Permission.STAFF_READ])).toBe(false);
  });

  it('should return true for super admin', () => {
    expect(hasAnyPermission(mockSuperAdmin, [Permission.STAFF_DELETE])).toBe(true);
  });
});

describe('hasRole', () => {
  it('should return true when role matches', () => {
    expect(hasRole(mockStaffUser, UserRole.DOCTOR)).toBe(true);
  });

  it('should return false when role does not match', () => {
    expect(hasRole(mockStaffUser, UserRole.NURSE)).toBe(false);
  });

  it('should return true for super admin checking any role', () => {
    expect(hasRole(mockSuperAdmin, UserRole.NURSE)).toBe(true);
    expect(hasRole(mockSuperAdmin, UserRole.DOCTOR)).toBe(true);
  });
});

describe('validateAccess', () => {
  it('should pass when no permissions or role required', () => {
    expect(validateAccess(mockStaffUser)).toBe(true);
  });

  it('should pass when user has required permissions', () => {
    expect(validateAccess(mockStaffUser, [Permission.PATIENT_READ, Permission.EHR_READ])).toBe(true);
  });

  it('should fail when user lacks required permissions', () => {
    expect(validateAccess(mockReceptionist, [Permission.ADMIN_ACCESS])).toBe(false);
  });

  it('should pass when user has required role', () => {
    expect(validateAccess(mockStaffUser, undefined, UserRole.DOCTOR)).toBe(true);
  });

  it('should fail when user does not have required role', () => {
    expect(validateAccess(mockReceptionist, undefined, UserRole.DOCTOR)).toBe(false);
  });

  it('should fail when user lacks both role and permissions', () => {
    expect(validateAccess(mockReceptionist, [Permission.ADMIN_ACCESS], UserRole.DOCTOR)).toBe(false);
  });
});

describe('getDefaultPermissions', () => {
  it('should return all permissions for SUPER_ADMIN', () => {
    const perms = getDefaultPermissions(UserRole.SUPER_ADMIN);
    expect(perms).toContain(Permission.PATIENT_READ);
    expect(perms).toContain(Permission.ADMIN_ACCESS);
    expect(perms).toContain(Permission.STAFF_DELETE);
    expect(perms.length).toBe(Object.values(Permission).length);
  });

  it('should return patient + ehr + appointment permissions for DOCTOR', () => {
    const perms = getDefaultPermissions(UserRole.DOCTOR);
    expect(perms).toContain(Permission.PATIENT_READ);
    expect(perms).toContain(Permission.EHR_CREATE);
    expect(perms).toContain(Permission.PRESCRIPTION_CREATE);
    expect(perms).not.toContain(Permission.ADMIN_ACCESS);
  });

  it('should return limited permissions for RECEPTIONIST', () => {
    const perms = getDefaultPermissions(UserRole.RECEPTIONIST);
    expect(perms).toContain(Permission.APPOINTMENT_READ);
    expect(perms).toContain(Permission.BILLING_READ);
    expect(perms).not.toContain(Permission.EHR_CREATE);
    expect(perms).not.toContain(Permission.PRESCRIPTION_READ);
  });

  it('should return minimum permissions for PATIENT', () => {
    const perms = getDefaultPermissions(UserRole.PATIENT);
    expect(perms).toContain(Permission.PATIENT_READ);
    expect(perms).toContain(Permission.EHR_READ);
    expect(perms).toContain(Permission.APPOINTMENT_READ);
    expect(perms).toContain(Permission.APPOINTMENT_CREATE);
    expect(perms).not.toContain(Permission.PATIENT_CREATE);
    expect(perms).not.toContain(Permission.PATIENT_UPDATE);
  });

  it('should return empty array for unknown role', () => {
    const perms = getDefaultPermissions('UNKNOWN' as UserRole);
    expect(perms).toBeUndefined();
  });
});