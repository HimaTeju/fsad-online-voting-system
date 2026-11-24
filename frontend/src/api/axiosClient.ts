import axios from 'axios';
import { tokenStorage } from '../utils/tokenStorage';

const axiosClient = axios.create({ baseURL: '/api' });

axiosClient.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = false;

axiosClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    // A 401 from an auth endpoint (e.g. a wrong password at login) is a real answer,
    // not an expired session: don't try to refresh, or the login page reloads and
    // the error message is lost.
    const isAuthCall = original?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && !isAuthCall && !original._retry && !refreshing) {
      original._retry = true;
      refreshing = true;
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        tokenStorage.set(data.data.accessToken);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return axiosClient(original);
      } catch {
        tokenStorage.clear();
        window.location.href = '/login';
      } finally {
        refreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
