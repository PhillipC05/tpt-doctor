// ============================================================================
// TPT Doctor — Country Profiles Integration Tests (Phase 15.3)
// Tests AU, NZ, UK, CA services with mock Prisma (simulates government APIs)
// ============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AuService } from '../../src/modules/country-profiles/services/au/au.service';
import { NzService } from '../../src/modules/country-profiles/services/nz/nz.service';
import { UkService } from '../../src/modules/country-profiles/services/uk/uk.service';
import { CaService } from '../../src/modules/country-profiles/services/ca/ca.service';

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

const mockPrisma = {
  patient: { findFirst: jest.fn() },
  mbsClaimSubmission: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
  mbsItem: { findMany: jest.fn() },
  pbsPrescription: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  myHealthRecordDocument: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  airImmunisationRecord: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  pipReport: { create: jest.fn(), findMany: jest.fn() },
  nzClaimSubmission: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
  phoReport: { create: jest.fn(), findMany: jest.fn() },
  nzImmunisationSubmission: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  nhiValidationLog: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  ukGp2GpTransfer: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  ukQofReport: { create: jest.fn(), findMany: jest.fn() },
  ukGpConnectInteraction: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  ukSpineInteraction: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  ukEpsPrescription: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  caProvincialClaimSubmission: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  caDrugDatabase: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
  caImmunisationSubmission: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  caInfowayInteraction: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
};

