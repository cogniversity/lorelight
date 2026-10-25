// ── Draft Manuscript (full series Markdown draft) ────────────────────────────

export interface SourceManuscriptDto {
  id: string;
  seriesId: string;
  content: string;
  revisionNum: number;
  updatedAt: string;
}

export interface ManuscriptRevisionDto {
  id: string;
  manuscriptId: string;
  revisionNum: number;
  /** Truncated for list responses; full content only in single-revision fetch */
  contentPreview?: string;
  content?: string;
  authorId: string;
  authorName?: string;
  createdAt: string;
}

export interface UpdateDraftManuscriptDto {
  content: string;
  /** Must match the current revisionNum to prevent overwriting concurrent edits */
  expectedRevision: number;
}

export interface RestoreRevisionDto {
  revisionId: string;
}
