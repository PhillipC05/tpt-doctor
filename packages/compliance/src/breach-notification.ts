// ============================================================================
// TPT Doctor — HIPAA Breach Notification Rule
// 45 CFR § 164.400-414 — Notification in Case of Breach of Unsecured PHI
// ============================================================================

import { ComplianceFramework } from '@tpt-doctor/shared';

export type BreachSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BreachStatus = 'detected' | 'investigating' | 'confirmed' | 'contained' | 'notified' | 'resolved';

export interface BreachIncident {
  id: string;
  detectedAt: string;
  organizationName: string;
  description: string;
  phiTypesInvolved: string[];
  numberOfIndividualsAffected: number;
  breachSeverity: BreachSeverity;
  riskOfHarm: 'low' | 'medium' | 'high';
  status: BreachStatus;
  isNotified: boolean;
  notificationDeadline: string;
  correctiveActions: string[];
  reportedToOCR: boolean;
  ocrReportDate: string | null;
  mediaNotificationRequired: boolean;
  mediaNotifiedDate: string | null;
  resolutionDate: string | null;
  notes: string;
}

export interface BreachNotificationReport {
  incident: BreachIncident;
  individualNotifications: NotificationDetails;
  mediaNotification: NotificationDetails | null;
  ocrNotification: NotificationDetails;
}

export interface NotificationDetails {
  method: string;
  sentTo: string;
  sentDate: string;
  content: string;
  deliveryConfirmation: boolean;
}

export interface BreachRiskAssessment {
  breachIncident: BreachIncident;
  natureAndExtentOfPHI: string;
  unauthorizedPerson: string;
  acquisitionPrevented: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  assessmentDate: string;
  assessedBy: string;
  recommendsNotification: boolean;
}

// ============================================================================
// Breach Detection & Risk Assessment
// ============================================================================

/**
 * Perform a risk assessment on a potential breach incident
 * per 45 CFR § 164.402(1)(i-iv)
 */
export function performBreachRiskAssessment(
  incident: Omit<BreachIncident, 'id' | 'detectedAt' | 'status' | 'isNotified' | 'notificationDeadline' | 'reportedToOCR' | 'ocrReportDate' | 'mediaNotificationRequired' | 'mediaNotifiedDate' | 'resolutionDate' | 'notificationDeadline'>,
): BreachRiskAssessment {
  const acquisitionPrevented = incident.correctiveActions.some(
    (a) => a.toLowerCase().includes('prevented') || a.toLowerCase().includes('contained'),
  );

  let riskLevel: 'low' | 'medium' | 'high' = 'high';
  const phiSensitivityScore = calculatePHISensitivity(incident.phiTypesInvolved);
  const accessScore = acquisitionPrevented ? 0 : 3;
  const combinedScore = phiSensitivityScore + accessScore;

  if (combinedScore <= 3) riskLevel = 'low';
  else if (combinedScore <= 6) riskLevel = 'medium';
  else riskLevel = 'high';

  return {
    breachIncident: {
      ...incident,
      id: generateBreachId(),
      detectedAt: new Date().toISOString(),
      riskOfHarm: riskLevel,
      status: 'detected',
      isNotified: false,
      notificationDeadline: calculateNotificationDeadline(new Date()),
      reportedToOCR: false,
      ocrReportDate: null,
      mediaNotificationRequired: false,
      mediaNotifiedDate: null,
      resolutionDate: null,
    } as BreachIncident,
    natureAndExtentOfPHI: incident.phiTypesInvolved.join(', '),
    unauthorizedPerson: incident.description,
    acquisitionPrevented,
    riskLevel,
    assessmentDate: new Date().toISOString(),
    assessedBy: 'Security Officer',
    recommendsNotification: riskLevel !== 'low' || incident.numberOfIndividualsAffected > 500,
  };
}

/**
 * Calculate PHI sensitivity score for risk assessment
 */
function calculatePHISensitivity(phiTypes: string[]): number {
  const highSensitivityPHI = [
    'SSN',
    'credit card',
    'bank account',
    'psychotherapy notes',
    'genetic',
    'biometric',
    'substance abuse',
    'HIV',
    'STD',
  ];

  const mediumSensitivityPHI = [
    'medical record number',
    'diagnosis',
    'medication',
    'lab results',
    'treatment plan',
  ];

  let score = 0;
  for (const phi of phiTypes) {
    const phiLower = phi.toLowerCase();
    if (highSensitivityPHI.some((h) => phiLower.includes(h))) score += 4;
    else if (mediumSensitivityPHI.some((m) => phiLower.includes(m))) score += 2;
    else score += 1;
  }

  return score;
}

/**
 * Calculate the 60-day notification deadline per 45 CFR § 164.404(b)
 */
function calculateNotificationDeadline(detectionDate: Date): string {
  const deadline = new Date(detectionDate);
  deadline.setDate(deadline.getDate() + 60);
  return deadline.toISOString();
}

/**
 * Generate a unique breach incident ID
 */
function generateBreachId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `BR-${timestamp}-${random}`;
}

// ============================================================================
// Breach Notification Generation
// ============================================================================

/**
 * Generate required notifications per HIPAA Breach Notification Rule
 * § 164.404 (individual), § 164.406 (media), § 164.408 (OCR)
 */