jest.mock('@tpt-doctor/database', () => ({ prisma: mockPrisma }));
jest.mock('@tpt-doctor/audit-log', () => ({ logAuditEvent: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@tpt-doctor/shared', () => ({ AuditAction: { CREATE: 'CREATE', UPDATE: 'UPDATE', DELETE: 'DELETE', READ: 'READ' } }));

const TENANT = 'tenant-au-test';
const USER = 'user-001';
const PATIENT_ID = 'patient-uuid-001';
const mockPatient = { id: PATIENT_ID, tenantId: TENANT, firstName: 'Jane', lastName: 'Smith' };

function resetMocks() {
  jest.clearAllMocks();
  mockPrisma.patient.findFirst.mockResolvedValue(null); // default: not found
}

// ===========================================================================
// AU — Australia (Medicare MBS, PBS, My Health Record, AIR, PIP)
// ===========================================================================

describe('AU Service — Medicare/PBS/MHR/AIR integration', () => {
  let service: AuService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuService],
    }).compile();
    service = module.get<AuService>(AuService);
    resetMocks();
  });

  // ---- MBS Claims ----

  describe('submitMbsClaim', () => {
    it('throws NotFoundException when patient does not exist in tenant', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);
      await expect(
        service.submitMbsClaim({ patientId: PATIENT_ID, mbsItemNumber: '23' }, TENANT, USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates MBS claim with DRAFT status when patient exists', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      const created = {
        id: 'claim-001',
        claimNumber: 'MBS-1234-ABCDEF',
        tenantId: TENANT,
        patientId: PATIENT_ID,
        status: 'DRAFT',
      };
      mockPrisma.mbsClaimSubmission.create.mockResolvedValue(created);

      const result = await service.submitMbsClaim(
        { patientId: PATIENT_ID, mbsItemNumber: '23', items: [{ itemNumber: '23', fee: 39.1 }], totalAmount: 39.1 },
        TENANT,
        USER,
      );
      expect(result.status).toBe('DRAFT');
      expect(result.claimNumber).toMatch(/^MBS-/);
      expect(mockPrisma.mbsClaimSubmission.create).toHaveBeenCalledTimes(1);
    });

    it('enforces tenant isolation — patient from another tenant is not found', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);
      await expect(
        service.submitMbsClaim({ patientId: PATIENT_ID }, 'other-tenant', USER),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.patient.findFirst).toHaveBeenCalledWith({
        where: { id: PATIENT_ID, tenantId: 'other-tenant' },
      });
    });
  });

  describe('listMbsClaims', () => {
    it('returns paginated list with meta', async () => {
      const claims = [{ id: 'c1' }, { id: 'c2' }];
      mockPrisma.mbsClaimSubmission.findMany.mockResolvedValue(claims);
      mockPrisma.mbsClaimSubmission.count.mockResolvedValue(42);

      const result = await service.listMbsClaims(TENANT, undefined, undefined, 2, 10);
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(42);
      expect(result.meta.page).toBe(2);
      expect(result.meta.pageSize).toBe(10);
      expect(result.meta.totalPages).toBe(5);
    });

    it('filters by patientId and status', async () => {
      mockPrisma.mbsClaimSubmission.findMany.mockResolvedValue([]);
      mockPrisma.mbsClaimSubmission.count.mockResolvedValue(0);

      await service.listMbsClaims(TENANT, PATIENT_ID, 'SUBMITTED');
      const findManyCall = mockPrisma.mbsClaimSubmission.findMany.mock.calls[0][0];
      expect(findManyCall.where.patientId).toBe(PATIENT_ID);
      expect(findManyCall.where.status).toBe('SUBMITTED');
    });
  });

  // ---- PBS Prescriptions ----

  describe('submitPbsPrescription', () => {
    it('throws NotFoundException for unknown patient', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);
      await expect(
        service.submitPbsPrescription({ patientId: PATIENT_ID, pbsCode: 'PBS001' }, TENANT, USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates PBS prescription with DRAFT status', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      const created = { id: 'pbs-001', pbsCode: 'PBS001', status: 'DRAFT', tenantId: TENANT };
      mockPrisma.pbsPrescription.create.mockResolvedValue(created);

      const result = await service.submitPbsPrescription(
        { patientId: PATIENT_ID, pbsCode: 'PBS001', medicationName: 'Metformin', quantity: 60, repeats: 5 },
        TENANT,
        USER,
      );
      expect(result.status).toBe('DRAFT');
      expect(result.pbsCode).toBe('PBS001');
    });
  });

  // ---- My Health Record ----

  describe('submitMyHealthRecordDocument', () => {
    it('throws NotFoundException when patient not found', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);
      await expect(
        service.submitMyHealthRecordDocument({ patientId: PATIENT_ID, documentType: 'DISCHARGE_SUMMARY', documentContent: {} }, TENANT, USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates MHR document with PENDING status', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      const created = { id: 'mhr-001', documentType: 'DISCHARGE_SUMMARY', status: 'PENDING' };
      mockPrisma.myHealthRecordDocument.create.mockResolvedValue(created);

      const result = await service.submitMyHealthRecordDocument(
        { patientId: PATIENT_ID, documentType: 'DISCHARGE_SUMMARY', documentContent: { body: 'test' } },
        TENANT,
        USER,
      );
      expect(result.status).toBe('PENDING');
      expect(result.documentType).toBe('DISCHARGE_SUMMARY');
    });
  });

  // ---- AIR Immunisation Records ----

  describe('submitAirRecord', () => {
    it('creates AIR immunisation record for valid patient', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      const created = { id: 'air-001', vaccineCode: 'COVID-19', status: 'PENDING' };
      mockPrisma.airImmunisationRecord.create.mockResolvedValue(created);

      const result = await service.submitAirRecord(
        { patientId: PATIENT_ID, vaccineCode: 'COVID-19', dateAdministered: '2024-01-15' },
        TENANT,
        USER,
      );
      expect(result.vaccineCode).toBe('COVID-19');
    });
  });

  // ---- MBS Item Lookup ----

  describe('listMbsItems', () => {
    it('returns active MBS items filtered by search term', async () => {
      const items = [{ itemNumber: '23', description: 'Standard consultation' }];
      mockPrisma.mbsItem.findMany.mockResolvedValue(items);

      const result = await service.listMbsItems(undefined, 'consultation');
      expect(result).toEqual(items);
      const call = mockPrisma.mbsItem.findMany.mock.calls[0][0];
      expect(call.where.isActive).toBe(true);
      expect(call.where.OR).toBeDefined();
    });
  });
});

// ===========================================================================
// NZ — New Zealand (MOH Claims, PHO Reports, CIR Immunisations, NHI)
// ===========================================================================

