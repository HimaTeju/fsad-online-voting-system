import { useAuthContext } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import type { LoginRequest, RegisterRequest } from '../types/auth.types';
import { useNavigate } from 'react-router-dom';
import { ROLE_HOME } from '../utils/roleUtils';

export function useAuth() {
  const ctx = useAuthContext();
  const navigate = useNavigate();

  const login = async (data: LoginRequest) => {
    const res = await authApi.login(data);
    ctx.setAuth(res.data.data);
    navigate(ROLE_HOME[res.data.data.role]);
  };

  const register = async (data: RegisterRequest) => {
    await authApi.register(data);
  };

  const logout = async () => {
    await authApi.logout().catch(() => {});
    ctx.clearAuth();
    navigate('/login');
  };

  return { ...ctx, login, register, logout };
}
