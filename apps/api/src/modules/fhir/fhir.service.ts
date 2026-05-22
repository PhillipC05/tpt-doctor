import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@tpt-doctor/database';

// ============================================================================
// FHIR R4 Types
// ============================================================================

export interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  identifier: Array<{ system: string; value: string }>;
  name: Array<{ use: string; family: string; given: string[] }>;
  telecom: Array<{ system: string; value: string; use: string }>;
  gender: string;
  birthDate: string;
  address: Array<{ line: string[]; city: string; state: string; postalCode: string; country: string }>;
  managingOrganization?: { reference: string };
  meta: { lastUpdated: string; versionId: string };
}

export interface FhirObservation {
  resourceType: 'Observation';
  id: string;
  status: string;
  category: Array<{ coding: Array<{ system: string; code: string }> }>;
  code: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  subject: { reference: string };
  effectiveDateTime: string;
  valueQuantity?: { value: number; unit: string; system: string; code: string };
  valueString?: string;
  interpretation?: Array<{ coding: Array<{ system: string; code: string }> }>;
  referenceRange?: Array<{ low: { value: number }; high: { value: number }; type: { coding: Array<{ code: string }> } }>;
  meta: { lastUpdated: string; versionId: string };
}

export interface FhirMedicationRequest {
  resourceType: 'MedicationRequest';
  id: string;
  status: string;
  intent: string;
  medicationCodeableConcept: { coding: Array<{ system: string; code: string; display: string }>; text: string };
  subject: { reference: string };
  authoredOn: string;
  requester: { reference: string };
  dosageInstruction: Array<{
    text: string;
    timing: { repeat: { frequency: number; period: number; periodUnit: string } };
    doseAndRate: Array<{ doseQuantity: { value: number; unit: string; system: string; code: string } }>;
  }>;
  dispenseRequest: { quantity: { value: number; unit: string }; numberOfRepeatsAllowed: number };
  meta: { lastUpdated: string; versionId: string };
}

export interface FhirAppointment {
  resourceType: 'Appointment';
  id: string;
  status: string;
  start: string;
  end: string;
  participant: Array<{ actor: { reference: string }; status: string }>;
  description?: string;
  appointmentType?: { coding: Array<{ system: string; code: string }> };
  meta: { lastUpdated: string; versionId: string };
}

export interface FhirEncounter {
  resourceType: 'Encounter';
  id: string;
  status: string;
  class: { system: string; code: string };
  type: Array<{ coding: Array<{ system: string; code: string; display: string }> }>;
  subject: { reference: string };
  participant: Array<{ individual: { reference: string } }>;
  period: { start: string; end?: string };
  reasonCode?: Array<{ coding: Array<{ system: string; code: string; display: string }>; text: string }>;
  diagnosis?: Array<{ condition: { reference: string }; use: { coding: Array<{ system: string; code: string }> } }>;
  hospitalization?: { admitSource: { coding: Array<{ system: string; code: string }> }; dischargeDisposition: { coding: Array<{ system: string; code: string }> } };
  meta: { lastUpdated: string; versionId: string };
}

// ============================================================================
// FHIR Bundle
// ============================================================================

export interface FhirBundle {
  resourceType: 'Bundle';
  type: 'searchset' | 'transaction' | 'batch' | 'history' | 'collection';
  total?: number;
  entry: Array<{
    fullUrl?: string;
    resource: any;
    search?: { mode: string };
  }>;
  link?: Array<{ relation: string; url: string }>;
}

// ============================================================================
// FHIR Service
// ============================================================================

@Injectable()
export class FhirService {
  private patients = new Map<string, FhirPatient>();
  private observations = new Map<string, FhirObservation>();
  private medicationRequests = new Map<string, FhirMedicationRequest>();
  private appointments = new Map<string, FhirAppointment>();
  private encounters = new Map<string, FhirEncounter>();

  // ==========================================================================
  // Patient Resource
  // ==========================================================================

  createPatient(patient: FhirPatient): FhirPatient {
    const id = patient.id || crypto.randomUUID?.() || `${Date.now()}`;
    const now = new Date().toISOString();
    const newPatient: FhirPatient = {
      ...patient,
      resourceType: 'Patient',
      id,
      meta: { lastUpdated: now, versionId: '1' },
    };
    this.patients.set(id, newPatient);
    return newPatient;
  }

  getPatient(id: string): FhirPatient {
    const patient = this.patients.get(id);
    if (!patient) throw new NotFoundException(`Patient ${id} not found`);
    return patient;
  }

