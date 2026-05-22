import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface ClinicianData {
  staffId: string;
  staffName: string;
  title: string;
  totalEncounters: number;
  encountersPerDay: number;
  newPatients: number;
  followUpPatients: number;
  telemedicineEncounters: number;
  totalRVUs: number;
  rvusPerEncounter: number;
  rvusPerDay: number;
  totalAppointments: number;
  completedAppointments: number;
  noShowRate: number;
  onTimeRate: number;
}

export function ClinicianProductivity() {
  const [data, setData] = useState<ClinicianData[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/productivity?tenantId=default&periodStart=${periodStart}&periodEnd=${periodEnd}`)
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [periodStart, periodEnd]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Clinician Productivity</h1>
        <div className="flex gap-3">
          <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
            className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
            className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        </div>
      </div>

      {/* Staff Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map(s => (
          <Card key={s.staffId}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{s.staffName}</p>
                  <p className="text-xs text-gray-500">{s.title || 'Staff'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Encounters:</span> <span className="font-medium">{s.totalEncounters}</span></div>
                <div><span className="text-gray-500">Per Day:</span> <span className="font-medium">{s.encountersPerDay}</span></div>
                <div><span className="text-gray-500">RVUs:</span> <span className="font-medium">{s.totalRVUs}</span></div>
                <div><span className="text-gray-500">RVU/Day:</span> <span className="font-medium">{s.rvusPerDay}</span></div>
                <div><span className="text-gray-500">No-Show:</span> <span className="font-medium text-red-500">{s.noShowRate.toFixed(1)}%</span></div>
                <div><span className="text-gray-500">On-Time:</span> <span className="font-medium text-green-600">{s.onTimeRate.toFixed(1)}%</span></div>
              </div>
            </div>
          </Card>
        ))}
        {data.length === 0 && <div className="col-span-full text-center py-12 text-gray-500">No clinician data available for this period.</div>}
      </div>

      {/* Encounters Comparison */}
      {data.length > 0 && (
        <>
          <Card><div className="p-6">
            <h3 className="text-lg font-medium mb-4">Encounters Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="staffName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalEncounters" fill="#3b82f6" name="Total Encounters" />
                <Bar dataKey="newPatients" fill="#10b981" name="New Patients" />
                <Bar dataKey="telemedicineEncounters" fill="#8b5cf6" name="Telemedicine" />
              </BarChart>
            </ResponsiveContainer>
          </div></Card>

          {/* RVU Comparison */}
          <Card><div className="p-6">
            <h3 className="text-lg font-medium mb-4">RVU Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="staffName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalRVUs" fill="#f59e0b" name="Total RVUs" />
                <Bar dataKey="rvusPerDay" fill="#14b8a6" name="RVUs per Day" />
              </BarChart>
            </ResponsiveContainer>
          </div></Card>

          {/* Detailed Table */}
          <Card><div className="p-6">
            <h3 className="text-lg font-medium mb-4">Detailed Productivity Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead><tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Staff</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Encounters</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">New</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Follow-Up</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Telehealth</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Total RVUs</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Appts</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">No-Show%</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data.map(s => (
                    <tr key={s.staffId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 py-2 font-medium">{s.staffName}</td>
                      <td className="px-3 py-2 text-right">{s.totalEncounters}</td>
                      <td className="px-3 py-2 text-right">{s.newPatients}</td>
                      <td className="px-3 py-2 text-right">{s.followUpPatients}</td>
                      <td className="px-3 py-2 text-right">{s.telemedicineEncounters}</td>
                      <td className="px-3 py-2 text-right font-semibold">{s.totalRVUs.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right">{s.totalAppointments}</td>
                      <td className="px-3 py-2 text-right text-red-500">{s.noShowRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div></Card>
        </>
      )}
    </div>
  );
}