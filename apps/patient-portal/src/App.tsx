import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { MedicalRecords } from './pages/MedicalRecords';
import { LabResults } from './pages/LabResults';
import { Appointments } from './pages/Appointments';
import { Messages } from './pages/Messages';
import { Profile } from './pages/Profile';
import { Consents } from './pages/Consents';
import { Loading } from './components/Loading';

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
        <Route path="/records" element={<MedicalRecords />} />
        <Route path="/lab-results" element={<LabResults />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/consents" element={<Consents />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;