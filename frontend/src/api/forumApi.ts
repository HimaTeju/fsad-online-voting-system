import axiosClient from './axiosClient';

export const forumApi = {
  getThreadsByConstituency: (constituencyId: number) =>
    axiosClient.get(`/forum/threads/constituency/${constituencyId}`),

  getThreadsByElection: (electionId: number) =>
    axiosClient.get(`/forum/threads/election/${electionId}`),

  createThread: (data: {
    title: string;
    body: string;
    constituencyId: number;
    threadType: 'DISCUSSION' | 'CAMPAIGN';
    electionId?: number;
  }) => axiosClient.post('/forum/threads', data),

  getPostsByThread: (threadId: number) =>
    axiosClient.get(`/forum/threads/${threadId}/posts`),

  createPost: (threadId: number, data: { body: string; parentPostId?: number }) =>
    axiosClient.post(`/forum/threads/${threadId}/posts`, data),

  editPost: (postId: number, data: { body: string }) =>
    axiosClient.put(`/forum/posts/${postId}`, data),

  deletePost: (postId: number) =>
    axiosClient.delete(`/forum/posts/${postId}`),

  getChatHistory: (constituencyId: number) =>
    axiosClient.get(`/forum/chat/constituency-${constituencyId}/history`),
};