  searchPatients(query?: { name?: string; identifier?: string; birthDate?: string; gender?: string }): FhirPatient[] {
    let results = Array.from(this.patients.values());
    if (query?.name) {
      const nameLower = query.name.toLowerCase();
      results = results.filter((p) =>
        p.name.some((n) =>
          n.family.toLowerCase().includes(nameLower) ||
          n.given.some((g) => g.toLowerCase().includes(nameLower))
        )
      );
    }
    if (query?.identifier) {
      results = results.filter((p) =>
        p.identifier.some((i) => i.value === query.identifier)
      );
    }
    if (query?.birthDate) {
      results = results.filter((p) => p.birthDate === query.birthDate);
    }
    if (query?.gender) {
      results = results.filter((p) => p.gender === query.gender);
    }
    return results;
  }

  updatePatient(id: string, update: Partial<FhirPatient>): FhirPatient {
    const existing = this.getPatient(id);
    const version = parseInt(existing.meta.versionId) + 1;
    const updated: FhirPatient = {
      ...existing,
      ...update,
      id,
      resourceType: 'Patient',
      meta: { lastUpdated: new Date().toISOString(), versionId: version.toString() },
    };
    this.patients.set(id, updated);
    return updated;
  }

  deletePatient(id: string): void {
    if (!this.patients.has(id)) throw new NotFoundException(`Patient ${id} not found`);
    this.patients.delete(id);
  }

  // ==========================================================================
  // Observation Resource
  // ==========================================================================

  createObservation(observation: FhirObservation): FhirObservation {
    const id = observation.id || crypto.randomUUID?.() || `${Date.now()}`;
    const now = new Date().toISOString();
    const newObs: FhirObservation = {
      ...observation,
      resourceType: 'Observation',
      id,
      meta: { lastUpdated: now, versionId: '1' },
    };
    this.observations.set(id, newObs);
    return newObs;
  }

  getObservation(id: string): FhirObservation {
    const obs = this.observations.get(id);
    if (!obs) throw new NotFoundException(`Observation ${id} not found`);
    return obs;
  }

  searchObservations(query?: { patient?: string; code?: string; date?: string; status?: string }): FhirObservation[] {
    let results = Array.from(this.observations.values());
    if (query?.patient) results = results.filter((o) => o.subject.reference === `Patient/${query.patient}`);
    if (query?.code) results = results.filter((o) => o.code.coding.some((c) => c.code === query.code));
    if (query?.status) results = results.filter((o) => o.status === query.status);
    return results;
  }

  // ==========================================================================
  // MedicationRequest Resource
  // ==========================================================================

  createMedicationRequest(request: FhirMedicationRequest): FhirMedicationRequest {
    const id = request.id || crypto.randomUUID?.() || `${Date.now()}`;
    const now = new Date().toISOString();
    const newReq: FhirMedicationRequest = {
      ...request,
      resourceType: 'MedicationRequest',
      id,
      meta: { lastUpdated: now, versionId: '1' },
    };
    this.medicationRequests.set(id, newReq);
    return newReq;
  }

  getMedicationRequest(id: string): FhirMedicationRequest {
    const req = this.medicationRequests.get(id);
    if (!req) throw new NotFoundException(`MedicationRequest ${id} not found`);
    return req;
  }

  searchMedicationRequests(query?: { patient?: string; status?: string }): FhirMedicationRequest[] {
    let results = Array.from(this.medicationRequests.values());
    if (query?.patient) results = results.filter((r) => r.subject.reference === `Patient/${query.patient}`);
    if (query?.status) results = results.filter((r) => r.status === query.status);
    return results;
  }

  // ==========================================================================
  // Appointment Resource
  // ==========================================================================

  createAppointment(appointment: FhirAppointment): FhirAppointment {
    const id = appointment.id || crypto.randomUUID?.() || `${Date.now()}`;
    const now = new Date().toISOString();
    const newAppt: FhirAppointment = {
      ...appointment,
      resourceType: 'Appointment',
      id,
      meta: { lastUpdated: now, versionId: '1' },
    };
    this.appointments.set(id, newAppt);
    return newAppt;
  }

  getAppointment(id: string): FhirAppointment {
    const appt = this.appointments.get(id);
    if (!appt) throw new NotFoundException(`Appointment ${id} not found`);
    return appt;
  }

  searchAppointments(query?: { patient?: string; status?: string; date?: string }): FhirAppointment[] {
    let results = Array.from(this.appointments.values());
    if (query?.patient) results = results.filter((a) => a.participant.some((p) => p.actor.reference === `Patient/${query.patient}`));
    if (query?.status) results = results.filter((a) => a.status === query.status);
    return results;
  }

  // ==========================================================================
  // Encounter Resource
  // ==========================================================================

  createEncounter(encounter: FhirEncounter): FhirEncounter {
    const id = encounter.id || crypto.randomUUID?.() || `${Date.now()}`;
    const now = new Date().toISOString();
    const newEnc: FhirEncounter = {
      ...encounter,
      resourceType: 'Encounter',
      id,
      meta: { lastUpdated: now, versionId: '1' },
    };
    this.encounters.set(id, newEnc);
    return newEnc;
  }

