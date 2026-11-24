import axiosClient from './axiosClient';

export const electionApi = {
  list: (params?: object) => axiosClient.get('/elections', { params }),
  getById: (id: number) => axiosClient.get(`/elections/${id}`),
  getCandidates: (id: number) => axiosClient.get(`/elections/${id}/candidates`),
  getLiveStats: (id: number) => axiosClient.get(`/elections/${id}/live-stats`),
  castVote: (electionId: number, candidateId: number) =>
    axiosClient.post(`/elections/${electionId}/vote`, { electionId, candidateId }),
};
