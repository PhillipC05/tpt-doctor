import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#ec4899', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#14b8a6', '#f97316'];

interface DemographicsData {
  totalPatients: number;
  byGender: Record<string, number>;
  byAgeGroup: Record<string, number>;
  byInsuranceType: Record<string, number>;
  topChronicConditions: { code: string; count: number }[];
}

export function DemographicsAnalytics() {
  const [data, setData] = useState<DemographicsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/demographics?tenantId=default')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (!data) return <div className="text-red-500 p-4">Failed to load demographics.</div>;

  const genderData = Object.entries(data.byGender).map(([name, value]) => ({ name, value }));
  const ageData = Object.entries(data.byAgeGroup).map(([name, value]) => ({ name, value }));
  const insuranceData = Object.entries(data.byInsuranceType).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Patient Demographics & Population Health</h1>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><div className="p-4"><p className="text-sm text-gray-500">Total Active Patients</p><p className="text-3xl font-bold">{data.totalPatients}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Chronic Conditions Tracked</p><p className="text-3xl font-bold">{data.topChronicConditions.length}</p></div></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Distribution */}
        <Card><div className="p-6">
          <h3 className="text-lg font-medium mb-4">Age Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" name="Patients" />
            </BarChart>
          </ResponsiveContainer>
        </div></Card>

        {/* Gender Distribution */}
        <Card><div className="p-6">
          <h3 className="text-lg font-medium mb-4">Gender Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div></Card>

        {/* Insurance Distribution */}
        <Card><div className="p-6">
          <h3 className="text-lg font-medium mb-4">Insurance Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={insuranceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {insuranceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div></Card>

        {/* Chronic Conditions */}
        <Card><div className="p-6">
          <h3 className="text-lg font-medium mb-4">Top Chronic Conditions</h3>
          {data.topChronicConditions.length > 0 ? (
            <div className="space-y-2">
              {data.topChronicConditions.slice(0, 10).map((c, i) => (
                <div key={c.code} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400 w-5">{i + 1}.</span>
                    <span className="text-sm">{c.code}</span>
                  </div>
                  <span className="text-sm font-semibold">{c.count} patients</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No chronic condition data available.</p>
          )}
        </div></Card>
      </div>
    </div>
  );
}