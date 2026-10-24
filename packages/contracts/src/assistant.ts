// ── AI Assistant (chat + proposals) ──────────────────────────────────────────

export type ProposalStatus = 'PENDING' | 'APPROVED' | 'APPLIED' | 'REJECTED' | 'STALE' | 'FAILED';
export type ChatRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export interface ChatThreadDto {
  id: string;
  seriesId: string;
  userId: string;
  title: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageDto {
  id: string;
  threadId: string;
  seriesId: string;
  role: ChatRole;
  content: string;
  proposals?: ChangeProposalDto[];
  createdAt: string;
}

/**
 * Typed change proposal emitted by the AI assistant.
 * Cannot represent a delete operation by design.
 */
export interface ChangeProposalDto {
  id: string;
  seriesId: string;
  threadId: string;
  messageId: string;
  status: ProposalStatus;
  commandType: string;
  entityType: string;
  /** Human-readable destination path, e.g. "Season 1 → Episode 2 → Act I" */
  targetPath: Record<string, string | null>;
  payload: Record<string, unknown>;
  beforeSnap?: Record<string, unknown> | null;
  afterSnap?: Record<string, unknown> | null;
  validationErrors?: string | null;
  appliedRecordId?: string | null;
  /** One-sentence description for the proposal card */
  humanReadable: string;
  createdAt: string;
}

export interface SendMessageDto {
  content: string;
  /** Optional route context to focus the AI on a specific entity */
  routeContext?: {
    page?: string;
    episodeId?: string;
    seasonId?: string;
    actId?: string;
    sceneId?: string;
    clipId?: string;
  };
}

export interface SendMessageResponseDto {
  message: ChatMessageDto;
  proposals: ChangeProposalDto[];
}

export interface ApproveProposalDto {
  proposalId: string;
}

export interface ProposalApprovalResultDto {
  proposal: ChangeProposalDto;
  appliedRecordId?: string;
}