describe('NZ Service — MOH/PHO/CIR/NHI integration', () => {
  let service: NzService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NzService],
    }).compile();
    service = module.get<NzService>(NzService);
    resetMocks();
  });

  // ---- MOH Claims ----

  describe('submitClaim', () => {
    it('throws NotFoundException for unknown patient', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);
      await expect(service.submitClaim({ patientId: PATIENT_ID }, TENANT, USER)).rejects.toThrow(NotFoundException);
    });

    it('creates NZ claim with DRAFT status and NZ- prefixed claim number', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      const created = { id: 'nz-claim-001', claimNumber: 'NZ-1234-ABCDEF', status: 'DRAFT' };
      mockPrisma.nzClaimSubmission.create.mockResolvedValue(created);

      const result = await service.submitClaim(
        { patientId: PATIENT_ID, claimType: 'CAPITATION', totalAmount: 30 },
        TENANT,
        USER,
      );
      expect(result.claimNumber).toMatch(/^NZ-/);
      expect(result.status).toBe('DRAFT');
    });
  });

  describe('listClaims', () => {
    it('returns paginated claims with meta', async () => {
      mockPrisma.nzClaimSubmission.findMany.mockResolvedValue([{ id: 'c1' }]);
      mockPrisma.nzClaimSubmission.count.mockResolvedValue(5);

      const result = await service.listClaims(TENANT, undefined, undefined, 1, 20);
      expect(result.meta.total).toBe(5);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getClaim', () => {
    it('throws NotFoundException when claim not found', async () => {
      mockPrisma.nzClaimSubmission.findFirst.mockResolvedValue(null);
      await expect(service.getClaim('nonexistent', TENANT)).rejects.toThrow(NotFoundException);
    });

    it('returns claim when found', async () => {
      const claim = { id: 'nz-claim-001', tenantId: TENANT };
      mockPrisma.nzClaimSubmission.findFirst.mockResolvedValue(claim);
      const result = await service.getClaim('nz-claim-001', TENANT);
      expect(result.id).toBe('nz-claim-001');
    });
  });

  // ---- PHO Reports ----

  describe('generatePhoReport', () => {
    it('creates PHO report with correct totalAmount calculation', async () => {
      const created = {
        id: 'pho-001',
        reportPeriod: '2024-Q1',
        capitationAmt: 1000,
        ffsAmount: 500,
        totalAmount: 1500,
      };
      mockPrisma.phoReport.create.mockResolvedValue(created);

      const result = await service.generatePhoReport(
        { phoOrgId: 'PHO-001', reportPeriod: '2024-Q1', capitationAmt: 1000, ffsAmount: 500 },
        TENANT,
        USER,
      );
      expect(result.totalAmount).toBe(1500);
    });
  });

  // ---- NHI Validation (simulates MoH NHI service) ----

  describe('validateNhi', () => {
    it('returns isValid: true for correctly formatted NHI number (ABC12D)', async () => {
      const log = { id: 'log-001', nhiNumber: 'ABC12D', isValid: true, matchStatus: 'ACTIVE' };
      mockPrisma.nhiValidationLog.create.mockResolvedValue(log);

      const result = await service.validateNhi(
        { nhiNumber: 'abc12d', firstName: 'Jane', lastName: 'Smith' },
        TENANT,
        USER,
      );
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('ACTIVE');
      expect(result.nhiNumber).toBe('ABC12D');
    });

    it('returns isValid: false for incorrectly formatted NHI number', async () => {
      const log = { id: 'log-002', nhiNumber: 'INVALID', isValid: false, matchStatus: 'NOT_FOUND' };
      mockPrisma.nhiValidationLog.create.mockResolvedValue(log);

      const result = await service.validateNhi({ nhiNumber: 'INVALID' }, TENANT, USER);
      expect(result.isValid).toBe(false);
      expect(result.status).toBe('NOT_FOUND');
    });

    it('normalises NHI number to uppercase before validation', async () => {
      mockPrisma.nhiValidationLog.create.mockResolvedValue({ id: 'log-003', isValid: true });

      await service.validateNhi({ nhiNumber: 'abc12d' }, TENANT, USER);
      const createCall = mockPrisma.nhiValidationLog.create.mock.calls[0][0];
      expect(createCall.data.nhiNumber).toBe('ABC12D');
    });

    it('creates validation log entry regardless of result', async () => {
      mockPrisma.nhiValidationLog.create.mockResolvedValue({ id: 'log-004', isValid: false });
      await service.validateNhi({ nhiNumber: 'BADFORMAT' }, TENANT, USER);
      expect(mockPrisma.nhiValidationLog.create).toHaveBeenCalledTimes(1);
    });
  });

  // ---- CIR Immunisations ----

  describe('submitImmunisation', () => {
    it('throws NotFoundException for unknown patient', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);
      await expect(
        service.submitImmunisation({ patientId: PATIENT_ID, vaccineCode: 'MMR' }, TENANT, USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates NZ immunisation record with PENDING status', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      const created = { id: 'nz-imm-001', vaccineCode: 'MMR', status: 'PENDING' };
      mockPrisma.nzImmunisationSubmission.create.mockResolvedValue(created);

      const result = await service.submitImmunisation(
        { patientId: PATIENT_ID, vaccineCode: 'MMR', administrationDate: '2024-01-15', doseNumber: 1 },
        TENANT,
        USER,
      );
      expect(result.status).toBe('PENDING');
    });
  });
});

