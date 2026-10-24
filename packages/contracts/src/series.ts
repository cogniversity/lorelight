import { SeriesRole } from './enums';

export interface SeriesDto {
  id: string; slug: string; name: string; premise: string;
  posterUrl?: string; isArchived: boolean; createdAt: string;
  myRole: SeriesRole;
}
export interface CreateSeriesDto { name: string; premise?: string; }
export interface UpdateSeriesDto { name?: string; premise?: string; isArchived?: boolean; }

export interface SeriesMemberDto {
  userId: string; email: string; name: string; avatarUrl?: string; role: SeriesRole;
}
export interface AddMemberDto { email: string; role: SeriesRole; }
export interface UpdateMemberRoleDto { role: SeriesRole; }

export interface ImportPreviewDto {
  seriesName: string; entityCount: number; bibleEntryCount: number; warnings: string[];
}
export interface ImportCommitDto { localStorageJson: string; seriesName?: string; }
