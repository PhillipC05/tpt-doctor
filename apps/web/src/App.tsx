import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Patients } from './pages/Patients';
import { Appointments } from './pages/Appointments';
import AuditLogPage from './pages/AuditLog';
import SettingsPage from './pages/Settings';
import { Loading } from './components/Loading';
import { RevenueAnalytics } from './pages/analytics/RevenueAnalytics';
import { AppointmentAnalytics } from './pages/analytics/AppointmentAnalytics';
import { ClinicianProductivity } from './pages/analytics/ClinicianProductivity';
import { DemographicsAnalytics } from './pages/analytics/DemographicsAnalytics';
import { ReferralAnalytics } from './pages/analytics/ReferralAnalytics';
import { CustomReports } from './pages/analytics/CustomReports';
import { InventoryDashboard } from './pages/inventory/InventoryDashboard';

function App() {
  const { isLoading, isAuthenticated, loginWithRedirect } = useAuth0();

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    loginWithRedirect();
    return <Loading />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/audit-log" element={<AuditLogPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/analytics/revenue" element={<RevenueAnalytics />} />
        <Route path="/analytics/appointments" element={<AppointmentAnalytics />} />
        <Route path="/analytics/productivity" element={<ClinicianProductivity />} />
        <Route path="/analytics/demographics" element={<DemographicsAnalytics />} />
        <Route path="/analytics/referrals" element={<ReferralAnalytics />} />
        <Route path="/analytics/reports" element={<CustomReports />} />
        <Route path="/inventory" element={<InventoryDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
