export type NotificationType =
  | 'APPLICATION_STATUS'
  | 'VOTE_CONFIRMATION'
  | 'ELECTION_OPEN'
  | 'RESULT_DECLARED'
  | 'MESSAGE'
  | 'SYSTEM';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  body?: string;
  isRead: boolean;
  createdAt: string;
}