  getEncounter(id: string): FhirEncounter {
    const enc = this.encounters.get(id);
    if (!enc) throw new NotFoundException(`Encounter ${id} not found`);
    return enc;
  }

  searchEncounters(query?: { patient?: string; status?: string; date?: string }): FhirEncounter[] {
    let results = Array.from(this.encounters.values());
    if (query?.patient) results = results.filter((e) => e.subject.reference === `Patient/${query.patient}`);
    if (query?.status) results = results.filter((e) => e.status === query.status);
    return results;
  }

  // ==========================================================================
  // Bulk Export ($export)
  // ==========================================================================

  exportAll(): FhirBundle {
    const entry: FhirBundle['entry'] = [];

    this.patients.forEach((p) => {
      entry.push({ resource: p });
    });
    this.observations.forEach((o) => {
      entry.push({ resource: o });
    });
    this.medicationRequests.forEach((m) => {
      entry.push({ resource: m });
    });
    this.appointments.forEach((a) => {
      entry.push({ resource: a });
    });
    this.encounters.forEach((e) => {
      entry.push({ resource: e });
    });

    return {
      resourceType: 'Bundle',
      type: 'collection',
      total: entry.length,
      entry,
    };
  }

  // ==========================================================================
  // Helper: Build Bundle from Search Results
  // ==========================================================================

  buildBundle(resources: any[], type: 'searchset' | 'collection' = 'searchset'): FhirBundle {
    return {
      resourceType: 'Bundle',
      type,
      total: resources.length,
      entry: resources.map((r) => ({
        fullUrl: `https://api.tptdoctor.com/fhir/${r.resourceType}/${r.id}`,
        resource: r,
      })),
    };
  }

  // ==========================================================================
  // Mapping helpers (Prisma -> FHIR)
  // ==========================================================================

