export type SearchResultKind =
  | 'CHARACTER' | 'LOCATION' | 'ARTIFACT' | 'ORGANIZATION' | 'TIMELINE_EVENT'
  | 'EPISODE' | 'SCENE' | 'CLIP' | 'BIBLE_ENTRY' | 'ASSET';

export interface SearchResultDto {
  id: string; kind: SearchResultKind; title: string;
  subtitle: string; highlight?: string;
}

export interface SearchResponseDto {
  results: SearchResultDto[]; total: number; query: string;
}
