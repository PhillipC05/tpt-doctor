import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardContent } from '../components/ui';
import { DataTable, Column } from '../components/ui/Table';
import { Badge, Input, Select, Button } from '../components/ui';
import { AuditLogEntry } from '@tpt-doctor/shared';
import { formatDate } from '../lib/utils';
import { Search, Download } from 'lucide-react';

const MOCK_DATA: AuditLogEntry[] = [
  {
    id: '1', tenantId: 't1', userId: 'u1', action: 'LOGIN' as any,
    resource: 'auth', resourceId: 'u1', details: { ip: '192.168.1.1' },
    ipAddress: '192.168.1.1', userAgent: 'Chrome', timestamp: new Date().toISOString(),
    tamperHash: 'abc', previousHash: 'def',
  },
  {
    id: '2', tenantId: 't1', userId: 'u2', action: 'VIEW_PHI' as any,
    resource: 'patient', resourceId: 'p1', details: { patientId: 'p1' },
    ipAddress: '192.168.1.2', userAgent: 'Firefox', timestamp: new Date(Date.now() - 3600000).toISOString(),
    tamperHash: 'abc', previousHash: 'def',
  },
  {
    id: '3', tenantId: 't1', userId: 'u1', action: 'UPDATE' as any,
    resource: 'ehr', resourceId: 'e1', details: { field: 'diagnosis' },
    ipAddress: '192.168.1.1', userAgent: 'Chrome', timestamp: new Date(Date.now() - 7200000).toISOString(),
    tamperHash: 'abc', previousHash: 'def',
  },
];

const actionColors: Record<string, string> = {
  CREATE: 'success',
  READ: 'info',
  UPDATE: 'warning',
  DELETE: 'danger',
  LOGIN: 'default',
  LOGOUT: 'gray',
  EXPORT: 'purple',
  PRINT: 'purple',
  VIEW_PHI: 'danger',
  CONSENT_GRANTED: 'success',
  CONSENT_REVOKED: 'warning',
  DATA_BREACH: 'danger',
};

export default function AuditLogPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);

  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      render: (entry) => (
        <span className="text-sm text-gray-600">{formatDate(entry.timestamp, 'datetime')}</span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (entry) => (
        <Badge variant={(actionColors[entry.action] || 'gray') as any}>
          {entry.action}
        </Badge>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (entry) => <span className="font-medium">{entry.userId}</span>,
    },
    {
      key: 'resource',
      header: 'Resource',
      render: (entry) => (
        <span className="text-gray-600">
          {entry.resource}/{entry.resourceId}
        </span>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      hideOnMobile: true,
      render: (entry) => <span className="text-gray-500 text-xs font-mono">{entry.ipAddress}</span>,
    },
    {
      key: 'details',
      header: 'Details',
      hideOnMobile: true,
      render: (entry) => (
        <span className="text-gray-500 text-xs truncate max-w-[200px] block">
          {JSON.stringify(entry.details)}
        </span>
      ),
    },
  ];

  const filteredData = MOCK_DATA.filter((entry) => {
    if (actionFilter !== 'all' && entry.action !== actionFilter) return false;
    if (search && !JSON.stringify(entry).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('nav.auditLog') || 'Audit Log'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track all security-sensitive actions across the system
          </p>
        </div>
        <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>
          Export
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search audit log..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Actions' },
                  { value: 'CREATE', label: 'Create' },
                  { value: 'READ', label: 'Read' },
                  { value: 'UPDATE', label: 'Update' },
                  { value: 'DELETE', label: 'Delete' },
                  { value: 'LOGIN', label: 'Login' },
                  { value: 'VIEW_PHI', label: 'View PHI' },
                  { value: 'EXPORT', label: 'Export' },
                ]}
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredData}
            keyExtractor={(item) => item.id}
            page={page}
            pageSize={10}
            total={filteredData.length}
            onPageChange={setPage}
            emptyMessage="No audit log entries found"
          />
        </CardContent>
      </Card>
    </div>
  );
}