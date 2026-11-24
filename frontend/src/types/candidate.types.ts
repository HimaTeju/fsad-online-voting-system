export type NominationStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface Candidate {
  id: number;
  userId: number;
  fullName: string;
  electionId: number;
  electionTitle: string;
  constituencyId: number;
  constituencyName: string;
  partyName?: string;
  partySymbolUrl?: string;
  manifesto?: string;
  education?: string;
  criminalRecord?: string;
  photoUrl?: string;
  nominationStatus: NominationStatus;
  rejectionReason?: string;
  onlineVoteCount: number;
}
