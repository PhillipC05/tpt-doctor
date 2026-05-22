// ============================================================================
// TPT Doctor — Compliance Service
// Handles HIPAA, GDPR, AU Privacy Act, NZ HISO compliance checks
// ============================================================================

export {
  validateDataRetention,
  validateConsents,
  isDataProcessingAllowed,
  getComplianceFrameworks,
  validateTenantCompliance,
  generateDSARReport,
} from './compliance-core';

export type {
  ComplianceCheckResult,
  ComplianceCheck,
} from './compliance-core';

// === HIPAA Security Rule (§ 164.302-318) ===
export {
  assessAdministrativeSafeguards,
  assessPhysicalSafeguards,
  assessTechnicalSafeguards,
  assessOrganizationalRequirements,
  assessPoliciesAndProcedures,
  performFullSecurityRuleAssessment,
  generateRemediationPlan,
} from './hipaa-security';

export type {
  SecurityRuleCheck,
  SecurityRuleAssessment,
  SecurityRuleRemediation,
} from './hipaa-security';

// === HIPAA Privacy Rule (§ 164.500-534) ===
export {
  assessUsesAndDisclosures,
  assessIndividualRights,
  assessAdministrativeRequirements,
  performFullPrivacyRuleAssessment,
  generateNoticeOfPrivacyPractices,
} from './hipaa-privacy';

export type {
  PrivacyRuleCheck,
  PrivacyRuleAssessment,
  PrivacyNotice,
  PrivacyNoticeSection,
} from './hipaa-privacy';

// === HIPAA Breach Notification Rule (§ 164.400-414) ===
export {
  performBreachRiskAssessment,
  generateBreachNotifications,
  logBreachIncident,
  getBreachLog,
  updateBreachStatus,
  generateAnnualBreachSummary,
} from './breach-notification';

export type {
  BreachSeverity,
  BreachStatus,
  BreachIncident,
  BreachNotificationReport,
  BreachRiskAssessment,
  NotificationDetails,
} from './breach-notification';

// === GDPR Compliance ===
export {
  assessDataSubjectRights,
  assessControllerObligations,
  assessDataProtectionByDesign,
  assessGDPRBreachNotification,
  assessTransfersAndSafeguards,
  performFullGDPRAssessment,
  submitDSARRequest,
  updateDSARStatus,
  getDSARRequests,
  handleErasureRequest,
  completeErasure,
} from './gdpr';

export type {
  GDPRCheck,
  GDPRAssessment,
  DataSubjectRequest,
  ErasureRequest,
} from './gdpr';

// === AU Privacy Act ===
export {
  assessAllAPPs,
  performFullAPPAssessment,
} from './au-privacy';

export type {
  APPPrivacyCheck,
  APPAssessment,
} from './au-privacy';

// === NZ HISO Compliance ===
export {
  assessHISOStandards,
  assessNZPrivacyAct,
  assessHIPC2020,
  performFullHISOAssessment,
} from './nz-hiso';

export type {
  HISOCheck,
  HISOAssessment,
} from './nz-hiso';

// === SOC 2 Preparation ===
export {
  assessCommonCriteria,
  performSOC2ReadinessAssessment,
} from './soc2';

export type {
  SOC2Type,
  TrustServiceCategory,
  SOC2Control,
  SOC2ReadinessAssessment,
  SOC2Gap,
} from './soc2';

// === Incident Response ===
export {
  determineIncidentSeverity,
  severityToResponseSLAs,
  getIncidentResponsePlan,
  createSecurityIncident,
  updateIncidentStatus,
  getIncidentLog,
  getIncidentsBySeverity,
  getOpenIncidents,
  generateIncidentReport,
} from './incident-response';

export type {
  IncidentSeverity,
  IncidentStatus,
  IncidentCategory,
  SecurityIncident,
  IncidentResponseStep,
  IncidentResponsePhase,
} from './incident-response';

// === Business Associate Agreement ===
export {
  generateBAA,
  generateBAAChecklist,
  renderBAAText,
} from './baa-template';

export type {
  BAA,
  BAAParty,
  BAATerm,
  BAAChecklistItem,
} from './baa-template';

// === Security Training ===
export {
  getSecurityTrainingModules,
  trackTrainingCompletion,
  generateTrainingReport,
} from './security-training';

export type {
  TrainingModule,
  TrainingRecord,
  TrainingReport,
} from './security-training';

// === Vulnerability Scanning ===
export {
  performVulnerabilityScan,
  addVulnerabilityFinding,
  getVulnerabilityFindings,
  generateVulnerabilityReport,
} from './vulnerability-scanning';

export type {
  VulnerabilityFinding,
  VulnerabilitySeverity,
  VulnerabilityStatus,
  VulnerabilityScan,
} from './vulnerability-scanning';
</write_to_file>