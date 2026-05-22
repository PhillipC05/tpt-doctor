// ============================================================================
// TPT Doctor — Country Profiles Service (Phase 11)
// ============================================================================

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';
import { logAuditEvent } from '@tpt-doctor/audit-log';
import { AuditAction } from '@tpt-doctor/shared';

@Injectable()
export class CountryProfilesService {
  // ======================================================================
  // Country Profile Configuration
  // ======================================================================

  private readonly defaultProfiles: Record<string, any> = {
    // Oceania
    AU: {
      countryCode: 'AU',
      countryName: 'Australia',
      diagnosisSystem: 'ICD10_AM',
      currency: 'AUD',
      dateFormat: 'dd/MM/yyyy',
      phoneFormat: '+61 X XXXX XXXX',
      postalCodeFormat: 'XXXX',
      defaultLanguage: 'en',
      timezone: 'Australia/Sydney',
      regulatoryBody: 'Australian Digital Health Agency',
      privacyAct: 'Privacy Act 1988 (Cth)',
    },
    NZ: {
      countryCode: 'NZ',
      countryName: 'New Zealand',
      diagnosisSystem: 'ICD10_AM',
      currency: 'NZD',
      dateFormat: 'dd/MM/yyyy',
      phoneFormat: '+64 X XXX XXXX',
      postalCodeFormat: 'XXXX',
      defaultLanguage: 'en',
      timezone: 'Pacific/Auckland',
      regulatoryBody: 'Ministry of Health / Manatū Hauora',
      privacyAct: 'Privacy Act 2020',
    },
    // North America
    US: {
      countryCode: 'US',
      countryName: 'United States',
      diagnosisSystem: 'ICD10',
      currency: 'USD',
      dateFormat: 'MM/dd/yyyy',
      phoneFormat: '+1 XXX-XXX-XXXX',
      postalCodeFormat: 'XXXXX-XXXX',
      defaultLanguage: 'en',
      timezone: 'America/New_York',
      regulatoryBody: 'HHS / OCR',
      privacyAct: 'HIPAA',
    },
    CA: {
      countryCode: 'CA',
      countryName: 'Canada',
      diagnosisSystem: 'ICD10_CA',
      currency: 'CAD',
      dateFormat: 'yyyy-MM-dd',
      phoneFormat: '+1 XXX-XXX-XXXX',
      postalCodeFormat: 'X#X #X#',
      defaultLanguage: 'en',
      timezone: 'America/Toronto',
      regulatoryBody: 'Canada Health Infoway',
      privacyAct: 'PIPEDA / Provincial Health Privacy Laws',
    },
    // Europe
    UK: {
      countryCode: 'UK',
      countryName: 'United Kingdom',
      diagnosisSystem: 'SNOMED_CT',
      currency: 'GBP',
      dateFormat: 'dd/MM/yyyy',
      phoneFormat: '+44 XXXX XXXXXX',
      postalCodeFormat: 'XX XX XXX',
      defaultLanguage: 'en',
      timezone: 'Europe/London',
      regulatoryBody: 'NHS Digital',
      privacyAct: 'Data Protection Act 2018 / UK GDPR',
    },
    DE: {
      countryCode: 'DE',
      countryName: 'Germany',
      diagnosisSystem: 'ICD10',
      currency: 'EUR',
      dateFormat: 'dd.MM.yyyy',
      phoneFormat: '+49 XXX XXXXXXX',
      postalCodeFormat: 'XXXXX',
      defaultLanguage: 'de',
      timezone: 'Europe/Berlin',
      regulatoryBody: 'Bundesministerium für Gesundheit (BMG) / gematik',
      privacyAct: 'Bundesdatenschutzgesetz (BDSG) / EU GDPR',
    },
    FR: {
      countryCode: 'FR',
      countryName: 'France',
      diagnosisSystem: 'ICD10',
      currency: 'EUR',
      dateFormat: 'dd/MM/yyyy',
      phoneFormat: '+33 X XX XX XX XX',
      postalCodeFormat: 'XXXXX',
      defaultLanguage: 'fr',
      timezone: 'Europe/Paris',
      regulatoryBody: 'Ministère de la Santé / ANS (Agence du Numérique en Santé)',
      privacyAct: 'Loi Informatique et Libertés / EU GDPR',
    },
    NL: {
      countryCode: 'NL',
      countryName: 'Netherlands',
      diagnosisSystem: 'ICD10',
      currency: 'EUR',
      dateFormat: 'dd-MM-yyyy',
      phoneFormat: '+31 X XXXXXXXX',
      postalCodeFormat: 'XXXX XX',
      defaultLanguage: 'nl',
      timezone: 'Europe/Amsterdam',
      regulatoryBody: 'Ministerie van Volksgezondheid (VWS) / Nictiz',
      privacyAct: 'Algemene Verordening Gegevensbescherming (AVG) / EU GDPR',
    },
    // Scandanavia
    SE: {
      countryCode: 'SE',
      countryName: 'Sweden',
      diagnosisSystem: 'ICD10',
      currency: 'SEK',
      dateFormat: 'yyyy-MM-dd',
      phoneFormat: '+46 XX XXX XXXX',
      postalCodeFormat: 'XXX XX',
      defaultLanguage: 'sv',
      timezone: 'Europe/Stockholm',
      regulatoryBody: 'Socialstyrelsen / E-hälsomyndigheten',
      privacyAct: 'Patientdatalag (PDL) / EU GDPR',
    },
    DK: {
      countryCode: 'DK',
      countryName: 'Denmark',
      diagnosisSystem: 'ICD10',
      currency: 'DKK',
      dateFormat: 'dd-MM-yyyy',
      phoneFormat: '+45 XX XX XX XX',
      postalCodeFormat: 'XXXX',
      defaultLanguage: 'da',
      timezone: 'Europe/Copenhagen',
      regulatoryBody: 'Sundhedsdatastyrelsen',
      privacyAct: 'Databeskyttelsesforordningen / EU GDPR',
    },
    NO: {
      countryCode: 'NO',
      countryName: 'Norway',
      diagnosisSystem: 'ICD10',
      currency: 'NOK',
      dateFormat: 'dd.MM.yyyy',
      phoneFormat: '+47 XXX XX XXX',
      postalCodeFormat: 'XXXX',
      defaultLanguage: 'no',
      timezone: 'Europe/Oslo',
      regulatoryBody: 'Helsedirektoratet / Norsk Helsenett',
      privacyAct: 'Personopplysningsloven / EU GDPR',
    },
    // SE Asia
    SG: {
      countryCode: 'SG',
      countryName: 'Singapore',
      diagnosisSystem: 'ICD10',
      currency: 'SGD',
      dateFormat: 'dd/MM/yyyy',
      phoneFormat: '+65 XXXX XXXX',
      postalCodeFormat: 'XXXXXX',
      defaultLanguage: 'en',
      timezone: 'Asia/Singapore',
      regulatoryBody: 'Ministry of Health (MOH) / IHiS (Integrated Health Information Systems)',
      privacyAct: 'Personal Data Protection Act (PDPA) 2012',
    },
    MY: {
      countryCode: 'MY',
      countryName: 'Malaysia',
      diagnosisSystem: 'ICD10',
      currency: 'MYR',
      dateFormat: 'dd/MM/yyyy',
      phoneFormat: '+60 XX-XXX XXXX',
      postalCodeFormat: 'XXXXX',
      defaultLanguage: 'ms',
      timezone: 'Asia/Kuala_Lumpur',
      regulatoryBody: 'Ministry of Health Malaysia (KKM)',
      privacyAct: 'Personal Data Protection Act (PDPA) 2010',
    },
    ID: {
      countryCode: 'ID',
      countryName: 'Indonesia',
      diagnosisSystem: 'ICD10',
      currency: 'IDR',
      dateFormat: 'dd/MM/yyyy',
      phoneFormat: '+62 XXX XXXXXXX',
      postalCodeFormat: 'XXXXX',
      defaultLanguage: 'id',
      timezone: 'Asia/Jakarta',
      regulatoryBody: 'Kementerian Kesehatan RI (Kemenkes)',
      privacyAct: 'Undang-Undang Perlindungan Data Pribadi (UU PDP)',
    },
    TH: {
      countryCode: 'TH',
      countryName: 'Thailand',
      diagnosisSystem: 'ICD10',
      currency: 'THB',
      dateFormat: 'dd/MM/yyyy',
      phoneFormat: '+66 XX XXX XXXX',
      postalCodeFormat: 'XXXXX',
      defaultLanguage: 'th',
      timezone: 'Asia/Bangkok',
      regulatoryBody: 'Ministry of Public Health (MOPH)',
      privacyAct: 'Personal Data Protection Act (PDPA) 2019',
    },
    PH: {
      countryCode: 'PH',
      countryName: 'Philippines',
      diagnosisSystem: 'ICD10',
      currency: 'PHP',
      dateFormat: 'MM/dd/yyyy',
      phoneFormat: '+63 XX XXX XXXX',
      postalCodeFormat: 'XXXX',
      defaultLanguage: 'en',
      timezone: 'Asia/Manila',
      regulatoryBody: 'Department of Health (DOH)',
      privacyAct: 'Data Privacy Act 2012 (RA 10173)',
    },
    IE: {
      countryCode: 'IE',
      countryName: 'Ireland',
      diagnosisSystem: 'ICD10',
      currency: 'EUR',
      dateFormat: 'dd/MM/yyyy',
      phoneFormat: '+353 XX XXX XXXX',
      postalCodeFormat: 'XXX XXXX',
      defaultLanguage: 'en',
      timezone: 'Europe/Dublin',
      regulatoryBody: 'Health Service Executive (HSE)',
      privacyAct: 'Data Protection Acts / EU GDPR',
    },
    CH: {
      countryCode: 'CH',
      countryName: 'Switzerland',
      diagnosisSystem: 'ICD10',
      currency: 'CHF',
      dateFormat: 'dd.MM.yyyy',
      phoneFormat: '+41 XX XXX XX XX',
      postalCodeFormat: 'XXXX',
      defaultLanguage: 'de',
      timezone: 'Europe/Zurich',
      regulatoryBody: 'Bundesamt für Gesundheit (BAG)',
      privacyAct: 'Bundesgesetz über den Datenschutz (DSG)',
    },
    AT: {
      countryCode: 'AT',
      countryName: 'Austria',
      diagnosisSystem: 'ICD10',
      currency: 'EUR',
      dateFormat: 'dd.MM.yyyy',
      phoneFormat: '+43 XXX XXXXXXX',
      postalCodeFormat: 'XXXX',
      defaultLanguage: 'de',
      timezone: 'Europe/Vienna',
      regulatoryBody: 'Bundesministerium für Soziales, Gesundheit (BMSGPK)',
      privacyAct: 'Datenschutzgesetz (DSG) / EU GDPR',
    },
    BE: {
      countryCode: 'BE',
      countryName: 'Belgium',
      diagnosisSystem: 'ICD10',
      currency: 'EUR',
      dateFormat: 'dd/MM/yyyy',
      phoneFormat: '+32 XX XXX XX XX',
      postalCodeFormat: 'XXXX',
      defaultLanguage: 'nl',
      timezone: 'Europe/Brussels',
      regulatoryBody: 'FOD Volksgezondheid / SPF Santé Publique',
      privacyAct: 'Wet Bescherming Persoonsgegevens / EU GDPR',
    },
  };

