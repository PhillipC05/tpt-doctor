import { useState } from 'react';

interface Consent {
  id: string;
  type: string;
  description: string;
  isGranted: boolean;
  grantedDate: string;
  required: boolean;
}

const consentTypes: Consent[] = [
  {
    id: '1',
    type: 'Treatment',
    description: 'Consent to receive medical treatment and healthcare services',
    isGranted: true,
    grantedDate: 'January 1, 2026',
    required: true,
  },
  {
    id: '2',
    type: 'Payment',
    description: 'Consent to bill your insurance and process payments for services',
    isGranted: true,
    grantedDate: 'January 1, 2026',
    required: true,
  },
  {
    id: '3',
    type: 'Healthcare Operations',
    description: 'Consent to use your information for practice operations and quality improvement',
    isGranted: true,
    grantedDate: 'January 1, 2026',
    required: true,
  },
  {
    id: '4',
    type: 'Telemedicine',
    description: 'Consent to participate in video-based telehealth consultations',
    isGranted: true,
    grantedDate: 'January 1, 2026',
    required: false,
  },
  {
    id: '5',
    type: 'Research',
    description: 'Consent to use de-identified data for medical research purposes',
    isGranted: false,
    grantedDate: '',
    required: false,
  },
  {
    id: '6',
    type: 'Marketing',
    description: 'Consent to receive marketing communications about health services',
    isGranted: false,
    grantedDate: '',
    required: false,
  },
  {
    id: '7',
    type: 'Recording',
    description: 'Consent to record consultations for quality assurance and training',
    isGranted: false,
    grantedDate: '',
    required: false,
  },
];

export function Consents() {
  const [consents, setConsents] = useState<Consent[]>(consentTypes);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);

  const toggleConsent = (id: string) => {
    setConsents(consents.map((c) =>
      c.id === id
        ? { ...c, isGranted: !c.isGranted, grantedDate: !c.isGranted ? new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '' }
        : c
    ));
  };

  const grantedCount = consents.filter((c) => c.isGranted).length;
  const requiredGranted = consents.filter((c) => c.required).every((c) => c.isGranted);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Consents & Privacy</h1>
      <p className="mt-1 text-sm text-gray-500">Manage your privacy preferences and consents</p>

      {/* Consent Summary */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-blue-600">{grantedCount}/{consents.length}</p>
          <p className="text-xs text-gray-500 mt-1">Consents Granted</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-green-600">{requiredGranted ? 'Complete' : 'Incomplete'}</p>
          <p className="text-xs text-gray-500 mt-1">Required Consents</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-purple-600">Active</p>
          <p className="text-xs text-gray-500 mt-1">Consent Status</p>
        </div>
      </div>

      {/* Consent List */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Consent Preferences</h2>
          <p className="mt-1 text-sm text-gray-500">
            Review and manage your consent preferences. Required consents must be granted to receive care.
          </p>
        </div>
        <div className="divide-y divide-gray-200">
          {consents.map((consent) => (
            <div key={consent.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-gray-900">{consent.type}</h3>
                  {consent.required && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      Required
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">{consent.description}</p>
                {consent.grantedDate && (
                  <p className="text-xs text-gray-400 mt-1">Granted on {consent.grantedDate}</p>
                )}
              </div>
              <div className="ml-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent.isGranted}
                    onChange={() => toggleConsent(consent.id)}
                    disabled={consent.required && consent.isGranted}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"></div>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4">
          <h2 className="text-lg font-medium text-gray-900">Privacy Notice</h2>
          <p className="mt-2 text-sm text-gray-600">
            We are committed to protecting your health information. Our Notice of Privacy Practices
            describes how your medical information may be used and disclosed, and how you can access
            your information.
          </p>
          <button
            onClick={() => setShowPrivacyNotice(!showPrivacyNotice)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showPrivacyNotice ? 'Hide privacy notice' : 'Read full privacy notice'}
          </button>
          {showPrivacyNotice && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-600 space-y-3">
              <p>
                <strong>Your Rights:</strong> You have the right to access, amend, and request
                restrictions on your health information. You may request an accounting of disclosures
                and request confidential communications.
              </p>
              <p>
                <strong>Our Responsibilities:</strong> We are required by law to maintain the privacy
                and security of your protected health information. We will notify you in the event of
                a breach of your unsecured PHI.
              </p>
              <p>
                <strong>Uses and Disclosures:</strong> We may use your health information for treatment,
                payment, and healthcare operations as described in our full Notice of Privacy Practices.
              </p>
              <p className="text-xs text-gray-400">
                Last updated: January 1, 2026 | Effective date: January 1, 2026
              </p>
            </div>
          )}
        </div>
      </div>

      {/* HIPAA Rights */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-blue-600 text-lg">🔒</span>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Your HIPAA Privacy Rights</h3>
            <ul className="mt-2 text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Right to access your medical records within 30 days</li>
              <li>Right to request amendment to your health information</li>
              <li>Right to request restrictions on certain uses and disclosures</li>
              <li>Right to receive an accounting of disclosures</li>
              <li>Right to request confidential communications</li>
              <li>Right to file a complaint if you believe your privacy rights have been violated</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}