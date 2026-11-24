import { useEffect, useState } from 'react';
import { notificationApi } from '../api/notificationApi';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { Notification } from '../types/notification.types';

const TYPE_ICON: Record<string, string> = {
  APPLICATION_STATUS: '📋',
  VOTE_CONFIRMATION: '✅',
  ELECTION_OPEN: '🗳️',
  RESULT_DECLARED: '🏆',
  MESSAGE: '💬',
  SYSTEM: '🔔',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationApi.getAll().then((r) => {
      const data = r.data.data;
      setNotifications(Array.isArray(data) ? data : data?.content ?? []);
    }).finally(() => setLoading(false));
  }, []);

  function handleMarkRead(id: number) {
    notificationApi.markRead(id).then(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    });
  }

  function handleMarkAllRead() {
    notificationApi.markAllRead().then(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    });
  }

  if (loading) return <LoadingSpinner />;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="page-wrap-sm page-content">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '0.8125rem', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--muted)', marginBottom: '0.5rem',
          }}>Inbox</p>
          <h1 className="h1">
            Notifications
            {unreadCount > 0 && (
              <span style={{
                marginLeft: '0.75rem',
                background: 'var(--saffron)',
                color: '#fff',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '0.8125rem',
                fontWeight: 700,
                padding: '0.1875rem 0.625rem',
                borderRadius: 99,
                verticalAlign: 'middle',
              }}>{unreadCount}</span>
            )}
          </h1>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{
          background: 'var(--paper)', border: '1px solid var(--rule)',
          borderRadius: 'var(--radius)', padding: '4rem 2rem', textAlign: 'center',
        }}>
          <p style={{ fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--muted)', fontSize: '1rem' }}>
            No notifications yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {notifications.map((n) => (
            <div key={n.id} style={{
              background: n.isRead ? 'var(--paper)' : '#fff',
              border: `1px solid ${n.isRead ? 'var(--rule)' : 'rgba(232,98,42,0.25)'}`,
              borderLeft: n.isRead ? '1px solid var(--rule)' : '3px solid var(--saffron)',
              borderRadius: 'var(--radius)',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.875rem',
              boxShadow: n.isRead ? 'none' : 'var(--shadow-card)',
            }}>
              <span style={{ fontSize: '1.25rem', lineHeight: 1.4, flexShrink: 0 }}>
                {TYPE_ICON[n.type] ?? '🔔'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontWeight: n.isRead ? 400 : 600,
                  fontSize: '0.9375rem',
                  color: 'var(--ink)',
                  marginBottom: n.body ? '0.25rem' : 0,
                }}>{n.title}</p>
                {n.body && (
                  <p style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: '0.8125rem',
                    color: 'var(--muted)',
                    lineHeight: 1.55,
                  }}>{n.body}</p>
                )}
                <p style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: '0.75rem',
                  color: 'var(--muted)',
                  marginTop: '0.375rem',
                }}>{new Date(n.createdAt).toLocaleString()}</p>
              </div>
              {!n.isRead && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleMarkRead(n.id)}
                  style={{ flexShrink: 0, fontSize: '0.75rem' }}
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
