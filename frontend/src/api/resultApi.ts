import axiosClient from './axiosClient';

export const resultApi = {
  getResults: (electionId: number) => axiosClient.get(`/results/${electionId}`),
};
