// ============================================================================
// TPT Doctor — Incident Response Plan
// Based on NIST SP 800-61 Rev. 2 Framework
// ============================================================================

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'detected' | 'analyzed' | 'contained' | 'eradicated' | 'recovered' | 'closed';
export type IncidentCategory =
  | 'unauthorized_access'
  | 'malware'
  | 'phishing'
  | 'denial_of_service'
  | 'data_breach'
  | 'physical_security'
  | 'policy_violation'
  | 'device_theft'
  | 'insider_threat'
  | 'third_party_incident';

export interface SecurityIncident {
  id: string;
  detectedAt: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  affectedSystems: string[];
  affectedDataTypes: string[];
  detectedBy: string;
  assignedTo: string | null;
  slaHours: number;
  slaDeadline: string;
  containmentStrategy: string | null;
  eradicationSteps: string | null;
  recoverySteps: string | null;
  lessonsLearned: string | null;
  closedAt: string | null;
}

export interface IncidentResponseStep {
  phase: IncidentResponsePhase;
  name: string;
  description: string;
  responsibleParty: string;
  sla: string;
  checklist: string[];
  completed: boolean;
}

export type IncidentResponsePhase =
  | 'preparation'
  | 'detection_analysis'
  | 'containment_eradication'
  | 'recovery'
  | 'post_incident';

// ============================================================================
// Incident Severity Definitions
// ============================================================================

export function determineIncidentSeverity(
  category: IncidentCategory,
  involvesPHI: boolean,
  affectedUsers: number,
  systemCriticality: 'critical' | 'high' | 'medium' | 'low',
): IncidentSeverity {
  // PHI breach or critical system compromise
  if (involvesPHI && (affectedUsers > 500 || systemCriticality === 'critical')) {
    return 'critical';
  }

  // PHI breach with limited scope, or critical system without PHI
  if (involvesPHI || systemCriticality === 'critical' || affectedUsers > 100) {
    return 'high';
  }

  // Moderate impact
  if (affectedUsers > 10 || systemCriticality === 'high') {
    return 'medium';
  }

  return 'low';
}

export function severityToResponseSLAs(
  severity: IncidentSeverity,
): { detection: number; containment: number; eradication: number; recovery: number } {
  switch (severity) {
    case 'critical':
      return { detection: 0.25, containment: 1, eradication: 4, recovery: 8 }; // hours
    case 'high':
      return { detection: 1, containment: 4, eradication: 8, recovery: 24 }; // hours
    case 'medium':
      return { detection: 4, containment: 24, eradication: 48, recovery: 72 }; // hours
    case 'low':
      return { detection: 24, containment: 72, eradication: 168, recovery: 336 }; // hours
  }
}

// ============================================================================
// Incident Response Phases
// ============================================================================

export function getIncidentResponsePlan(
  severity: IncidentSeverity,
): IncidentResponseStep[] {
  const slas = severityToResponseSLAs(severity);

  return [
    {
      phase: 'preparation',
      name: 'Preparation',
      description: 'Establish and maintain an incident response capability',
      responsibleParty: 'CISO / Security Team',
      sla: 'Ongoing',
      checklist: [
        'Maintain incident response policy and procedures',
        'Train incident response team quarterly',
        'Conduct tabletop exercises semi-annually',
        'Maintain contact lists (internal, external, legal, PR)',
        'Ensure monitoring tools are operational',
        'Maintain forensic toolkits and documentation',
      ],
      completed: true,
    },
    {
      phase: 'detection_analysis',
      name: 'Detection & Analysis',
      description: 'Detect and analyze potential security incidents',
      responsibleParty: 'Security Operations Center (SOC)',
      sla: `${slas.detection}h`,
      checklist: [
        'Receive alert or report of potential incident',
        'Categorize and prioritize the incident',
        'Gather evidence and preserve chain of custody',
        'Determine scope: affected systems, data, users',
        'Escalate to incident response team if needed',
        'Document all findings in incident tracking system',
        'Notify legal and compliance teams if PHI involved',
      ],
      completed: false,
    },
    {
      phase: 'containment_eradication',
      name: 'Containment, Eradication & Recovery',
      description: 'Contain the incident, eradicate the threat, and recover systems',
      responsibleParty: 'Incident Response Lead',
      sla: `${slas.containment}h containment`,
      checklist: [
        'Implement short-term containment (isolate affected systems)',
        'Implement long-term containment (apply patches, block IOCs)',
        'Preserve forensic evidence before eradication',
        'Remove malware, backdoors, and unauthorized access',
        'Identify and remediate root cause',
        'Verify eradication success through scanning',
        'Restore systems from known-good backups',
        'Monitor for recurrence post-recovery',
      ],
      completed: false,
    },
    {
      phase: 'recovery',
      name: 'Recovery',
      description: 'Restore normal operations and validate system integrity',
      responsibleParty: 'IT Operations Lead',
      sla: `${slas.recovery}h`,
      checklist: [
        'Restore affected systems to production',
        'Validate system integrity and security controls',
        'Monitor systems for signs of recurring compromise',
        'Communicate recovery status to stakeholders',
        'Update system documentation as needed',
      ],
      completed: false,
    },
    {
      phase: 'post_incident',
      name: 'Post-Incident Activity',
      description: 'Conduct lessons learned and update security posture',
      responsibleParty: 'Incident Response Lead + Stakeholders',
      sla: 'Within 2 weeks of closure',
      checklist: [
        'Conduct post-incident review meeting',
        'Document lessons learned and root cause analysis',
        'Update incident response plan based on lessons',
        'Update security controls to prevent recurrence',
        'Finalize incident report and close out ticket',
        'Submit regulatory notifications if required (HIPAA/GDPR)',
        'Update risk register and control assessments',
      ],
      completed: false,
    },
  ];
}