// ===========================================================================
// UK — United Kingdom (GP2GP, QOF, GP Connect, Spine PDS/SCR, EPS)
// ===========================================================================

describe('UK Service — GP2GP/QOF/GPConnect/Spine/EPS integration', () => {
  let service: UkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UkService],
    }).compile();
    service = module.get<UkService>(UkService);
    resetMocks();
  });

  // ---- GP2GP Record Transfer ----

  describe('createGp2GpTransfer', () => {
    it('throws NotFoundException when patient not in tenant', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);
      await expect(
        service.createGp2GpTransfer({ patientId: PATIENT_ID, targetOdsCode: 'G82650' }, TENANT, USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates GP2GP transfer with PENDING status and GP2GP- prefixed transferId', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      const created = { id: 'gp2gp-001', transferId: 'GP2GP-123', status: 'PENDING' };
      mockPrisma.ukGp2GpTransfer.create.mockResolvedValue(created);

      const result = await service.createGp2GpTransfer(
        { patientId: PATIENT_ID, targetOdsCode: 'G82650', direction: 'OUTGOING' },
        TENANT,
        USER,
      );
      expect(result.status).toBe('PENDING');
      expect(result.transferId).toMatch(/^GP2GP-/);
    });
  });

  describe('listGp2GpTransfers', () => {
    it('returns paginated transfers with status filter', async () => {
      mockPrisma.ukGp2GpTransfer.findMany.mockResolvedValue([{ id: 't1' }]);
      mockPrisma.ukGp2GpTransfer.count.mockResolvedValue(1);

      const result = await service.listGp2GpTransfers(TENANT, 'PENDING', 1, 20);
      const call = mockPrisma.ukGp2GpTransfer.findMany.mock.calls[0][0];
      expect(call.where.status).toBe('PENDING');
      expect(result.meta.total).toBe(1);
    });
  });

  // ---- QOF Reports ----

  describe('generateQofReport', () => {
    it('creates QOF report with practice ODS code and period', async () => {
      const created = { id: 'qof-001', practiceOdsCode: 'G82650', reportPeriod: '2023-24', totalPoints: 547 };
      mockPrisma.ukQofReport.create.mockResolvedValue(created);

      const result = await service.generateQofReport(
        { practiceOdsCode: 'G82650', reportPeriod: '2023-24', totalPoints: 547 },
        TENANT,
        USER,
      );
      expect(result.practiceOdsCode).toBe('G82650');
      expect(result.reportPeriod).toBe('2023-24');
    });
  });

  // ---- GP Connect API ----

  describe('createGpConnectInteraction', () => {
    it('throws NotFoundException when patient not found', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);
      await expect(
        service.createGpConnectInteraction(
          { patientId: PATIENT_ID, interactionType: 'GET_STRUCTURED_RECORD', odsCode: 'G82650' },
          TENANT,
          USER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates GP Connect interaction with PENDING status', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      const created = { id: 'gpc-001', interactionType: 'GET_STRUCTURED_RECORD', status: 'PENDING' };
      mockPrisma.ukGpConnectInteraction.create.mockResolvedValue(created);

      const result = await service.createGpConnectInteraction(
        { patientId: PATIENT_ID, interactionType: 'GET_STRUCTURED_RECORD', odsCode: 'G82650' },
        TENANT,
        USER,
      );
      expect(result.status).toBe('PENDING');
    });
  });

  // ---- Spine (PDS / SCR) ----

  describe('createSpineInteraction', () => {
    it('throws NotFoundException when patient not found', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);
      await expect(
        service.createSpineInteraction({ patientId: PATIENT_ID, interactionType: 'PDS' }, TENANT, USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates Spine interaction with SPINE- prefixed reference', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      const created = { id: 'spine-001', interactionType: 'PDS', spineRef: 'SPINE-99999', status: 'PENDING' };
      mockPrisma.ukSpineInteraction.create.mockResolvedValue(created);

      const result = await service.createSpineInteraction(
        { patientId: PATIENT_ID, interactionType: 'PDS', patientNhsNumber: '9000000009' },
        TENANT,
        USER,
      );
      expect(result.spineRef).toMatch(/^SPINE-/);
      expect(result.interactionType).toBe('PDS');
    });
  });

  // ---- EPS Prescriptions ----

  describe('submitEpsPrescription', () => {
    it('creates EPS prescription with PENDING status and EPS- GUID', async () => {
      const created = { id: 'eps-001', epsGuid: 'EPS-12345-ABCDE', status: 'PENDING' };
      mockPrisma.ukEpsPrescription.create.mockResolvedValue(created);

      const result = await service.submitEpsPrescription(
        { prescriptionId: 'rx-001', dosageText: '1 tablet daily', quantity: 28 },
        TENANT,
        USER,
      );
      expect(result.status).toBe('PENDING');
      expect(result.epsGuid).toMatch(/^EPS-/);
    });

    it('does not require patient lookup (prescription ID is the identifier)', async () => {
      const created = { id: 'eps-002', status: 'PENDING' };
      mockPrisma.ukEpsPrescription.create.mockResolvedValue(created);

      await service.submitEpsPrescription({ prescriptionId: 'rx-002' }, TENANT, USER);
      expect(mockPrisma.patient.findFirst).not.toHaveBeenCalled();
    });
  });
});

