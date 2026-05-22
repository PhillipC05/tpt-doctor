import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface AppointmentData {
  period: { start: string; end: string };
  totalSlots: number;
  filledSlots: number;
  fillRate: number;
  cancelledSlots: number;
  noShowSlots: number;
  noShowRate: number;
  peakTimes: { dayOfWeek: number; hour: number; count: number }[];
  byDayOfWeek: { day: number; total: number; filled: number; cancelled: number; noShow: number }[];
  byStaff: { staffId: string; staffName: string; title: string; total: number; filled: number; fillRate: number }[];
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function AppointmentAnalytics() {
  const [data, setData] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/appointments?tenantId=default&periodStart=${periodStart}&periodEnd=${periodEnd}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [periodStart, periodEnd]);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (!data) return <div className="text-red-500 p-4">Failed to load appointment analytics.</div>;

  const dayOfWeekData = data.byDayOfWeek.map(d => ({ ...d, dayName: DAY_NAMES[d.day] }));
  const peakData = data.peakTimes.slice(0, 15).map(p => ({
    ...p,
    label: `${DAY_NAMES[p.dayOfWeek].slice(0, 3)} ${p.hour}:00`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Appointment Utilization</h1>
        <div className="flex gap-3">
          <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
            className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
            className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><div className="p-4"><p className="text-sm text-gray-500">Total Slots</p><p className="text-2xl font-bold">{data.totalSlots}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Fill Rate</p><p className="text-2xl font-bold text-green-600">{data.fillRate.toFixed(1)}%</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Cancelled</p><p className="text-2xl font-bold text-yellow-500">{data.cancelledSlots}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">No-Shows</p><p className="text-2xl font-bold text-red-500">{data.noShowSlots}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">No-Show Rate</p><p className="text-2xl font-bold">{data.noShowRate.toFixed(1)}%</p></div></Card>
      </div>

      {/* By Day of Week */}
      <Card><div className="p-6">
        <h3 className="text-lg font-medium mb-4">Appointments by Day of Week</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dayOfWeekData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dayName" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="filled" fill="#10b981" name="Filled" stackId="a" />
            <Bar dataKey="cancelled" fill="#f59e0b" name="Cancelled" stackId="a" />
            <Bar dataKey="noShow" fill="#ef4444" name="No-Show" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div></Card>

      {/* Peak Times */}
      <Card><div className="p-6">
        <h3 className="text-lg font-medium mb-4">Peak Appointment Times</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={peakData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" name="Appointments" />
          </BarChart>
        </ResponsiveContainer>
      </div></Card>

      {/* By Staff */}
      <Card><div className="p-6">
        <h3 className="text-lg font-medium mb-4">Staff Utilization</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead><tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Filled</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fill Rate</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.byStaff.map(s => (
                <tr key={s.staffId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm font-medium">{s.staffName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{s.title || '—'}</td>
                  <td className="px-4 py-3 text-sm text-right">{s.total}</td>
                  <td className="px-4 py-3 text-sm text-right">{s.filled}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">{s.fillRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div></Card>
    </div>
  );
}