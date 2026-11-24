import axiosClient from './axiosClient';

export const voterApi = {
  /** Elections the logged-in voter can take part in, each with `hasVoted`. */
  elections: () => axiosClient.get('/voter/elections'),
  profile: () => axiosClient.get('/voter/profile'),
};
