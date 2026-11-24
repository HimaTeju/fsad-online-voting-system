import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthResponse, Role } from '../types/auth.types';
import { tokenStorage } from '../utils/tokenStorage';
import { jwtDecode } from 'jwt-decode';
import axiosClient from '../api/axiosClient';

interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  constituencyId?: number;
  constituencyName?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  setAuth: (auth: AuthResponse) => void;
  clearAuth: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

interface JwtPayload {
  sub: string;
  exp: number;
}

function parseToken(token: string): boolean {
  try {
    const { exp } = jwtDecode<JwtPayload>(token);
    return exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    const t = tokenStorage.get();
    return t && parseToken(t) ? t : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const t = tokenStorage.get();
    return !!(t && parseToken(t));
  });

  // On mount, if we have a stored token, fetch /me to restore the user object.
  useEffect(() => {
    const t = tokenStorage.get();
    if (!t || !parseToken(t)) {
      setIsLoading(false);
      return;
    }
    axiosClient.get('/auth/me').then((res) => {
      const u = res.data.data;
      setUser({ id: u.id, email: u.email, fullName: u.fullName, role: u.role, constituencyId: u.constituencyId, constituencyName: u.constituencyName });
    }).catch(() => {
      // Token is invalid/expired and refresh also failed — clear storage.
      tokenStorage.clear();
      setToken(null);
    }).finally(() => {
      setIsLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAuth = (auth: AuthResponse) => {
    tokenStorage.set(auth.accessToken);
    setToken(auth.accessToken);
    setUser({ id: auth.userId, email: auth.email, fullName: auth.fullName, role: auth.role });
  };

  const clearAuth = () => {
    tokenStorage.clear();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, setAuth, clearAuth, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
