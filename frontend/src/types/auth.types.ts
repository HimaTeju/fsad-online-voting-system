export interface User {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  role: Role;
  active: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export type Role = 'VOTER' | 'CANDIDATE' | 'ADMIN' | 'FIELD_OFFICER';

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  userId: number;
  email: string;
  fullName: string;
  role: Role;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}
