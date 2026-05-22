import { useState } from 'react';

interface LabResult {
  id: string;
  testName: string;
  date: string;
  provider: string;
  status: string;
  results: { name: string; value: string; range: string; flag: string }[];
}

const sampleResults: LabResult[] = [
  {
    id: '1',
    testName: 'Complete Blood Count (CBC)',
    date: 'April 15, 2026',
    provider: 'Dr. Sarah Chen',
    status: 'COMPLETED',
    results: [
      { name: 'WBC', value: '6.2', range: '4.5-11.0 K/uL', flag: 'NORMAL' },
      { name: 'RBC', value: '5.1', range: '4.2-5.8 M/uL', flag: 'NORMAL' },
      { name: 'Hemoglobin', value: '14.5', range: '13.5-17.5 g/dL', flag: 'NORMAL' },
      { name: 'Hematocrit', value: '43%', range: '39-49%', flag: 'NORMAL' },
      { name: 'Platelets', value: '245', range: '150-400 K/uL', flag: 'NORMAL' },
    ],
  },
  {
    id: '2',
    testName: 'Basic Metabolic Panel (BMP)',
    date: 'April 15, 2026',
    provider: 'Dr. Sarah Chen',
    status: 'COMPLETED',
    results: [
      { name: 'Glucose', value: '95', range: '70-100 mg/dL', flag: 'NORMAL' },
      { name: 'Sodium', value: '140', range: '136-145 mEq/L', flag: 'NORMAL' },
      { name: 'Potassium', value: '4.2', range: '3.5-5.1 mEq/L', flag: 'NORMAL' },
      { name: 'Chloride', value: '102', range: '98-107 mEq/L', flag: 'NORMAL' },
    ],
  },
  {
    id: '3',
    testName: 'Lipid Panel',
    date: 'March 10, 2026',
    provider: 'Dr. Sarah Chen',
    status: 'COMPLETED',
    results: [
      { name: 'Total Cholesterol', value: '185', range: '<200 mg/dL', flag: 'NORMAL' },
      { name: 'LDL Cholesterol', value: '98', range: '<100 mg/dL', flag: 'NORMAL' },
      { name: 'HDL Cholesterol', value: '55', range: '>40 mg/dL', flag: 'NORMAL' },
      { name: 'Triglycerides', value: '130', range: '<150 mg/dL', flag: 'NORMAL' },
    ],
  },
];

const pendingResults = [
  { id: '4', testName: 'Vitamin D Panel', orderedDate: 'May 12, 2026', provider: 'Dr. Sarah Chen' },
  { id: '5', testName: 'Thyroid Function (TSH)', orderedDate: 'May 12, 2026', provider: 'Dr. Sarah Chen' },
];

export function LabResults() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const flagColors: Record<string, string> = {
    NORMAL: 'text-green-600',
    HIGH: 'text-red-600',
    LOW: 'text-orange-600',
    'CRITICAL_HIGH': 'text-red-600 font-bold',
    'CRITICAL_LOW': 'text-red-600 font-bold',
  };

  const statusColors: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    REVIEWED: 'bg-blue-100 text-blue-800',
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Lab Results</h1>
      <p className="mt-1 text-sm text-gray-500">View your laboratory test results</p>

      {/* Pending Results Alert */}
      {pendingResults.length > 0 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-yellow-600 text-lg">⏳</span>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Pending Results</h3>
              <ul className="mt-2 text-sm text-yellow-700">
                {pendingResults.map((p) => (
                  <li key={p.id}>
                    {p.testName} - Ordered on {p.orderedDate}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Completed Results */}
      <div className="mt-6 space-y-4">
        {sampleResults.map((lab) => (
          <div key={lab.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <button
              onClick={() => setExpandedId(expandedId === lab.id ? null : lab.id)}
              className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
            >
              <div>
                <div className="flex items-center">
                  <h3 className="text-sm font-medium text-gray-900">{lab.testName}</h3>
                  <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    statusColors[lab.status] || 'bg-gray-100 text-gray-800'
                  }`}>
                    {lab.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{lab.date} - {lab.provider}</p>
              </div>
              <svg
                className={`h-5 w-5 text-gray-400 transition-transform ${
                  expandedId === lab.id ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedId === lab.id && (
              <div className="px-6 pb-4">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-t border-gray-200">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2 pr-4">Test</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2 pr-4">Result</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2 pr-4">Reference Range</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2">Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lab.results.map((r, idx) => (
                      <tr key={idx}>
                        <td className="py-2 pr-4 text-sm text-gray-900">{r.name}</td>
                        <td className="py-2 pr-4 text-sm text-gray-700 font-medium">{r.value}</td>
                        <td className="py-2 pr-4 text-sm text-gray-500">{r.range}</td>
                        <td className={`py-2 text-sm ${flagColors[r.flag] || 'text-gray-500'}`}>{r.flag}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}