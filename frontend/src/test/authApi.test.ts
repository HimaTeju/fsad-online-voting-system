import { describe, it, expect, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { authApi } from '../api/authApi';
import axiosClient from '../api/axiosClient';

const mock = new MockAdapter(axiosClient);

afterEach(() => {
  mock.reset();
});

describe('authApi', () => {
  describe('register', () => {
    it('posts to /auth/register with the provided data', async () => {
      const payload = { email: 'a@b.com', password: 'pass123', fullName: 'Alice', phone: '9999999999' };
      mock.onPost('/auth/register').reply(201, { data: { id: 1, email: 'a@b.com' } });

      const res = await authApi.register(payload as never);
      expect(res.status).toBe(201);
      expect(mock.history.post[0].url).toBe('/auth/register');
      expect(JSON.parse(mock.history.post[0].data)).toMatchObject({ email: 'a@b.com' });
    });

    it('rejects when the server returns 409', async () => {
      mock.onPost('/auth/register').reply(409, { message: 'Email already registered' });
      await expect(authApi.register({} as never)).rejects.toMatchObject({ response: { status: 409 } });
    });
  });

  describe('login', () => {
    it('posts to /auth/login and returns auth response', async () => {
      const authResponse = { accessToken: 'tok', userId: 1, email: 'a@b.com', fullName: 'Alice', role: 'VOTER' };
      mock.onPost('/auth/login').reply(200, { data: authResponse });

      const res = await authApi.login({ email: 'a@b.com', password: 'pass123' });
      expect(res.data).toEqual({ data: authResponse });
    });
  });

  describe('logout', () => {
    it('posts to /auth/logout', async () => {
      mock.onPost('/auth/logout').reply(200);
      const res = await authApi.logout();
      expect(res.status).toBe(200);
      expect(mock.history.post[0].url).toBe('/auth/logout');
    });
  });

  describe('forgotPassword', () => {
    it('sends email wrapped in body to /auth/forgot-password', async () => {
      mock.onPost('/auth/forgot-password').reply(200);
      await authApi.forgotPassword('a@b.com');
      expect(JSON.parse(mock.history.post[0].data)).toEqual({ email: 'a@b.com' });
    });
  });

  describe('resetPassword', () => {
    it('posts email, otp and newPassword to /auth/reset-password', async () => {
      mock.onPost('/auth/reset-password').reply(200);
      await authApi.resetPassword('a@b.com', '123456', 'newPass1');
      expect(JSON.parse(mock.history.post[0].data)).toEqual({
        email: 'a@b.com',
        otp: '123456',
        newPassword: 'newPass1',
      });
    });
  });

  describe('me', () => {
    it('calls GET /auth/me', async () => {
      mock.onGet('/auth/me').reply(200, { data: { id: 1 } });
      const res = await authApi.me();
      expect(res.status).toBe(200);
    });
  });

  describe('requestVoterIdOtp', () => {
    it('posts voterIdNumber to /auth/voter-id/request-otp', async () => {
      mock.onPost('/auth/voter-id/request-otp').reply(200);
      await authApi.requestVoterIdOtp('KA/01/123456');
      expect(JSON.parse(mock.history.post[0].data)).toEqual({ voterIdNumber: 'KA/01/123456' });
    });
  });

  describe('verifyVoterIdOtp', () => {
    it('posts voterIdNumber and otp to /auth/voter-id/verify', async () => {
      const authResponse = { accessToken: 'tok', userId: 2, email: 'voter@b.com', fullName: 'Bob', role: 'VOTER' };
      mock.onPost('/auth/voter-id/verify').reply(200, { data: authResponse });
      const res = await authApi.verifyVoterIdOtp('KA/01/123456', '654321');
      expect(res.data).toEqual({ data: authResponse });
      expect(JSON.parse(mock.history.post[0].data)).toEqual({ voterIdNumber: 'KA/01/123456', otp: '654321' });
    });
  });

  describe('registerCandidate', () => {
    it('posts candidate data to /auth/candidate/register', async () => {
      const data = {
        fullName: 'Candidate One',
        email: 'cand@b.com',
        electionId: 10,
        constituencyId: 5,
        manifesto: 'Development',
      };
      mock.onPost('/auth/candidate/register').reply(201);
      await authApi.registerCandidate(data);
      expect(JSON.parse(mock.history.post[0].data)).toMatchObject({ email: 'cand@b.com', electionId: 10 });
    });
  });
});
