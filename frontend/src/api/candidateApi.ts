import axiosClient from './axiosClient';

export const candidateApi = {
  getById: (id: number) => axiosClient.get(`/candidates/${id}`),
  nominate: (data: object) => axiosClient.post('/candidates/nominate', data),
  updateProfile: (data: object) => axiosClient.put('/candidates/profile', data),
  getMyNominations: () => axiosClient.get('/candidates/mine'),
};
