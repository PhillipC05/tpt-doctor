import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { formatCurrency } from '../../lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

interface RevenueData {
  period: { start: string; end: string };
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  netRevenue: number;
  collectionRate: number;
  payerMix: { payer: string; billed: number; collected: number; count: number }[];
  procedureRevenue: { code: string; revenue: number; count: number }[];
  totalAR: number;
  arDaysOutstanding: number;
  averageClaimAge: number;
}

export function RevenueAnalytics() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/revenue?tenantId=default&periodStart=${periodStart}&periodEnd=${periodEnd}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [periodStart, periodEnd]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (!data) return <div className="text-red-500 p-4">Failed to load revenue analytics.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Revenue Analytics</h1>
        <div className="flex gap-3">
          <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
            className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
            className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><div className="p-4"><p className="text-sm text-gray-500">Total Billed</p><p className="text-2xl font-bold">{formatCurrency(data.totalBilled)}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Total Collected</p><p className="text-2xl font-bold text-green-600">{formatCurrency(data.totalCollected)}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Outstanding</p><p className="text-2xl font-bold text-red-500">{formatCurrency(data.totalOutstanding)}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Collection Rate</p><p className="text-2xl font-bold">{data.collectionRate.toFixed(1)}%</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Net Revenue</p><p className="text-2xl font-bold">{formatCurrency(data.netRevenue)}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">A/R Days Outstanding</p><p className="text-2xl font-bold">{data.arDaysOutstanding.toFixed(1)}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Total A/R</p><p className="text-2xl font-bold">{formatCurrency(data.totalAR)}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Avg Claim Age</p><p className="text-2xl font-bold">{data.averageClaimAge} days</p></div></Card>
      </div>

      {/* Payer Mix */}
      <Card><div className="p-6">
        <h3 className="text-lg font-medium mb-4">Payer Mix</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={data.payerMix} dataKey="billed" nameKey="payer" cx="50%" cy="50%" outerRadius={100} label>
                {data.payerMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {data.payerMix.map((p, i) => (
              <div key={p.payer} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-sm font-medium">{p.payer}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(p.billed)}</p>
                  <p className="text-xs text-gray-500">{p.count} claims</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div></Card>

      {/* Top Procedures */}
      <Card><div className="p-6">
        <h3 className="text-lg font-medium mb-4">Top Procedures by Revenue</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data.procedureRevenue.slice(0, 15)} margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="code" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      </div></Card>
    </div>
  );
}