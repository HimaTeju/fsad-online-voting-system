import { useEffect, useState } from 'react';
import { notificationApi } from '../api/notificationApi';
import { connectNotifications } from '../utils/wsClient';
import type { Notification } from '../types/notification.types';
import { useAuthContext } from '../context/AuthContext';

export function useNotifications() {
  const { user, token } = useAuthContext();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !token) return;

    notificationApi.getUnreadCount().then((res) => setUnreadCount(res.data.data.count));

    const handle = connectNotifications(token, (n: Notification) => {
      if (!n.isRead) setUnreadCount((c) => c + 1);
    });

    return () => handle.close();
  }, [user, token]);

  return { unreadCount };
}