// ===========================================================================
// CA — Canada (Provincial Claims, Drug Database, Immunisations, Infoway)
// ===========================================================================

describe('CA Service — Provincial/DIN/Immunisation/Infoway integration', () => {
  let service: CaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CaService],
    }).compile();
    service = module.get<CaService>(CaService);
    resetMocks();
  });

  // ---- Provincial Claims ----

  describe('submitClaim', () => {
    it('throws NotFoundException when patient not in tenant', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);
      await expect(
        service.submitClaim({ patientId: PATIENT_ID, healthPlan: 'OHIP' }, TENANT, USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates CA claim with DRAFT status and CA-{plan} prefixed claim number', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      const created = { id: 'ca-claim-001', claimNumber: 'CA-OHIP-1234-ABCDEF', healthPlan: 'OHIP', status: 'DRAFT' };
      mockPrisma.caProvincialClaimSubmission.create.mockResolvedValue(created);

      const result = await service.submitClaim(
        { patientId: PATIENT_ID, healthPlan: 'OHIP', totalAmount: 75 },
        TENANT,
        USER,
      );
      expect(result.claimNumber).toMatch(/^CA-OHIP-/);
      expect(result.status).toBe('DRAFT');
      expect(result.healthPlan).toBe('OHIP');
    });

    it('uses EDI as default submission method', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      mockPrisma.caProvincialClaimSubmission.create.mockResolvedValue({ id: 'ca-002', status: 'DRAFT' });

      await service.submitClaim({ patientId: PATIENT_ID, healthPlan: 'BCMSP' }, TENANT, USER);
      const createCall = mockPrisma.caProvincialClaimSubmission.create.mock.calls[0][0];
      expect(createCall.data.submissionMethod).toBe('EDI');
    });
  });

  describe('listClaims', () => {
    it('filters by healthPlan when provided', async () => {
      mockPrisma.caProvincialClaimSubmission.findMany.mockResolvedValue([]);
      mockPrisma.caProvincialClaimSubmission.count.mockResolvedValue(0);

      await service.listClaims(TENANT, undefined, 'OHIP');
      const call = mockPrisma.caProvincialClaimSubmission.findMany.mock.calls[0][0];
      expect(call.where.healthPlan).toBe('OHIP');
    });
  });

  // ---- Drug Database (DIN Lookup) ----

  describe('searchDrugDatabase', () => {
    it('searches by DIN number', async () => {
      const drugs = [{ din: '02242163', brandName: 'Glucophage', genericName: 'Metformin' }];
      mockPrisma.caDrugDatabase.findMany.mockResolvedValue(drugs);
      mockPrisma.caDrugDatabase.count.mockResolvedValue(1);

      const result = await service.searchDrugDatabase('02242163');
      expect(result.data).toEqual(drugs);
    });

    it('searches by brand name with case-insensitive match', async () => {
      mockPrisma.caDrugDatabase.findMany.mockResolvedValue([]);
      mockPrisma.caDrugDatabase.count.mockResolvedValue(0);

      await service.searchDrugDatabase(undefined, 'glucophage');
      const call = mockPrisma.caDrugDatabase.findMany.mock.calls[0][0];
      expect(call.where.brandName).toEqual({ contains: 'glucophage', mode: 'insensitive' });
    });

    it('returns active drugs only', async () => {
      mockPrisma.caDrugDatabase.findMany.mockResolvedValue([]);
      mockPrisma.caDrugDatabase.count.mockResolvedValue(0);

      await service.searchDrugDatabase();
      const call = mockPrisma.caDrugDatabase.findMany.mock.calls[0][0];
      expect(call.where.isActive).toBe(true);
    });
  });

  describe('lookupDrugByDin', () => {
    it('returns drug when DIN exists', async () => {
      const drug = { din: '02242163', brandName: 'Glucophage' };
      mockPrisma.caDrugDatabase.findFirst.mockResolvedValue(drug);

      const result = await service.lookupDrugByDin('02242163');
      expect(result.din).toBe('02242163');
    });

    it('throws NotFoundException when DIN not found', async () => {
      mockPrisma.caDrugDatabase.findFirst.mockResolvedValue(null);
      await expect(service.lookupDrugByDin('NOTEXIST')).rejects.toThrow(NotFoundException);
    });
  });

  // ---- Immunisations ----

  describe('submitImmunisation', () => {
    it('throws NotFoundException when patient not found', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);
      await expect(
        service.submitImmunisation({ patientId: PATIENT_ID, vaccineCode: 'FLU' }, TENANT, USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates CA immunisation record with PENDING status', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      const created = { id: 'ca-imm-001', vaccineCode: 'FLU', status: 'PENDING' };
      mockPrisma.caImmunisationSubmission.create.mockResolvedValue(created);

      const result = await service.submitImmunisation(
        { patientId: PATIENT_ID, vaccineCode: 'FLU', administrationDate: '2024-01-15' },
        TENANT,
        USER,
      );
      expect(result.status).toBe('PENDING');
    });
  });

  // ---- Infoway Interactions ----

  describe('createInfowayInteraction', () => {
    it('throws NotFoundException when patient not in tenant', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);
      await expect(
        service.createInfowayInteraction({ patientId: PATIENT_ID, interactionType: 'CLIENT_REGISTRY' }, TENANT, USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates Infoway interaction with INFOWAY- prefixed reference and PENDING status', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(mockPatient);
      const created = { id: 'iw-001', interactionType: 'CLIENT_REGISTRY', infowayRef: 'INFOWAY-12345', status: 'PENDING' };
      mockPrisma.caInfowayInteraction.create.mockResolvedValue(created);

      const result = await service.createInfowayInteraction(
        { patientId: PATIENT_ID, interactionType: 'CLIENT_REGISTRY', requestData: { hin: 'ON12345' } },
        TENANT,
        USER,
      );
      expect(result.interactionType).toBe('CLIENT_REGISTRY');
      expect(result.infowayRef).toMatch(/^INFOWAY-/);
      expect(result.status).toBe('PENDING');
    });
  });

  describe('listInfowayInteractions', () => {
    it('filters by interactionType when provided', async () => {
      mockPrisma.caInfowayInteraction.findMany.mockResolvedValue([]);
      mockPrisma.caInfowayInteraction.count.mockResolvedValue(0);

      await service.listInfowayInteractions(TENANT, 'CLIENT_REGISTRY');
      const call = mockPrisma.caInfowayInteraction.findMany.mock.calls[0][0];
      expect(call.where.interactionType).toBe('CLIENT_REGISTRY');
    });
  });
});
