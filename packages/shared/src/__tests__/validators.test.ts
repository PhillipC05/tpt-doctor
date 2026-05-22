import { describe, it, expect } from '@jest/globals';
import {
  createPatientSchema,
  createAppointmentSchema,
  createEncounterSchema,
  createPrescriptionSchema,
  createInvoiceSchema,
} from '../validators';
import { Gender, BloodType, InsuranceType, EncounterType } from '../enums';

describe('createPatientSchema', () => {
  const validPatient = {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-15',
    gender: Gender.MALE,
    email: 'john@example.com',
    phone: '555-0100',
    address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'US',
    },
  };

  it('should validate a correct patient', () => {
    const result = createPatientSchema.safeParse(validPatient);
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const result = createPatientSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject invalid email', () => {
    const result = createPatientSchema.safeParse({ ...validPatient, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid date format', () => {
    const result = createPatientSchema.safeParse({ ...validPatient, dateOfBirth: '01-15-1990' });
    expect(result.success).toBe(false);
  });

  it('should accept patient with insurance', () => {
    const withInsurance = {
      ...validPatient,
      insurance: [{
        provider: 'Blue Cross',
        policyNumber: 'POL123',
        insuranceType: InsuranceType.PRIVATE,
        isPrimary: true,
      }],
    };
    const result = createPatientSchema.safeParse(withInsurance);
    expect(result.success).toBe(true);
  });

  it('should accept patient with emergency contact', () => {
    const withEmergency = {
      ...validPatient,
      emergencyContact: {
        name: 'Jane Doe',
        relationship: 'Spouse',
        phone: '555-0200',
      },
    };
    const result = createPatientSchema.safeParse(withEmergency);
    expect(result.success).toBe(true);
  });
});

describe('createAppointmentSchema', () => {
  const validAppointment = {
    patientId: '550e8400-e29b-41d4-a716-446655440000',
    staffId: '550e8400-e29b-41d4-a716-446655440001',
    title: 'Annual Checkup',
    startTime: '2026-05-10T09:00:00.000Z',
    endTime: '2026-05-10T09:15:00.000Z',
    type: EncounterType.ROUTINE_CHECKUP,
  };

  it('should validate a correct appointment', () => {
    const result = createAppointmentSchema.safeParse(validAppointment);
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const result = createAppointmentSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should accept appointment with description', () => {
    const withDesc = { ...validAppointment, description: 'Patient feeling well' };
    const result = createAppointmentSchema.safeParse(withDesc);
    expect(result.success).toBe(true);
  });

  it('should accept recurring appointment', () => {
    const recurring = {
      ...validAppointment,
      isRecurring: true,
      recurringPattern: {
        frequency: 'WEEKLY' as const,
        interval: 1,
        endDate: '2026-12-31',
        daysOfWeek: [1, 3],
      },
    };
    const result = createAppointmentSchema.safeParse(recurring);
    expect(result.success).toBe(true);
  });
});

describe('createEncounterSchema', () => {
  const validEncounter = {
    patientId: '550e8400-e29b-41d4-a716-446655440000',
    staffId: '550e8400-e29b-41d4-a716-446655440001',
    encounterType: EncounterType.OFFICE_VISIT,
    date: '2026-05-10T09:00:00.000Z',
    chiefComplaint: 'Cough and fever',
  };

  it('should validate a correct encounter', () => {
    const result = createEncounterSchema.safeParse(validEncounter);
    expect(result.success).toBe(true);
  });

  it('should accept SOAP notes', () => {
    const withSoap = {
      ...validEncounter,
      subjective: 'Patient reports cough for 3 days',
      objective: 'Temp 38.5C, O2 sat 97%',
      assessment: 'Upper respiratory infection',
      plan: 'Rest, fluids, follow up if no improvement',
    };
    const result = createEncounterSchema.safeParse(withSoap);
    expect(result.success).toBe(true);
  });

  it('should accept vitals', () => {
    const withVitals = {
      ...validEncounter,
      vitals: {
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        heartRate: 72,
        temperature: 37.0,
        oxygenSaturation: 98,
        weight: 75,
        height: 175,
      },
    };
    const result = createEncounterSchema.safeParse(withVitals);
    expect(result.success).toBe(true);
  });

  it('should accept diagnosis codes', () => {
    const withDiagnosis = {
      ...validEncounter,
      diagnosisCodes: [
        { code: 'J06.9', description: 'Acute upper respiratory infection', isPrimary: true },
        { code: 'R50.9', description: 'Fever, unspecified', isPrimary: false },
      ],
    };
    const result = createEncounterSchema.safeParse(withDiagnosis);
    expect(result.success).toBe(true);
  });
});

describe('createPrescriptionSchema', () => {
  const validPrescription = {
    patientId: '550e8400-e29b-41d4-a716-446655440000',
    medicationName: 'Amoxicillin',
    strength: '500mg',
    form: 'Capsule',
    route: 'Oral',
    frequency: 'Three times daily',
    duration: '7 days',
    quantity: 21,
    refills: 0,
    expiresAt: '2027-05-10T00:00:00.000Z',
  };

  it('should validate a correct prescription', () => {
    const result = createPrescriptionSchema.safeParse(validPrescription);
    expect(result.success).toBe(true);
  });

  it('should reject negative quantity', () => {
    const result = createPrescriptionSchema.safeParse({ ...validPrescription, quantity: -1 });
    expect(result.success).toBe(false);
  });

  it('should accept DAW prescription', () => {
    const result = createPrescriptionSchema.safeParse({ ...validPrescription, dispenseAsWritten: true });
    expect(result.success).toBe(true);
  });
});

describe('createInvoiceSchema', () => {
  const validInvoice = {
    patientId: '550e8400-e29b-41d4-a716-446655440000',
    items: [
      { cptCode: '99213', description: 'Office visit', quantity: 1, unitPrice: 150 },
      { cptCode: '85025', description: 'Complete blood count', quantity: 1, unitPrice: 75 },
    ],
    dueDate: '2026-06-10T00:00:00.000Z',
  };

  it('should validate a correct invoice', () => {
    const result = createInvoiceSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
  });

  it('should reject invoice without items', () => {
    const result = createInvoiceSchema.safeParse({ ...validInvoice, items: [] });
    expect(result.success).toBe(false);
  });

  it('should accept invoice with discount', () => {
    const result = createInvoiceSchema.safeParse({ ...validInvoice, discount: 25 });
    expect(result.success).toBe(true);
  });
});