import axiosClient from './axiosClient';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types/auth.types';

export interface CandidateRegistrationData {
  fullName: string;
  email: string;
  phone?: string;
  electionId: number;
  constituencyId: number;
  partyName?: string;
  manifesto: string;
  education?: string;
  criminalRecord?: string;
}

export const authApi = {
  register: (data: RegisterRequest) => axiosClient.post('/auth/register', data),
  login: (data: LoginRequest) => axiosClient.post<{ data: AuthResponse }>('/auth/login', data),
  logout: () => axiosClient.post('/auth/logout'),
  forgotPassword: (email: string) => axiosClient.post('/auth/forgot-password', { email }),
  resetPassword: (email: string, otp: string, newPassword: string) =>
    axiosClient.post('/auth/reset-password', { email, otp, newPassword }),
  me: () => axiosClient.get('/auth/me'),

  requestVoterIdOtp: (voterIdNumber: string) =>
    axiosClient.post('/auth/voter-id/request-otp', { voterIdNumber }),
  verifyVoterIdOtp: (voterIdNumber: string, otp: string) =>
    axiosClient.post<{ data: AuthResponse }>('/auth/voter-id/verify', { voterIdNumber, otp }),
  registerCandidate: (data: CandidateRegistrationData) =>
    axiosClient.post('/auth/candidate/register', data),

  // Account-claim flow for existing Voter ID holders
  claimLookup: (voterIdNumber: string) =>
    axiosClient.post<{ data: { voterIdNumber: string; fullName: string; constituencyName: string; gender: string | null } }>(
      '/auth/claim/lookup', { voterIdNumber }
    ),
  claimSendOtp: (voterIdNumber: string, email: string) =>
    axiosClient.post('/auth/claim/send-otp', { voterIdNumber, email }),
  claimVerify: (voterIdNumber: string, otp: string, password: string) =>
    axiosClient.post<{ data: AuthResponse }>('/auth/claim/verify', { voterIdNumber, otp, password }),
};


