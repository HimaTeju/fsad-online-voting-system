export interface ForumThread {
  id: number;
  title: string;
  body: string;
  authorId: number;
  authorName: string;
  constituencyId?: number;
  electionId?: number;
  threadType: 'DISCUSSION' | 'CAMPAIGN';
  pinned: boolean;
  createdAt: string;
}

export interface ForumPost {
  id: number;
  threadId: number;
  authorId: number;
  authorName: string;
  body: string;
  parentPostId?: number;
  createdAt: string;
  updatedAt?: string;
}
