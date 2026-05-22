// ============================================================================
// TPT Doctor — Business Intelligence Service Unit Tests
// ============================================================================

import { BusinessIntelligenceService } from '../business-intelligence.service';

// Mock prisma
const mockPrisma = {
  invoice: {
    findMany: jest.fn(),
  },
  appointment: {
    findMany: jest.fn(),
  },
  staffMember: {
    findMany: jest.fn(),
  },
  patient: {
    findMany: jest.fn(),
  },
  referral: {
    findMany: jest.fn(),
  },
  savedReport: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  reportExecutionLog: {
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@tpt-doctor/database', () => ({
  prisma: mockPrisma,
}));

describe('BusinessIntelligenceService', () => {
  let service: BusinessIntelligenceService;

  beforeEach(() => {
    service = new BusinessIntelligenceService();
    jest.clearAllMocks();
  });

  describe('getRevenueAnalytics', () => {
    it('should calculate revenue metrics correctly', async () => {
      const mockInvoices = [
        {
          id: '1',
          total: '1000',
          amountPaid: '800',
          balanceDue: '200',
          createdAt: new Date('2024-01-15'),
          items: [{ cptCode: '99213', description: 'Office Visit', total: 500, amount: 500 }],
          payments: [{ amount: 800 }],
          patient: { insurance: [{ insuranceType: 'PRIVATE', isPrimary: true }] },
        },
        {
          id: '2',
          total: '500',
          amountPaid: '500',
          balanceDue: '0',
          createdAt: new Date('2024-01-20'),
          items: [{ cptCode: '99214', description: 'Consultation', total: 500, amount: 500 }],
          payments: [{ amount: 500 }],
          patient: { insurance: [{ insuranceType: 'MEDICARE', isPrimary: true }] },
        },
      ];

      mockPrisma.invoice.findMany.mockResolvedValue(mockInvoices);

      const result = await service.getRevenueAnalytics('tenant-1', '2024-01-01', '2024-01-31');

      expect(result.totalBilled).toBe(1500);
      expect(result.totalCollected).toBe(1300);
      expect(result.totalOutstanding).toBe(200);
      expect(result.netRevenue).toBe(1100);
      expect(result.collectionRate).toBeCloseTo(86.67, 1);
      expect(result.payerMix).toHaveLength(2);
      expect(result.procedureRevenue).toHaveLength(2);
    });

    it('should handle empty period', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      const result = await service.getRevenueAnalytics('tenant-1', '2024-01-01', '2024-01-31');
      expect(result.totalBilled).toBe(0);
      expect(result.totalCollected).toBe(0);
      expect(result.collectionRate).toBe(0);
    });
  });

  describe('getAppointmentUtilization', () => {
    it('should compute fill rates correctly', async () => {
      const mockAppointments = [
        { id: '1', startTime: new Date('2024-01-15T09:00:00'), endTime: new Date('2024-01-15T09:30:00'), status: 'COMPLETED', staffId: 's1', staff: { id: 's1', title: 'Dr.', user: { firstName: 'John', lastName: 'Doe' } } },
        { id: '2', startTime: new Date('2024-01-15T10:00:00'), endTime: new Date('2024-01-15T10:30:00'), status: 'NO_SHOW', staffId: 's1', staff: { id: 's1', title: 'Dr.', user: { firstName: 'John', lastName: 'Doe' } } },
        { id: '3', startTime: new Date('2024-01-15T11:00:00'), endTime: new Date('2024-01-15T11:30:00'), status: 'CANCELLED', staffId: 's2', staff: { id: 's2', title: 'Nurse', user: { firstName: 'Jane', lastName: 'Smith' } } },
      ];

      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);

      const result = await service.getAppointmentUtilization('tenant-1', '2024-01-01', '2024-01-31');

      expect(result.totalSlots).toBe(3);
      expect(result.filledSlots).toBe(1);
      expect(result.fillRate).toBeCloseTo(33.33, 1);
      expect(result.noShowSlots).toBe(1);
      expect(result.cancelledSlots).toBe(1);
    });

    it('should handle no appointments', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      const result = await service.getAppointmentUtilization('tenant-1', '2024-01-01', '2024-01-31');
      expect(result.totalSlots).toBe(0);
      expect(result.fillRate).toBe(0);
    });
  });

  describe('getClinicianProductivity', () => {
    it('should return productivity metrics per clinician', async () => {
      const mockStaff = [
        {
          id: 's1',
          title: 'Dr.',
          isActive: true,
          user: { firstName: 'John', lastName: 'Doe' },
          encounters: [
            { encounterType: 'OFFICE_VISIT', date: new Date('2024-01-15') },
            { encounterType: 'TELEMEDICINE', date: new Date('2024-01-16') },
          ],
          appointments: [
            { status: 'COMPLETED', startTime: new Date('2024-01-15T09:00'), endTime: new Date('2024-01-15T09:30') },
          ],
        },
      ];

      mockPrisma.staffMember.findMany.mockResolvedValue(mockStaff);

      const result = await service.getClinicianProductivity('tenant-1', '2024-01-01', '2024-01-31');
      expect(result).toHaveLength(1);
      expect(result[0]!.totalEncounters).toBe(2);
      expect(result[0]!.telemedicineEncounters).toBe(1);
      expect(result[0]!.totalAppointments).toBe(1);
    });
  });

  describe('getPatientDemographics', () => {
    it('should aggregate demographics correctly', async () => {
      const mockPatients = [
        { id: '1', gender: 'MALE', dateOfBirth: new Date('1990-01-01'), isActive: true, medicalConditions: [{ code: 'E10', description: 'Type 1 Diabetes', isChronic: true }], insurance: [{ insuranceType: 'PRIVATE', isPrimary: true }] },
        { id: '2', gender: 'FEMALE', dateOfBirth: new Date('1985-06-15'), isActive: true, medicalConditions: [{ code: 'I10', description: 'Hypertension', isChronic: true }], insurance: [{ insuranceType: 'MEDICARE', isPrimary: true }] },
        { id: '3', gender: 'MALE', dateOfBirth: new Date('1950-03-20'), isActive: true, medicalConditions: [], insurance: [] },
      ];

      mockPrisma.patient.findMany.mockResolvedValue(mockPatients);

      const result = await service.getPatientDemographics('tenant-1');

      expect(result.totalPatients).toBe(3);
      expect(result.byGender['MALE']).toBe(2);
      expect(result.byGender['FEMALE']).toBe(1);
      expect(result.topChronicConditions).toHaveLength(2);
    });
  });

  describe('getReferralAnalytics', () => {
    it('should calculate referral metrics', async () => {
      const mockReferrals = [
        { id: '1', status: 'SENT', specialty: 'CARDIOLOGY', createdAt: new Date('2024-01-10'), bookedAt: null, referringStaff: { id: 's1', title: 'Dr.', user: { firstName: 'John', lastName: 'Doe' } } },
        { id: '2', status: 'COMPLETED', specialty: 'ORTHOPEDICS', createdAt: new Date('2024-01-05'), bookedAt: new Date('2024-01-12'), referringStaff: { id: 's1', title: 'Dr.', user: { firstName: 'John', lastName: 'Doe' } } },
        { id: '3', status: 'DRAFT', specialty: 'NEUROLOGY', createdAt: new Date('2024-01-15'), bookedAt: null, referringStaff: { id: 's2', title: 'Nurse', user: { firstName: 'Jane', lastName: 'Smith' } } },
      ];

      mockPrisma.referral.findMany.mockResolvedValue(mockReferrals);

      const result = await service.getReferralAnalytics('tenant-1', '2024-01-01', '2024-01-31');

      expect(result.total).toBe(3);
      expect(result.sent).toBe(2);
      expect(result.completed).toBe(1);
      expect(result.conversionRate).toBe(50);
      expect(result.averageWaitDays).toBe(7);
    });
  });

  describe('Saved Reports CRUD', () => {
    it('should create a saved report', async () => {
      const mockReport = { id: 'r1', name: 'Test Report', tenantId: 'tenant-1' };
      mockPrisma.savedReport.create.mockResolvedValue(mockReport);

      const result = await service.createSavedReport('tenant-1', { name: 'Test Report', description: 'A test report', createdBy: 'admin' });
      expect(result).toEqual(mockReport);
    });

    it('should execute a saved report', async () => {
      const mockReport = { id: 'r1', name: 'Revenue Report', reportConfig: { reportType: 'revenue', periodStart: '2024-01-01', periodEnd: '2024-01-31' }, createdBy: 'admin' };
      mockPrisma.savedReport.findFirst.mockResolvedValue(mockReport);
      mockPrisma.reportExecutionLog.create.mockResolvedValue({ id: 'exec-1', startedAt: new Date() });
      mockPrisma.reportExecutionLog.update.mockResolvedValue({});
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      const result = await service.executeSavedReport('r1', 'tenant-1');
      expect(result.executionId).toBeDefined();
      expect(result.result).toBeDefined();
    });
  });
});