  private readonly defaultModules: Record<string, any[]> = {
    AU: [
      { moduleName: 'mbs-claiming', isEnabled: true, config: {} },
      { moduleName: 'pbs-prescribing', isEnabled: true, config: {} },
      { moduleName: 'my-health-record', isEnabled: true, config: {} },
      { moduleName: 'air', isEnabled: true, config: {} },
      { moduleName: 'pip-reporting', isEnabled: true, config: {} },
      { moduleName: 'gpmp', isEnabled: true, config: {} },
      { moduleName: 'tca', isEnabled: true, config: {} },
      { moduleName: 'mhtp', isEnabled: true, config: {} },
      { moduleName: 'health-assessments', isEnabled: true, config: {} },
      { moduleName: 'medicare-online', isEnabled: true, config: {} },
    ],
    NZ: [
      { moduleName: 'moh-claiming', isEnabled: true, config: {} },
      { moduleName: 'pho-reporting', isEnabled: true, config: {} },
      { moduleName: 'cir-immunisations', isEnabled: true, config: {} },
      { moduleName: 'nhi-validation', isEnabled: true, config: {} },
      { moduleName: 'community-pharmacy-card', isEnabled: true, config: {} },
    ],
    UK: [
      { moduleName: 'gp2gp-transfer', isEnabled: true, config: {} },
      { moduleName: 'qof-reporting', isEnabled: true, config: {} },
      { moduleName: 'gp-connect', isEnabled: true, config: {} },
      { moduleName: 'spine-pds-scr', isEnabled: true, config: {} },
      { moduleName: 'eps-prescribing', isEnabled: true, config: {} },
    ],
    CA: [
      { moduleName: 'provincial-claiming', isEnabled: true, config: {} },
      { moduleName: 'infoway-ehr', isEnabled: true, config: {} },
      { moduleName: 'drug-database-lookup', isEnabled: true, config: {} },
      { moduleName: 'immunisation-registry', isEnabled: true, config: {} },
    ],
    // --- Germany (EU framework leader) ---
    DE: [
      { moduleName: 'gematik-telematik', isEnabled: true, config: {} },
      { moduleName: 'e-Rezept', isEnabled: true, config: {} },
      { moduleName: 'eAU-elektronische-krankschreibung', isEnabled: true, config: {} },
      { moduleName: 'e-Patientenakte', isEnabled: true, config: {} },
      { moduleName: 'kbv-abrechnung', isEnabled: true, config: {} },
    ],
    // --- France ---
    FR: [
      { moduleName: 'sesam-vitale', isEnabled: true, config: {} },
      { moduleName: 'dmp-dossier-medical', isEnabled: true, config: {} },
      { moduleName: 'e-prescription-fr', isEnabled: true, config: {} },
      { moduleName: 'ameli-claiming', isEnabled: true, config: {} },
    ],
    // --- Netherlands ---
    NL: [
      { moduleName: 'edifact-claiming', isEnabled: true, config: {} },
      { moduleName: 'epd-exchange', isEnabled: true, config: {} },
      { moduleName: 'medicijnkast', isEnabled: true, config: {} },
      { moduleName: 'zorgverzekering-verificatie', isEnabled: true, config: {} },
    ],
    // --- Singapore (SE Asia leader) ---
    SG: [
      { moduleName: 'nehr-national-ehr', isEnabled: true, config: {} },
      { moduleName: 'medishield-claiming', isEnabled: true, config: {} },
      { moduleName: 'healthhub-integration', isEnabled: true, config: {} },
      { moduleName: 'pharmacy-integration-sg', isEnabled: true, config: {} },
    ],
    // --- Malaysia ---
    MY: [
      { moduleName: 'myhealth-portal', isEnabled: true, config: {} },
      { moduleName: 'sokongan-kesihatan', isEnabled: true, config: {} },
      { moduleName: 'farmasi-integration', isEnabled: true, config: {} },
    ],
  };

