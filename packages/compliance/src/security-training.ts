// ============================================================================
// TPT Doctor — Security Training Documentation
// HIPAA § 164.308(a)(5) — Security Awareness and Training
// ============================================================================

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  category: 'hipaa' | 'security_awareness' | 'privacy' | 'incident_response' | 'phishing' | 'data_handling';
  durationMinutes: number;
  required: boolean;
  frequency: 'once' | 'annual' | 'quarterly' | 'upon_hire';
  content: string[];
  quizQuestions: QuizQuestion[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface TrainingRecord {
  employeeId: string;
  employeeName: string;
  moduleId: string;
  completedAt: string;
  score: number;
  passed: boolean;
}

export interface TrainingReport {
  moduleId: string;
  moduleTitle: string;
  totalEmployees: number;
  completedCount: number;
  passRate: number;
  averageScore: number;
}

// ============================================================================
// Training Modules
// ============================================================================

export function getSecurityTrainingModules(): TrainingModule[] {
  return [
    {
      id: 'HIPAA-101',
      title: 'HIPAA Privacy & Security Basics',
      description: 'Overview of HIPAA Privacy Rule, Security Rule, and Breach Notification Rule. Covers patient rights, PHI handling, and security best practices.',
      category: 'hipaa',
      durationMinutes: 45,
      required: true,
      frequency: 'annual',
      content: [
        'What is PHI and ePHI',
        'HIPAA Privacy Rule fundamentals',
        'HIPAA Security Rule safeguards',
        'Minimum necessary standard',
        'Patient rights under HIPAA',
        'Penalties for non-compliance',
        'Real-world HIPAA violation cases',
        'Reporting suspected violations',
      ],
      quizQuestions: [
        {
          question: 'What does PHI stand for?',
          options: ['Public Health Information', 'Protected Health Information', 'Private Healthcare Identifier', 'Personal Health Index'],
          correctAnswer: 1,
          explanation: 'PHI stands for Protected Health Information as defined by HIPAA.',
        },
        {
          question: 'Under the Minimum Necessary standard, employees should:',
          options: ['Access all patient records to provide comprehensive care', 'Access only the minimum PHI needed for their job function', 'Share PHI freely with all colleagues', 'Always request written consent before accessing any PHI'],
          correctAnswer: 1,
          explanation: 'The Minimum Necessary standard requires limiting PHI access to what is needed for the specific task.',
        },
        {
          question: 'How long are covered entities required to retain medical records?',
          options: ['3 years', '6 years', '10 years', 'Indefinitely'],
          correctAnswer: 1,
          explanation: 'HIPAA requires medical records retention for a minimum of 6 years.',
        },
      ],
    },
    {
      id: 'SEC-201',
      title: 'Security Awareness & Phishing Prevention',
      description: 'Learn to identify and report security threats including phishing emails, social engineering, and suspicious activities.',
      category: 'phishing',
      durationMinutes: 30,
      required: true,
      frequency: 'quarterly',
      content: [
        'Phishing email indicators',
        'Social engineering tactics',
        'Password security best practices',
        'Multi-factor authentication',
        'Clean desk policy',
        'Secure device handling',
        'Reporting security incidents',
        'Mobile device security',
      ],
      quizQuestions: [
        {
          question: 'What should you do if you receive a suspicious email asking for login credentials?',
          options: ['Reply asking for more details', 'Click the link to verify', 'Report it to security immediately', 'Forward it to colleagues to check'],
          correctAnswer: 2,
          explanation: 'Always report suspicious emails to the security team. Do not click links or respond.',
        },
        {
          question: 'What is an example of social engineering?',
          options: ['A technical vulnerability in software', 'Someone impersonating IT support to get your password', 'A natural disaster affecting data centers', 'An automated system update'],
          correctAnswer: 1,
          explanation: 'Social engineering involves manipulating people into divulging confidential information.',
        },
      ],
    },
    {
      id: 'PRIV-301',
      title: 'Patient Privacy & Confidentiality',
      description: 'Understanding patient privacy rights, proper handling of medical records, and maintaining confidentiality in clinical and administrative settings.',
      category: 'privacy',
      durationMinutes: 40,
      required: true,
      frequency: 'annual',
      content: [
        'Patient privacy rights',
        'Consent and authorization',
        'Privacy in clinical settings',
        'Disclosure of PHI',
        'Patient access to records',
        'Privacy breaches and reporting',
        'Workplace discussions of patient information',
        'Social media and patient privacy',
      ],
      quizQuestions: [
        {
          question: 'When is it appropriate to discuss patient information in a public area?',
          options: ['Never', 'When no patients are nearby', 'If names are not used', 'When discussing with another provider'],
          correctAnswer: 0,
          explanation: 'Patient information should never be discussed in public areas where it may be overheard.',
        },
        {
          question: 'Who can access a patient\'s medical records?',
          options: ['Any healthcare provider in the facility', 'Only authorized individuals with a job-related need to know', 'All administrative staff', 'Anyone who asks the patient directly'],
          correctAnswer: 1,
          explanation: 'Access is limited to authorized individuals with a legitimate need for their job function.',
        },
      ],
    },
    {
      id: 'IR-401',
      title: 'Incident Response & Breach Reporting',
      description: 'Procedures for identifying, reporting, and responding to security incidents and data breaches.',
      category: 'incident_response',
      durationMinutes: 35,
      required: true,
      frequency: 'annual',
      content: [
        'What constitutes a security incident',
        'Immediate steps after detecting an incident',
        'Chain of command for reporting',
        'Preserving evidence',
        'Breach notification requirements',
        'HIPAA breach notification timeline',
        'Documentation requirements',
        'Post-incident review',
      ],
      quizQuestions: [
        {
          question: 'How quickly must a HIPAA breach affecting 500+ individuals be reported to OCR?',
          options: ['Within 24 hours', 'Within 60 days', 'Within 30 days', 'Without unreasonable delay but no later than 60 days'],
          correctAnswer: 3,
          explanation: 'Breaches must be reported without unreasonable delay and no later than 60 days from discovery.',
        },
        {
          question: 'What is the first step when you discover a potential data breach?',
          options: ['Delete the affected data', 'Report it immediately to your supervisor or security team', 'Investigate it yourself', 'Wait to see if it causes problems'],
          correctAnswer: 1,
          explanation: 'Always report potential breaches immediately. Do not attempt to investigate or resolve alone.',
        },
      ],
    },
    {
      id: 'DATA-501',
      title: 'Data Handling & Classification',
      description: 'Proper handling, storage, transmission, and disposal of sensitive data including PHI and PII.',
      category: 'data_handling',
      durationMinutes: 25,
      required: true,
      frequency: 'annual',
      content: [
        'Data classification levels',
        'Secure data transmission',
        'Encryption requirements',
        'Data disposal procedures',
        'Emailing PHI securely',
        'Remote work guidelines',
        'Physical document handling',
        'Data retention schedules',
      ],
      quizQuestions: [
        {
          question: 'Which encryption standard is used for PHI at rest?',
          options: ['AES-128', 'AES-256-GCM', 'DES', 'RC4'],
          correctAnswer: 1,
          explanation: 'AES-256-GCM is the encryption standard used for protecting PHI at rest.',
        },
        {
          question: 'How should physical documents containing PHI be disposed of?',
          options: ['Thrown in regular trash', 'Recycled', 'Shredded or incinerated', 'Donated'],
          correctAnswer: 2,
          explanation: 'Physical documents containing PHI must be shredded or incinerated to prevent unauthorized access.',
        },
      ],
    },
  ];
}

// ============================================================================
// Training Tracking
// ============================================================================

const trainingRecords: TrainingRecord[] = [];

export function trackTrainingCompletion(
  employeeId: string,
  employeeName: string,
  moduleId: string,
  score: number,
): TrainingRecord {
  const module = getSecurityTrainingModules().find((m) => m.id === moduleId);
  const record: TrainingRecord = {
    employeeId,
    employeeName,
    moduleId,
    completedAt: new Date().toISOString(),
    score,
    passed: score >= 80,
  };
  trainingRecords.push(record);
  return record;
}

export function generateTrainingReport(
  moduleId: string,
): TrainingReport | null {
  const module = getSecurityTrainingModules().find((m) => m.id === moduleId);
  if (!module) return null;

  const moduleRecords = trainingRecords.filter((r) => r.moduleId === moduleId);
  const totalEmployees = moduleRecords.length;
  const completedCount = moduleRecords.length;
  const passedCount = moduleRecords.filter((r) => r.passed).length;
  const totalScore = moduleRecords.reduce((sum, r) => sum + r.score, 0);

  return {
    moduleId,
    moduleTitle: module.title,
    totalEmployees,
    completedCount,
    passRate: totalEmployees > 0 ? Math.round((passedCount / totalEmployees) * 100) : 0,
    averageScore: totalEmployees > 0 ? Math.round(totalScore / totalEmployees) : 0,
  };
}
</write_to_file>