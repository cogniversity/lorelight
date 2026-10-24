import { BibleEntryType } from './enums';

export interface BibleEntryDto {
  id: string; seriesId: string; type: BibleEntryType;
  title: string; content: string; position: number;
  updatedAt: string;
}
export interface UpsertBibleEntryDto {
  type: BibleEntryType; title: string; content: string; position?: number;
}
export interface UpdateBibleEntryDto { title?: string; content?: string; position?: number; }
