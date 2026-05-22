// ============================================================================
// TPT Doctor — Database Seed Script
// Creates initial tenant, admin user, and demo data
// ============================================================================

import { prisma } from './index';
import { config } from '@tpt-doctor/config';

async function main() {
  console.log('🌱 Seeding TPT Doctor database...');

  // Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-practice' },
    update: {},
    create: {
      name: 'Demo Medical Practice',
      slug: 'demo-practice',
      dataRegion: 'US',
      complianceFrameworks: ['HIPAA', 'GDPR'],
      settings: {
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD',
        defaultAppointmentDuration: 15,
        enableTelemedicine: true,
        enablePatientPortal: true,
        enableBilling: true,
        businessHours: {
          monday: { open: '09:00', close: '17:00', isOpen: true },
          tuesday: { open: '09:00', close: '17:00', isOpen: true },
          wednesday: { open: '09:00', close: '17:00', isOpen: true },
          thursday: { open: '09:00', close: '17:00', isOpen: true },
          friday: { open: '09:00', close: '17:00', isOpen: true },
          saturday: { open: null, close: null, isOpen: false },
          sunday: { open: null, close: null, isOpen: false },
        },
      },
    },
  });
  console.log(`✅ Tenant created: ${tenant.name} (${tenant.slug})`);

  // Create admin user (placeholder — real users come from Auth0)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@tptdoctor.com' },
    update: {},
    create: {
      email: 'admin@tptdoctor.com',
      firstName: 'Admin',
      lastName: 'User',
      auth0Id: 'auth0|placeholder-admin',
      isActive: true,
    },
  });
  console.log(`✅ Admin user created: ${adminUser.email}`);

  // Create admin staff member
  const adminStaff = await prisma.staffMember.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: adminUser.id,
      role: 'PRACTICE_ADMIN',
      permissions: [
        'PATIENT_READ', 'PATIENT_CREATE', 'PATIENT_UPDATE',
        'EHR_READ', 'EHR_CREATE',
        'APPOINTMENT_READ', 'APPOINTMENT_CREATE', 'APPOINTMENT_UPDATE', 'APPOINTMENT_DELETE',
        'BILLING_READ', 'BILLING_CREATE', 'BILLING_UPDATE',
        'STAFF_READ', 'STAFF_CREATE', 'STAFF_UPDATE',
        'ADMIN_ACCESS', 'AUDIT_LOG_VIEW', 'REPORT_VIEW', 'REPORT_CREATE',
        'PRESCRIPTION_READ', 'PRESCRIPTION_CREATE',
        'LAB_READ', 'LAB_CREATE',
      ],
      title: 'Practice Administrator',
      isActive: true,
    },
  });
  console.log(`✅ Admin staff created: ${adminStaff.title}`);

  // Create demo doctor
  const doctorUser = await prisma.user.upsert({
    where: { email: 'doctor@tptdoctor.com' },
    update: {},
    create: {
      email: 'doctor@tptdoctor.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      auth0Id: 'auth0|placeholder-doctor',
      isActive: true,
    },
  });

  await prisma.staffMember.upsert({
    where: { userId: doctorUser.id },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: doctorUser.id,
      role: 'DOCTOR',
      permissions: [
        'PATIENT_READ', 'PATIENT_CREATE', 'PATIENT_UPDATE',
        'EHR_READ', 'EHR_CREATE', 'EHR_UPDATE',
        'APPOINTMENT_READ', 'APPOINTMENT_CREATE', 'APPOINTMENT_UPDATE',
        'PRESCRIPTION_READ', 'PRESCRIPTION_CREATE', 'PRESCRIPTION_UPDATE',
        'LAB_READ', 'LAB_CREATE', 'LAB_UPDATE',
        'REPORT_VIEW',
      ],
      title: 'MD - Family Medicine',
      licenseNumber: 'MD12345',
      npiNumber: '1234567890',
      specialization: 'Family Medicine',
      isActive: true,
    },
  });
  console.log(`✅ Doctor created: Dr. Sarah Johnson`);

  // Create demo receptionist
  const receptionistUser = await prisma.user.upsert({
    where: { email: 'reception@tptdoctor.com' },
    update: {},
    create: {
      email: 'reception@tptdoctor.com',
      firstName: 'Mike',
      lastName: 'Wilson',
      auth0Id: 'auth0|placeholder-reception',
      isActive: true,
    },
  });

  await prisma.staffMember.upsert({
    where: { userId: receptionistUser.id },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: receptionistUser.id,
      role: 'RECEPTIONIST',
      permissions: [
        'PATIENT_READ', 'PATIENT_CREATE', 'PATIENT_UPDATE',
        'APPOINTMENT_READ', 'APPOINTMENT_CREATE', 'APPOINTMENT_UPDATE', 'APPOINTMENT_DELETE',
        'BILLING_READ',
      ],
      title: 'Front Desk Receptionist',
      isActive: true,
    },
  });
  console.log(`✅ Receptionist created: Mike Wilson`);

  console.log('');
  console.log('🎉 Seeding complete!');
  console.log('');
  console.log('Demo accounts (configure Auth0 then login):');
  console.log('  admin@tptdoctor.com     - Practice Administrator');
  console.log('  doctor@tptdoctor.com     - Dr. Sarah Johnson');
  console.log('  reception@tptdoctor.com  - Mike Wilson (Receptionist)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });