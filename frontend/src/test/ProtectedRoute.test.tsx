import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/common/ProtectedRoute';

// vi.mock must be at top level — Vitest hoists it before any imports
vi.mock('../context/AuthContext', () => ({
  useAuthContext: vi.fn(),
}));

import { useAuthContext } from '../context/AuthContext';
import type { Role } from '../types/auth.types';

function renderProtected(
  children: React.ReactNode,
  { isAuthenticated = false, role = 'VOTER' }: { isAuthenticated?: boolean; role?: Role } = {},
) {
  vi.mocked(useAuthContext).mockReturnValue({
    isAuthenticated,
    user: isAuthenticated ? { id: 1, email: 'a@b.com', fullName: 'Alice', role } : null,
    token: null,
    isLoading: false,
    setAuth: vi.fn(),
    clearAuth: vi.fn(),
  });

  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/unauthorized" element={<div>Unauthorized</div>} />
        <Route path="/protected" element={<ProtectedRoute>{children}</ProtectedRoute>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to /login', () => {
    renderProtected(<div>Secret</div>, { isAuthenticated: false });
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated and no role restriction', () => {
    renderProtected(<div>Secret</div>, { isAuthenticated: true });
    expect(screen.getByText('Secret')).toBeInTheDocument();
  });

  it('renders children when user role is in allowedRoles', () => {
    vi.mocked(useAuthContext).mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'a@b.com', fullName: 'Alice', role: 'VOTER' },
      token: null,
      isLoading: false,
      setAuth: vi.fn(),
      clearAuth: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/unauthorized" element={<div>Unauthorized</div>} />
          <Route
            path="/protected"
            element={<ProtectedRoute allowedRoles={['ADMIN', 'VOTER']}><div>Voter area</div></ProtectedRoute>}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Voter area')).toBeInTheDocument();
  });

  it('redirects to /unauthorized when role is not allowed', () => {
    vi.mocked(useAuthContext).mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, email: 'a@b.com', fullName: 'Alice', role: 'VOTER' },
      token: null,
      isLoading: false,
      setAuth: vi.fn(),
      clearAuth: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/unauthorized" element={<div>Unauthorized</div>} />
          <Route
            path="/protected"
            element={<ProtectedRoute allowedRoles={['ADMIN']}><div>Admin area</div></ProtectedRoute>}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Unauthorized')).toBeInTheDocument();
    expect(screen.queryByText('Admin area')).not.toBeInTheDocument();
  });
});