// ============================================================================
// Incident Management
// ============================================================================

const incidentLog: SecurityIncident[] = [];

export function createSecurityIncident(
  category: IncidentCategory,
  description: string,
  affectedSystems: string[],
  affectedDataTypes: string[],
  detectedBy: string,
  involvesPHI: boolean,
  affectedUsers: number,
  systemCriticality: 'critical' | 'high' | 'medium' | 'low',
): SecurityIncident {
  const severity = determineIncidentSeverity(category, involvesPHI, affectedUsers, systemCriticality);
  const slas = severityToResponseSLAs(severity);
  const now = new Date();
  const deadline = new Date(now.getTime() + slas.containment * 60 * 60 * 1000);

  const incident: SecurityIncident = {
    id: generateIncidentId(),
    detectedAt: now.toISOString(),
    category,
    severity,
    status: 'detected',
    description,
    affectedSystems,
    affectedDataTypes,
    detectedBy,
    assignedTo: null,
    slaHours: slas.containment,
    slaDeadline: deadline.toISOString(),
    containmentStrategy: null,
    eradicationSteps: null,
    recoverySteps: null,
    lessonsLearned: null,
    closedAt: null,
  };

  incidentLog.push(incident);
  return incident;
}

export function updateIncidentStatus(
  incidentId: string,
  status: IncidentStatus,
  updates?: Partial<SecurityIncident>,
): SecurityIncident | null {
  const incident = incidentLog.find((i) => i.id === incidentId);
  if (!incident) return null;

  incident.status = status;
  if (updates) Object.assign(incident, updates);
  if (status === 'closed') incident.closedAt = new Date().toISOString();

  return incident;
}

export function getIncidentLog(): SecurityIncident[] {
  return [...incidentLog];
}

export function getIncidentsBySeverity(severity: IncidentSeverity): SecurityIncident[] {
  return incidentLog.filter((i) => i.severity === severity);
}

export function getOpenIncidents(): SecurityIncident[] {
  return incidentLog.filter((i) => i.status !== 'closed');
}

function generateIncidentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INC-${timestamp}-${random}`;
}

// ============================================================================
// Incident Reporting
// ============================================================================

export function generateIncidentReport(incidentId: string): string | null {
  const incident = incidentLog.find((i) => i.id === incidentId);
  if (!incident) return null;

  return `
INCIDENT REPORT
===============
ID: ${incident.id}
Severity: ${incident.severity}
Category: ${incident.category}
Status: ${incident.status}
Detected: ${incident.detectedAt}
Detected By: ${incident.detectedBy}

Description:
${incident.description}

Affected Systems:
${incident.affectedSystems.join(', ')}

Affected Data Types:
${incident.affectedDataTypes.join(', ')}

Response Timeline:
- SLA Deadline: ${incident.slaDeadline}
- Contained: ${incident.containmentStrategy ? 'Yes' : 'Pending'}
- Eradicated: ${incident.eradicationSteps ? 'Yes' : 'Pending'}
- Recovered: ${incident.recoverySteps ? 'Yes' : 'Pending'}
- Closed: ${incident.closedAt || 'Open'}

Lessons Learned:
${incident.lessonsLearned || 'Not yet documented'}
`;
}
</write_to_file>