  private mapPatientToFhir(p: any): FhirPatient {
    return {
      resourceType: 'Patient',
      id: p.id,
      identifier: [{ system: 'urn:oid:1.2.36.1.2001.1003.0', value: p.medicareNumber || p.nhiNumber || p.nhsNumber || p.id }],
      name: [{ use: 'official', family: p.lastName || p.lastName || '', given: [p.firstName || ''] }],
      telecom: [
        ...(p.email ? [{ system: 'email' as const, value: p.email, use: 'home' as const }] : []),
        ...(p.phone ? [{ system: 'phone' as const, value: p.phone, use: 'mobile' as const }] : []),
      ],
      gender: p.gender || 'unknown',
      birthDate: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] || '' : '',
      address: [{
        line: [p.address || ''],
        city: p.city || '',
        state: p.state || '',
        postalCode: p.postalCode || '',
        country: p.country || '',
      }],
      meta: { lastUpdated: p.updatedAt?.toISOString() || new Date().toISOString(), versionId: '1' },
    };
  }

  private mapLabToObservation(l: any): FhirObservation {
    return {
      resourceType: 'Observation',
      id: l.id,
      status: 'final',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] }],
      code: { coding: [{ system: 'http://loinc.org', code: l.testCode || 'UNKNOWN', display: l.testName || '' }], text: l.testName || '' },
      subject: { reference: `Patient/${l.patientId}` },
      effectiveDateTime: l.collectedDate?.toISOString() || new Date().toISOString(),
      valueQuantity: l.resultValue ? { value: parseFloat(l.resultValue), unit: l.resultUnit || '', system: 'http://unitsofmeasure.org', code: l.resultUnit || '' } : undefined,
      meta: { lastUpdated: l.updatedAt?.toISOString() || new Date().toISOString(), versionId: '1' },
    };
  }

  private mapPrescriptionToFhir(p: any): FhirMedicationRequest {
    return {
      resourceType: 'MedicationRequest',
      id: p.id,
      status: p.status || 'active',
      intent: 'order',
      medicationCodeableConcept: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: p.medicationCode || 'UNKNOWN', display: p.medicationName || '' }], text: p.medicationName || '' },
      subject: { reference: `Patient/${p.patientId}` },
      authoredOn: p.prescribedDate?.toISOString() || new Date().toISOString(),
      requester: { reference: `Practitioner/${p.prescribedById || 'unknown'}` },
      dosageInstruction: [{
        text: p.dosageInstructions || '',
        timing: { repeat: { frequency: parseInt(p.frequency) || 1, period: 1, periodUnit: 'd' } },
        doseAndRate: [{ doseQuantity: { value: parseFloat(p.dosage) || 1, unit: p.dosageUnit || '', system: 'http://unitsofmeasure.org', code: p.dosageUnit || '' } }],
      }],
      dispenseRequest: { quantity: { value: p.quantity || 1, unit: p.quantityUnit || '' }, numberOfRepeatsAllowed: p.refills || 0 },
      meta: { lastUpdated: p.updatedAt?.toISOString() || new Date().toISOString(), versionId: '1' },
    };
  }

  private mapAppointmentToFhir(a: any): FhirAppointment {
    return {
      resourceType: 'Appointment',
      id: a.id,
      status: a.status?.toLowerCase() || 'pending',
      start: a.startTime?.toISOString() || new Date().toISOString(),
      end: a.endTime?.toISOString() || new Date().toISOString(),
      participant: [
        { actor: { reference: `Patient/${a.patientId}` }, status: 'accepted' },
        ...(a.staffId ? [{ actor: { reference: `Practitioner/${a.staffId}` }, status: 'accepted' as const }] : []),
      ],
      meta: { lastUpdated: a.updatedAt?.toISOString() || new Date().toISOString(), versionId: '1' },
    };
  }

  private mapEncounterToFhir(e: any): FhirEncounter {
    return {
      resourceType: 'Encounter',
      id: e.id,
      status: e.status || 'unknown',
      class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
      type: [{ coding: [{ system: 'http://snomed.info/sct', code: e.encounterType || 'UNKNOWN', display: e.encounterType || '' }] }],
      subject: { reference: `Patient/${e.patientId}` },
      participant: [{ individual: { reference: `Practitioner/${e.staffId || 'unknown'}` } }],
      period: { start: e.date?.toISOString() || new Date().toISOString() },
      meta: { lastUpdated: e.updatedAt?.toISOString() || new Date().toISOString(), versionId: '1' },
    };
  }

  // ==========================================================================
  // Bulk FHIR Export ($export operation)
  // Implements the FHIR Bulk Data Access (Flat FHIR) spec
  // ==========================================================================

  async bulkExport(
    tenantId: string,
    resourceTypes?: string[],
    since?: string,
    type?: string,
  ): Promise<FhirBundle> {
    const resources: any[] = [];
    const typesToExport = resourceTypes || ['Patient', 'Observation', 'MedicationRequest', 'Appointment', 'Encounter'];

    // Process each resource type
    for (const resourceType of typesToExport) {
      const sinceFilter = since ? { updatedAt: { gte: new Date(since) } } : {};

      switch (resourceType) {
        case 'Patient': {
          const patients = await prisma.patient.findMany({ where: { tenantId, ...sinceFilter } });
          for (const p of patients) {
            resources.push(this.mapPatientToFhir(p));
          }
          break;
        }
        case 'Observation': {
          const labs = await prisma.labOrder.findMany({ where: { tenantId, ...sinceFilter } });
          for (const l of labs) {
            if (l.result) {
              resources.push(this.mapLabToObservation(l));
            }
          }
          break;
        }
        case 'MedicationRequest': {
          const prescriptions = await prisma.prescription.findMany({ where: { tenantId, ...sinceFilter } });
          for (const p of prescriptions) {
            resources.push(this.mapPrescriptionToFhir(p));
          }
          break;
        }
        case 'Appointment': {
          const appointments = await prisma.appointment.findMany({ where: { tenantId, ...sinceFilter } });
          for (const a of appointments) {
            resources.push(this.mapAppointmentToFhir(a));
          }
          break;
        }
        case 'Encounter': {
          const encounters = await prisma.encounter.findMany({ where: { tenantId, ...sinceFilter } });
          for (const e of encounters) {
            resources.push(this.mapEncounterToFhir(e));
          }
          break;
        }
      }
    }

    return this.buildBundle(resources, type === 'bulk' ? 'collection' : 'searchset');
  }

  /**
   * Generate a bulk export manifest (NDJSON content location)
   */
  async bulkExportManifest(
    tenantId: string,
    outputFormat: string = 'application/fhir+ndjson',
    since?: string,
    types?: string,
  ): Promise<object> {
    const resourceTypes = types ? types.split(',') : ['Patient', 'Observation', 'MedicationRequest', 'Appointment', 'Encounter'];
    const exportTimestamp = new Date().toISOString();
    const output: Record<string, any[]> = {};

    for (const resourceType of resourceTypes) {
      const bundle = await this.bulkExport(tenantId, [resourceType], since);
      output[resourceType] = bundle.entry.map(e => ({
        type: resourceType,
        url: e.fullUrl,
        count: 1,
      }));
    }

    return {
      transactionTime: exportTimestamp,
      request: `/fhir/$export?_type=${types || 'Patient,Observation,MedicationRequest,Appointment,Encounter'}${since ? `&_since=${since}` : ''}`,
      requiresAccessToken: true,
      output,
      error: [],
    };
  }
}
