import { useState } from 'react';

interface MedicalRecord {
  id: string;
  date: string;
  type: string;
  provider: string;
  description: string;
  details: string;
}

const sampleRecords: MedicalRecord[] = [
  {
    id: '1',
    date: 'May 5, 2026',
    type: 'Office Visit',
    provider: 'Dr. Sarah Chen',
    description: 'Annual physical examination',
    details: 'Blood pressure: 120/80, Heart rate: 72 bpm. All vitals within normal range. Recommended continue current diet and exercise regimen.',
  },
  {
    id: '2',
    date: 'April 15, 2026',
    type: 'Lab Results',
    provider: 'Dr. Sarah Chen',
    description: 'Complete Blood Count (CBC)',
    details: 'All results within normal range. WBC: 6.2, RBC: 5.1, Hemoglobin: 14.5, Hematocrit: 43%.',
  },
  {
    id: '3',
    date: 'March 1, 2026',
    type: 'Consultation',
    provider: 'Dr. James Wilson',
    description: 'Allergy consultation',
    details: 'Patient reports seasonal allergies. Prescribed cetirizine 10mg daily as needed. Follow up in 3 months if symptoms persist.',
  },
  {
    id: '4',
    date: 'January 10, 2026',
    type: 'Immunization',
    provider: 'Nurse Emily Thompson',
    description: 'Influenza vaccine administered',
    details: 'Fluzone Quadrivalent 0.5mL IM, left deltoid. Lot #FL2025-1234. Patient tolerated well, no adverse reactions.',
  },
];

export function MedicalRecords() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const typeColors: Record<string, string> = {
    'Office Visit': 'bg-blue-100 text-blue-800',
    'Lab Results': 'bg-green-100 text-green-800',
    Consultation: 'bg-purple-100 text-purple-800',
    Immunization: 'bg-yellow-100 text-yellow-800',
    Procedure: 'bg-red-100 text-red-800',
    'Follow-up': 'bg-indigo-100 text-indigo-800',
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Medical Records</h1>
      <p className="mt-1 text-sm text-gray-500">View your medical history and clinical notes</p>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{sampleRecords.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Records</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {sampleRecords.filter((r) => r.type === 'Lab Results').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Lab Results</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">
            {sampleRecords.filter((r) => r.type === 'Office Visit').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Office Visits</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">
            {sampleRecords.filter((r) => r.type === 'Immunization').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Immunizations</p>
        </div>
      </div>

      {/* Records List */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="divide-y divide-gray-200">
          {sampleRecords.map((record) => (
            <div key={record.id}>
              <button
                onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          typeColors[record.type] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {record.type}
                      </span>
                      <h3 className="ml-3 text-sm font-medium text-gray-900">{record.description}</h3>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{record.provider}</p>
                    <p className="text-sm text-gray-400">{record.date}</p>
                  </div>
                  <svg
                    className={`h-5 w-5 text-gray-400 transition-transform ${
                      expandedId === record.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {expandedId === record.id && (
                <div className="px-6 pb-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.details}</p>
                    <button className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
                      Request Full Record
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}