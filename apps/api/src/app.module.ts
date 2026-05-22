// ============================================================================
// TPT Doctor — App Module (Root)
// ============================================================================

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './modules/auth/auth.module';
import { PatientsModule } from './modules/patients/patients.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { EhrModule } from './modules/ehr/ehr.module';
import { BillingModule } from './modules/billing/billing.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { LabModule } from './modules/lab/lab.module';
import { StaffModule } from './modules/staff/staff.module';
import { MessagesModule } from './modules/messages/messages.module';
import { TelemedicineModule } from './modules/telemedicine/telemedicine.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { AuditlogModule } from './modules/audit-log/auditlog.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { CarePlansModule } from './modules/care-plans/care-plans.module';
import { MedicalCertificatesModule } from './modules/medical-certificates/medical-certificates.module';
import { PatientIntakeModule } from './modules/patient-intake/patient-intake.module';
import { ClinicalCodingModule } from './modules/clinical-coding/clinical-coding.module';
import { CountryProfilesModule } from './modules/country-profiles/country-profiles.module';
import { BusinessIntelligenceModule } from './modules/business-intelligence/business-intelligence.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuditMiddleware } from './common/middleware/audit.middleware';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

@Module({
  imports: [
    // Global config
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting — named profiles allow per-endpoint overrides via @Throttle({ <name>: ... })
    // default:  100 req / 60 s  — standard API calls
    // strict:   10  req / 60 s  — mutation endpoints (prescriptions, billing)
    // auth:     5   req / 60 s  — login / MFA (overridden directly on auth controller)
    // export:   5   req / 300 s — bulk export / reporting (high-cost queries)
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000,  limit: 100 },
      { name: 'strict',  ttl: 60000,  limit: 10  },
      { name: 'auth',    ttl: 60000,  limit: 5   },
      { name: 'export',  ttl: 300000, limit: 5   },
    ]),

    // Scheduled tasks (reminders, backups)
    ScheduleModule.forRoot(),

    // Feature modules
    AuthModule,
    PatientsModule,
    AppointmentsModule,
    EhrModule,
    BillingModule,
    PrescriptionsModule,
    LabModule,
    StaffModule,
    MessagesModule,
    TelemedicineModule,
    ReportingModule,
    ComplianceModule,
    TenantModule,
    AuditlogModule,
    ReferralsModule,
    CarePlansModule,
    MedicalCertificatesModule,
    PatientIntakeModule,
    ClinicalCodingModule,
    CountryProfilesModule,
    BusinessIntelligenceModule,
    InventoryModule,
    NotificationsModule,
    RoomsModule,
    TasksModule,
    ApiKeysModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware, AuditMiddleware)
      .forRoutes('*');
  }
}