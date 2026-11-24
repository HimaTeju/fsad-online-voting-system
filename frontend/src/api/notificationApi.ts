import axiosClient from './axiosClient';

export const notificationApi = {
  getAll: (params?: object) => axiosClient.get('/notifications', { params }),
  getUnreadCount: () => axiosClient.get('/notifications/unread-count'),
  markRead: (id: number) => axiosClient.patch(`/notifications/${id}/read`),
  markAllRead: () => axiosClient.patch('/notifications/read-all'),
};
