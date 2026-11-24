import axiosClient from './axiosClient';

export const adminApi = {
  createElection: (data: object) => axiosClient.post('/admin/elections', data),
  listElections: (params?: object) => axiosClient.get('/admin/elections', { params }),
  updateElectionStatus: (id: number, status: string) =>
    axiosClient.patch(`/admin/elections/${id}/status`, { status }),
  getPendingNominations: (params?: object) => axiosClient.get('/admin/nominations', { params }),
  reviewNomination: (id: number, data: object) =>
    axiosClient.patch(`/admin/nominations/${id}/review`, data),
  enterManualResults: (electionId: number, data: object) =>
    axiosClient.post(`/admin/results/${electionId}/manual`, data),
  uploadBoothCsv: (electionId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return axiosClient.post(`/admin/results/${electionId}/booth-csv`, form);
  },
  finalizeResults: (electionId: number) =>
    axiosClient.patch(`/admin/results/${electionId}/finalize`),
};
