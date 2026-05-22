// ============================================================================
// TPT Doctor — Layout Component Tests
// ============================================================================

import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Layout } from '../../components/Layout';

// Mock auth0-react
jest.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    isAuthenticated: true,
    user: { name: 'Dr. Smith', email: 'smith@clinic.com' },
    logout: jest.fn(),
    loginWithRedirect: jest.fn(),
    getAccessTokenSilently: jest.fn(),
  }),
}));

describe('Layout Component', () => {
  const renderLayout = () => {
    return render(
      <BrowserRouter>
        <Layout>
          <div data-testid="child-content">Test Content</div>
        </Layout>
      </BrowserRouter>,
    );
  };

  it('should render without crashing', () => {
    renderLayout();
    expect(screen.getByText('TPT Doctor')).toBeTruthy();
  });

  it('should render navigation links', () => {
    renderLayout();
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Patients')).toBeTruthy();
    expect(screen.getByText('Appointments')).toBeTruthy();
  });

  it('should display user name when authenticated', () => {
    renderLayout();
    expect(screen.getByText('Dr. Smith')).toBeTruthy();
  });

  it('should render child content', () => {
    renderLayout();
    expect(screen.getByTestId('child-content')).toBeTruthy();
    expect(screen.getByText('Test Content')).toBeTruthy();
  });

  it('should have a sidebar with navigation', () => {
    renderLayout();
    const nav = screen.getByRole('navigation');
    expect(nav).toBeTruthy();
  });

  it('should include Settings navigation link', () => {
    renderLayout();
    expect(screen.getByText('Settings')).toBeTruthy();
  });
});