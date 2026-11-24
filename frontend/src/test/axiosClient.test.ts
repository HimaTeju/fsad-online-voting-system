import { describe, it, expect, afterEach, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axiosClient from '../api/axiosClient';
import { tokenStorage } from '../utils/tokenStorage';

const mock = new MockAdapter(axiosClient);

afterEach(() => {
  mock.reset();
  tokenStorage.clear();
  vi.restoreAllMocks();
});

describe('axiosClient', () => {
  it('has base URL /api', () => {
    expect(axiosClient.defaults.baseURL).toBe('/api');
  });

  it('attaches Authorization header when token is present', async () => {
    tokenStorage.set('my-token');
    mock.onGet('/test').reply(200, {});

    await axiosClient.get('/test');
    expect(mock.history.get[0].headers?.Authorization).toBe('Bearer my-token');
  });

  it('omits Authorization header when no token is stored', async () => {
    mock.onGet('/test').reply(200, {});

    await axiosClient.get('/test');
    expect(mock.history.get[0].headers?.Authorization).toBeUndefined();
  });

  it('resolves successful responses normally', async () => {
    mock.onGet('/ok').reply(200, { result: 'ok' });
    const res = await axiosClient.get('/ok');
    expect(res.data).toEqual({ result: 'ok' });
  });

  it('propagates non-401 errors without attempting refresh', async () => {
    mock.onGet('/boom').reply(500, { message: 'Server error' });
    await expect(axiosClient.get('/boom')).rejects.toMatchObject({ response: { status: 500 } });
  });
});