  async getDefaultProfile(countryCode: string) {
    const profile = this.defaultProfiles[countryCode];
    if (!profile) throw new NotFoundException(`Unknown country code: ${countryCode}`);
    return {
      ...profile,
      modules: this.defaultModules[countryCode] || [],
      dataRegion: countryCode === 'UK' ? 'EU' : countryCode,
    };
  }

  async configureProfile(data: any, tenantId: string, userId: string) {
    const existing = await prisma.countryProfileConfig.findFirst({
      where: { tenantId, countryCode: data.countryCode },
    });

    if (existing) {
      const updated = await prisma.countryProfileConfig.update({
        where: { id: existing.id },
        data: {
          countryName: data.countryName ?? existing.countryName,
          diagnosisSystem: data.diagnosisSystem ?? existing.diagnosisSystem,
          currency: data.currency ?? existing.currency,
          dateFormat: data.dateFormat ?? existing.dateFormat,
          phoneFormat: data.phoneFormat ?? existing.phoneFormat,
          postalCodeFormat: data.postalCodeFormat ?? existing.postalCodeFormat,
          defaultLanguage: data.defaultLanguage ?? existing.defaultLanguage,
          timezone: data.timezone ?? existing.timezone,
          regulatoryBody: data.regulatoryBody ?? existing.regulatoryBody,
          privacyAct: data.privacyAct ?? existing.privacyAct,
          dataRegion: data.dataRegion ?? existing.dataRegion,
          modules: data.modules ?? existing.modules,
          isActive: data.isActive ?? existing.isActive,
        },
      });
      await logAuditEvent({ tenantId, userId, action: AuditAction.UPDATE, resource: 'CountryProfileConfig', resourceId: updated.id, details: { countryCode: data.countryCode }, ipAddress: '0.0.0.0' });
      return updated;
    }

    const profile = await prisma.countryProfileConfig.create({
      data: {
        tenantId,
        countryCode: data.countryCode,
        countryName: data.countryName,
        diagnosisSystem: data.diagnosisSystem,
        currency: data.currency,
        dateFormat: data.dateFormat,
        phoneFormat: data.phoneFormat || null,
        postalCodeFormat: data.postalCodeFormat || null,
        defaultLanguage: data.defaultLanguage || 'en',
        timezone: data.timezone,
        regulatoryBody: data.regulatoryBody || null,
        privacyAct: data.privacyAct || null,
        dataRegion: data.dataRegion || data.countryCode,
        modules: data.modules || [],
        isActive: data.isActive ?? true,
      },
    });

    await logAuditEvent({ tenantId, userId, action: AuditAction.CREATE, resource: 'CountryProfileConfig', resourceId: profile.id, details: { countryCode: data.countryCode }, ipAddress: '0.0.0.0' });
    return profile;
  }

  async getProfile(tenantId: string, countryCode: string) {
    const profile = await prisma.countryProfileConfig.findFirst({
      where: { tenantId, countryCode, isActive: true },
    });
    if (!profile) {
      return this.getDefaultProfile(countryCode);
    }
    return profile;
  }

  async getAllProfiles(tenantId: string) {
    return prisma.countryProfileConfig.findMany({
      where: { tenantId },
      orderBy: { countryCode: 'asc' },
    });
  }

  async deleteProfile(id: string, tenantId: string, userId: string) {
    const profile = await prisma.countryProfileConfig.findFirst({ where: { id, tenantId } });
    if (!profile) throw new NotFoundException('Profile not found');

    await prisma.countryProfileConfig.delete({ where: { id } });
    await logAuditEvent({ tenantId, userId, action: AuditAction.DELETE, resource: 'CountryProfileConfig', resourceId: id, details: { countryCode: profile.countryCode }, ipAddress: '0.0.0.0' });
    return { deleted: true };
  }
}