export function generateBreachNotifications(
  incident: BreachIncident,
  patientContactInfo: { name: string; email: string; phone: string; address: string },
): BreachNotificationReport {
  const now = new Date().toISOString();
  const requiresMediaNotification = incident.numberOfIndividualsAffected > 500;
  const ocrNotificationDate = now;

  return {
    incident,
    individualNotifications: {
      method: 'first-class mail' + (patientContactInfo.email ? ' / email' : ''),
      sentTo: patientContactInfo.name,
      sentDate: calculateNotificationSendDate(new Date(incident.detectedAt)),
      content: generateIndividualNotificationContent(incident),
      deliveryConfirmation: false,
    },
    mediaNotification: requiresMediaNotification
      ? {
          method: 'press release to major media outlets',
          sentTo: 'Local and national media',
          sentDate: calculateNotificationSendDate(new Date(incident.detectedAt)),
          content: generateMediaNotificationContent(incident),
          deliveryConfirmation: true,
        }
      : null,
    ocrNotification: {
      method: 'electronic submission to HHS',
      sentTo: 'OCR Notification Portal',
      sentDate: ocrNotificationDate,
      content: generateOCRNotificationContent(incident),
      deliveryConfirmation: true,
    },
  };
}

/**
 * Calculate the earliest notification send date (without unreasonable delay, within 60 days)
 * per 45 CFR § 164.404(b)
 */
function calculateNotificationSendDate(detectionDate: Date): string {
  const sendDate = new Date(detectionDate);
  sendDate.setDate(sendDate.getDate() + Math.min(14, 60));
  return sendDate.toISOString();
}

/**
 * Generate individual notification letter content
 * per 45 CFR § 164.404(c)(1)-(4)
 */
function generateIndividualNotificationContent(incident: BreachIncident): string {
  return `NOTICE OF DATA BREACH

Date: ${new Date().toLocaleDateString()}
From: ${incident.organizationName}
Subject: Breach of Your Protected Health Information

We are writing to notify you of a breach of your unsecured protected health information.

What happened:
${incident.description}

Types of information involved:
${incident.phiTypesInvolved.join(', ')}

What we are doing:
${incident.correctiveActions.join('\n')}

Steps you should take:
- Review your medical records for accuracy
- Monitor your health insurance statements
- Contact your healthcare providers if you notice errors
- For more information about protecting yourself, visit the Federal Trade Commission's website

Contact us:
Please contact our Privacy Officer for more information or assistance.

Your rights:
You have the right to file a complaint with the Secretary of Health and Human Services.

Sincerely,
${incident.organizationName} Privacy Office`;
}

/**
 * Generate media notification content for breaches affecting 500+ individuals
 * per 45 CFR § 164.406
 */
function generateMediaNotificationContent(incident: BreachIncident): string {
  return `PRESS RELEASE

FOR IMMEDIATE RELEASE

${incident.organizationName} Announces Data Breach

${incident.organizationName} is announcing a breach of protected health information affecting approximately ${incident.numberOfIndividualsAffected} individuals.

The breach was detected on ${new Date(incident.detectedAt).toLocaleDateString()}. ${incident.description}

Types of information involved: ${incident.phiTypesInvolved.join(', ')}

${incident.organizationName} has taken the following corrective actions:
${incident.correctiveActions.map((a) => `- ${a}`).join('\n')}

Individuals affected are being notified directly and provided with resources to protect themselves.

Contact: Privacy Officer

###`;
}

/**
 * Generate OCR notification content
 * per 45 CFR § 164.408
 */
function generateOCRNotificationContent(incident: BreachIncident): string {
  return `OCR BREACH NOTIFICATION REPORT

Covered Entity: ${incident.organizationName}
Breach ID: ${incident.id}
Date of Discovery: ${new Date(incident.detectedAt).toLocaleDateString()}
Type of Breach: Unauthorized Access/Disclosure
Number of Individuals Affected: ${incident.numberOfIndividualsAffected}

Description of Breach:
${incident.description}

Types of PHI Involved:
${incident.phiTypesInvolved.join(', ')}

Risk of Harm Assessment: ${incident.riskOfHarm}

Corrective Actions Taken:
${incident.correctiveActions.map((a) => `- ${a}`).join('\n')}

Notification Status:
- Individual Notification: ${incident.isNotified ? 'Sent' : 'Pending'}
- Media Notification: ${incident.mediaNotificationRequired ? 'Required' : 'Not Required'}
- OCR Notification: Submitted

Submitted by: ${incident.organizationName} Privacy Office`;
}

// ============================================================================
// Breach Log & Tracking
// ============================================================================

const breachLog: BreachIncident[] = [];

export function logBreachIncident(incident: BreachIncident): void {
  breachLog.push(incident);
}

export function getBreachLog(): BreachIncident[] {
  return [...breachLog];
}

export function updateBreachStatus(
  breachId: string,
  status: BreachStatus,
  notes?: string,
): BreachIncident | null {
  const incident = breachLog.find((b) => b.id === breachId);
  if (!incident) return null;
  incident.status = status;
  if (notes) incident.notes = notes;
  if (status === 'resolved') incident.resolutionDate = new Date().toISOString();
  return incident;
}

/**
 * Generate a breach notification summary report for OCR
 * Required annually for breaches affecting < 500 individuals
 * per 45 CFR § 164.408(c)
 */
export function generateAnnualBreachSummary(
  year: number,
): { totalBreaches: number; totalAffected: number; breaches: BreachIncident[] } {
  const yearBreaches = breachLog.filter((b) => {
    const breachYear = new Date(b.detectedAt).getFullYear();
    return breachYear === year;
  });

  const totalAffected = yearBreaches.reduce(
    (sum, b) => sum + b.numberOfIndividualsAffected,
    0,
  );

  return {
    totalBreaches: yearBreaches.length,
    totalAffected,
    breaches: yearBreaches,
  };
}
</write_to_file>