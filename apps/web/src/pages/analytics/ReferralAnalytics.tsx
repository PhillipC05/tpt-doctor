import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

interface ReferralData {
  period: { start: string; end: string };
  total: number;
  sent: number;
  completed: number;
  conversionRate: number;
  byStatus: Record<string, number>;
  bySpecialty: { specialty: string; count: number }[];
  byReferrer: { referrer: string; count: number }[];
  averageWaitDays: number;
}

export function ReferralAnalytics() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/referrals?tenantId=default&periodStart=${periodStart}&periodEnd=${periodEnd}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [periodStart, periodEnd]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (!data) return <div className="text-red-500 p-4">Failed to load referral analytics.</div>;

  const statusData = Object.entries(data.byStatus).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Referral Analytics</h1>
        <div className="flex gap-3">
          <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
            className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
            className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><div className="p-4"><p className="text-sm text-gray-500">Total Referrals</p><p className="text-2xl font-bold">{data.total}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Sent</p><p className="text-2xl font-bold text-blue-600">{data.sent}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Completed</p><p className="text-2xl font-bold text-green-600">{data.completed}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Conversion Rate</p><p className="text-2xl font-bold">{data.conversionRate.toFixed(1)}%</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Avg Wait Days</p><p className="text-2xl font-bold">{data.averageWaitDays} days</p></div></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Status */}
        <Card><div className="p-6">
          <h3 className="text-lg font-medium mb-4">Referral Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div></Card>

        {/* By Specialty */}
        <Card><div className="p-6">
          <h3 className="text-lg font-medium mb-4">Referrals by Specialty</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.bySpecialty.slice(0, 10)} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="specialty" width={90} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" name="Referrals" />
            </BarChart>
          </ResponsiveContainer>
        </div></Card>

        {/* Top Referrers */}
        <Card><div className="p-6">
          <h3 className="text-lg font-medium mb-4">Top Referrers</h3>
          <div className="space-y-2">
            {data.byReferrer.slice(0, 10).map((r, i) => (
              <div key={r.referrer} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400 w-5">{i + 1}.</span>
                  <span className="text-sm">{r.referrer}</span>
                </div>
                <span className="text-sm font-semibold">{r.count} referrals</span>
              </div>
            ))}
          </div>
        </div></Card>

        {/* Status Table */}
        <Card><div className="p-6">
          <h3 className="text-lg font-medium mb-4">Status Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead><tr>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Count</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {statusData.map(s => (
                  <tr key={s.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-2 capitalize">{s.name.toLowerCase()}</td>
                    <td className="px-3 py-2 text-right font-medium">{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div></Card>
      </div>
    </div>
  );
}