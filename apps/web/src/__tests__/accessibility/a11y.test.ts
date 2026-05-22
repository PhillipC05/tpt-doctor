// ============================================================================
// TPT Doctor — Accessibility Testing (axe-core)
// ============================================================================

import { describe, it, expect } from '@jest/globals';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Layout } from '../../components/Layout';
import { Dashboard } from '../../pages/Dashboard';
import { Patients } from '../../pages/Patients';
import { Appointments } from '../../pages/Appointments';

expect.extend(toHaveNoViolations);

jest.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    isAuthenticated: true,
    user: { name: 'Dr. Smith', email: 'smith@clinic.com' },
    logout: jest.fn(),
    loginWithRedirect: jest.fn(),
    getAccessTokenSilently: jest.fn(),
  }),
}));

describe('Accessibility Tests', () => {
  it('Layout component should have no accessibility violations', async () => {
    const { container } = render(
      <BrowserRouter>
        <Layout><div>Content</div></Layout>
      </BrowserRouter>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Dashboard page should have no accessibility violations', async () => {
    const { container } = render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Patients page should have no accessibility violations', async () => {
    const { container } = render(
      <BrowserRouter>
        <Patients />
      </BrowserRouter>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Appointments page should have no accessibility violations', async () => {
    const { container } = render(
      <BrowserRouter>
        <Appointments />
      </BrowserRouter>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});