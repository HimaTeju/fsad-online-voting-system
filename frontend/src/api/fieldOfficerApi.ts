import axiosClient from './axiosClient';

export const fieldOfficerApi = {
  getApplications: (params?: object) => axiosClient.get('/field-officer/applications', { params }),
  getApplication: (id: number) => axiosClient.get(`/field-officer/applications/${id}`),
  reviewApplication: (id: number, data: object) =>
    axiosClient.patch(`/field-officer/applications/${id}/review`, data),
  setPhysicalVerified: (id: number, isPhysicalVerified: boolean) =>
    axiosClient.patch(`/field-officer/applications/${id}/verify`, { isPhysicalVerified }),
  getVoters: () => axiosClient.get('/field-officer/voters'),
};
