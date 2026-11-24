export type ElectionStatus =
  | 'DRAFT'
  | 'NOMINATION_OPEN'
  | 'NOMINATION_CLOSED'
  | 'VOTING_OPEN'
  | 'VOTING_CLOSED'
  | 'RESULTS_DECLARED';

export type ElectionType = 'GENERAL' | 'STATE' | 'LOCAL';

export interface Election {
  id: number;
  title: string;
  description?: string;
  electionType: ElectionType;
  constituencyId?: number;
  constituencyName?: string;
  status: ElectionStatus;
  nominationStart: string;
  nominationEnd: string;
  votingStart: string;
  votingEnd: string;
  createdAt: string;
  /** Only on the voter's own election list. */
  hasVoted?: boolean;
}
