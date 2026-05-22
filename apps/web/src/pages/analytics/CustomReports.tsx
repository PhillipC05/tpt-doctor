import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';

interface SavedReport {
  id: string;
  name: string;
  description: string;
  category: string;
  format: string;
  isScheduled: boolean;
  scheduleFrequency: string | null;
  reportConfig: any;
  createdAt: string;
  updatedAt: string;
}

const REPORT_TYPES = [
  { value: 'revenue', label: 'Revenue Analytics' },
  { value: 'appointments', label: 'Appointment Utilization' },
  { value: 'productivity', label: 'Clinician Productivity' },
  { value: 'demographics', label: 'Patient Demographics' },
  { value: 'referrals', label: 'Referral Analytics' },
];

export function CustomReports() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'revenue',
    format: 'TABLE' as const,
    isScheduled: false,
    scheduleFrequency: '',
    reportConfig: { reportType: 'revenue', periodStart: '', periodEnd: '' },
  });

  const loadReports = () => {
    setLoading(true);
    fetch('/api/analytics/reports?tenantId=default')
      .then(r => r.json())
      .then(d => { setReports(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadReports(); }, []);

  const handleCreate = async () => {
    const res = await fetch('/api/analytics/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tenantId: 'default', createdBy: 'admin' }),
    });
    if (res.ok) {
      setShowModal(false);
      loadReports();
      setForm({ name: '', description: '', category: 'revenue', format: 'TABLE', isScheduled: false, scheduleFrequency: '', reportConfig: { reportType: 'revenue', periodStart: '', periodEnd: '' } });
    }
  };

  const handleExecute = async (id: string) => {
    setExecutingId(id);
    setResult(null);
    const res = await fetch(`/api/analytics/reports/${id}/execute?tenantId=default`, { method: 'POST' });
    const data = await res.json();
    setResult(data);
    setExecutingId(null);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/analytics/reports/${id}?tenantId=default`, { method: 'DELETE' });
    loadReports();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Custom Report Builder</h1>
        <Button onClick={() => setShowModal(true)}>Create New Report</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>
      ) : reports.length === 0 ? (
        <Card><div className="p-12 text-center text-gray-500">No saved reports yet. Click "Create New Report" to build one.</div></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map(r => (
            <Card key={r.id}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{r.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{r.description}</p>
                  </div>
                  <Badge variant={r.isScheduled ? 'success' : 'default'}>
                    {r.isScheduled ? 'Scheduled' : 'Manual'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                  <Badge>{r.category}</Badge>
                  <span>Updated {new Date(r.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" onClick={() => handleExecute(r.id)} disabled={executingId === r.id}>
                    {executingId === r.id ? 'Running...' : 'Run'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(r.id)}>Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Report Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New Report">
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-sm font-medium mb-1">Report Name</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Report Type</label>
            <select value={form.category} onChange={e => {
              const newType = e.target.value;
              setForm(f => ({ ...f, category: newType, reportConfig: { ...f.reportConfig, reportType: newType } }));
            }}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
              {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isScheduled} onChange={e => setForm(f => ({ ...f, isScheduled: e.target.checked }))} />
              Schedule this report
            </label>
          </div>
          {form.isScheduled && (
            <div>
              <label className="block text-sm font-medium mb-1">Frequency</label>
              <select value={form.scheduleFrequency} onChange={e => setForm(f => ({ ...f, scheduleFrequency: e.target.value }))}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
                <option value="">Select frequency</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
              </select>
            </div>
          )}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleCreate}>Create Report</Button>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Execution Result */}
      {result && (
        <Card><div className="p-6">
          <h3 className="text-lg font-medium mb-2">Execution Result</h3>
          <pre className="bg-gray-50 dark:bg-gray-700 p-4 rounded text-sm overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div></Card>
      )}
    </div>
  );
}