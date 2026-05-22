// ============================================================================
// TPT Doctor — Dashboard Page Component Tests
// ============================================================================

import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from '../../pages/Dashboard';

jest.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    isAuthenticated: true,
    user: { name: 'Dr. Smith' },
    getAccessTokenSilently: jest.fn().mockResolvedValue('token'),
  }),
}));

describe('Dashboard Page', () => {
  it('should render without crashing', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );
    expect(screen.getByText(/dashboard/i)).toBeTruthy();
  });

  it('should display key metric cards', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );
    // Should show various dashboard KPIs
    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
  });
});