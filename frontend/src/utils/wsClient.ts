import type { VoteStats } from '../types/vote.types';
import type { Notification } from '../types/notification.types';

export interface ChatMsg {
  type: 'history' | 'message';
  id?: number;
  senderId: number;
  senderName: string;
  message: string;
  sentAt: string;
}

export interface WsHandle {
  send: (msg: object) => void;
  close: () => void;
}

function wsUrl(path: string): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}${path}`;
}

function createWs<T>(
  url: string,
  onMessage: (data: T) => void,
  reconnectDelay = 5000,
): WsHandle {
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  function connect() {
    ws = new WebSocket(url);

    ws.onmessage = (ev) => {
      try {
        onMessage(JSON.parse(ev.data) as T);
      } catch {
        // non-JSON frame, ignore
      }
    };

    ws.onclose = (ev) => {
      if (closed) return;
      // 4001 = auth error from server — don't reconnect
      if (ev.code === 4001) return;
      reconnectTimer = setTimeout(connect, reconnectDelay);
    };
  }

  connect();

  return {
    send(msg: object) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    },
    close() {
      closed = true;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      ws?.close();
    },
  };
}

export function connectElectionStats(
  electionId: number,
  onMessage: (stats: VoteStats) => void,
): WsHandle {
  return createWs<VoteStats>(wsUrl(`/ws/election/${electionId}/stats`), onMessage);
}

export function connectChat(
  constituencyId: number,
  token: string,
  onMessage: (msg: ChatMsg) => void,
): WsHandle {
  return createWs<ChatMsg>(wsUrl(`/ws/chat/${constituencyId}?token=${token}`), onMessage);
}

export function connectNotifications(
  token: string,
  onMessage: (n: Notification) => void,
): WsHandle {
  return createWs<Notification>(wsUrl(`/ws/notifications?token=${token}`), onMessage);
}
