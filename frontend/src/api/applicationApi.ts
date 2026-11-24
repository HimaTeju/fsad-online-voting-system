import axiosClient from './axiosClient';

export const applicationApi = {
  submit: (data: object) => axiosClient.post('/applications', data),
  getStatus: (id: number) => axiosClient.get(`/applications/${id}/status`),
  getMine: () => axiosClient.get('/applications/mine'),
};
