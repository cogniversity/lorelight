import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

// ─── Token helpers ────────────────────────────────────────────────────────────
const TOKEN_KEY = "lorelight_token";
export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string): void => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface Series {
  id: string;
  name: string;
  premise: string;
  createdAt: string;
  updatedAt: string;
  episodeCount?: number;
  clipCount?: number;
}

export interface BibleEntry {
  type: string;
  content: string;
  updatedAt?: string;
}

export interface WorldEntity {
  id: string;
  seriesId?: string;
  type: string;
  displayName: string;
  externalId?: string;
  subtitle?: string;
  description?: string;
  status: string;
  tags?: string[];
  color?: string;
  age?: number;
  ethnicity?: string;
  skinTone?: string;
  visualDescription?: string;
  facialFeatures?: string;
  visualSilhouetteDress?: string;
  voiceDescription?: string;
  voiceProfile?: string;
  costumeDescription?: string;
  mannerisms?: string;
  goals?: string;
  motivations?: string;
  fears?: string;
  biography?: string;
  profilePhotoAssetId?: string;
  voiceSampleAssetId?: string;
  referenceImageAssetId?: string;
  imagePrompt?: string;
  architectureNotes?: string;
  moodNotes?: string;
  lightingNotes?: string;
  environmentNotes?: string;
  weatherNotes?: string;
  origin?: string;
  currentOwner?: string;
  importance?: string;
  createdAt: string;
}

export type StoryAnchorType = "SERIES" | "SEASON" | "EPISODE" | "ACT" | "SCENE";

// Kept for backward compatibility — use WorldEntityVersion for new code
export type CharacterVersion = WorldEntityVersion;

export interface ScriptBlock {
  id?: string;
  type: "action" | "dialogue" | "direction" | "transition" | "heading";
  content: string;
  character?: string;
  characterName?: string;
  position?: number;
}

export interface Clip {
  id: string;
  sceneId: string;
  sceneTitle?: string;
  episodeId?: string;
  episodeTitle?: string;
  number?: number;
  clipNumber?: string;
  title: string;
  storyBeat?: string;
  action?: string;
  dialogue?: string;
  emotion?: string;
  duration?: string;
  targetDurationSec?: number;
  camera?: string;
  cameraShot?: string;
  cameraAngle?: string;
  cameraMovement?: string;
  composition?: string;
  lens?: string;
  lighting?: string;
  voiceNotes?: string;
  ambientAudio?: string;
  sfx?: string;
  music?: string;
  audio?: string;
  imagePrompt?: string;
  videoPrompt?: string;
  voicePrompt?: string;
  audioPrompt?: string;
  negativePrompt?: string;
  compiledImagePrompt?: string;
  compiledVideoPrompt?: string;
  status: string;
  tags?: string[];
  position?: number;
  hasGeneratedPrompts?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Scene {
  id: string;
  sceneNumber: number;
  title: string;
  status: string;
  location?: string;
  timeOfDay?: string;
  scriptBlocks?: ScriptBlock[];
  clips?: Clip[];
  tags?: string[];
}

export interface Act {
  id: string;
  actNumber: number;
  title: string;
  scenes: Scene[];
  tags?: string[];
}

export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  synopsis?: string;
  status: string;
  progress?: number;
  runtime?: string;
  acts: Act[];
}

export interface Season {
  id: string;
  seasonNumber: number;
  episodes: Episode[];
}

export interface Manuscript {
  id: string;
  name: string;
  seasons: Season[];
}

const normalizeClip = (clip: Record<string, unknown>): Clip => ({
  ...(clip as unknown as Clip),
  number: Number(clip.number ?? 0),
  clipNumber: String(clip.number ?? "").padStart(2, "0"),
  camera: (clip.cameraShot as string | undefined) ?? (clip.camera as string | undefined),
  audio: (clip.ambientAudio as string | undefined) ?? (clip.audio as string | undefined),
});

const normalizeScene = (scene: Record<string, unknown>): Scene => ({
  ...(scene as unknown as Scene),
  sceneNumber: Number(scene.number ?? 0),
  location:
    (scene.locationName as string | undefined) ??
    (scene.location as string | undefined),
  scriptBlocks: ((scene.scriptBlocks as Array<Record<string, unknown>> | undefined) ?? []).map(
    (block) => ({
      ...(block as unknown as ScriptBlock),
      type:
        block.type === "PARENTHETICAL"
          ? "direction"
          : String(block.type ?? "ACTION").toLowerCase() as ScriptBlock["type"],
      character:
        (block.characterName as string | undefined) ??
        (block.character as string | undefined),
    })
  ),
  clips: ((scene.clips as Array<Record<string, unknown>> | undefined) ?? []).map(normalizeClip),
});

const normalizeSeason = (season: Record<string, unknown>): Season => ({
  ...(season as unknown as Season),
  seasonNumber: Number(season.number ?? 0),
  episodes: ((season.episodes as Array<Record<string, unknown>> | undefined) ?? []).map(
    (episode) => ({
      ...(episode as unknown as Episode),
      episodeNumber: Number(episode.number ?? 0),
      runtime:
        (episode.estimatedRuntime as string | undefined) ??
        (episode.runtime as string | undefined),
      acts: ((episode.acts as Array<Record<string, unknown>> | undefined) ?? []).map(
        (act) => ({
          ...(act as unknown as Act),
          actNumber: Number(act.number ?? 0),
          scenes: ((act.scenes as Array<Record<string, unknown>> | undefined) ?? []).map(
            normalizeScene
          ),
        })
      ),
    })
  ),
});

export interface Asset {
  id: string;
  seriesId?: string;
  title: string;
  type?: string;
  assetType?: string;
  filename?: string;
  mimeType?: string;
  status: string;
  url?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  fileSize?: number;
  sizeBytes?: number;
  version?: number;
  versionNotes?: string;
  isFinal?: boolean;
  tags?: string[];
  entityIds?: string[];
  actIds?: string[];
  sceneIds?: string[];
  clipIds?: string[];
  // Provenance
  source?: "UPLOAD" | "MAGE_SEED_AUDIO";
  generationPrompt?: string;
  generationProvider?: string;
  generationModel?: string;
  generationRequestId?: string;
  generationDurationSec?: number;
  uploadedByName?: string;
  assignments?: AssetAssignment[];
  createdAt: string;
  updatedAt?: string;
}

export type AssetAssignmentRole =
  | "PROFILE_PHOTO"
  | "VOICE_SAMPLE"
  | "REFERENCE_IMAGE"
  | "VERSION_IMAGE"
  | "PRODUCTION_MEDIA";

export type AssetAssignmentStatus = "ASSIGNED" | "ABANDONED";

export interface AssetAssignment {
  id: string;
  role: AssetAssignmentRole;
  status: AssetAssignmentStatus;
  targetType: string;
  targetId: string;
  note?: string;
  replacedByAssetId?: string;
  createdAt: string;
  updatedAt: string;
  asset?: {
    id: string;
    title: string;
    type: string;
    filename: string;
    mimeType: string;
    source: string;
    generationProvider?: string;
    generationModel?: string;
    generationRequestId?: string;
    createdAt: string;
  };
}

// WorldEntityVersion replaces CharacterVersion
export interface WorldEntityVersion {
  id: string;
  entityId: string;
  name: string;
  externalId?: string;
  effectiveExternalId: string;
  description?: string;
  // Character-specific
  age?: number;
  ethnicity?: string;
  skinTone?: string;
  facialFeatures?: string;
  visualSilhouetteDress?: string;
  visualDescription?: string;
  voiceProfile?: string;
  voiceDescription?: string;
  costumeDescription?: string;
  mannerisms?: string;
  // Location-specific
  architectureNotes?: string;
  moodNotes?: string;
  lightingNotes?: string;
  environmentNotes?: string;
  weatherNotes?: string;
  // Artifact-specific
  origin?: string;
  currentOwner?: string;
  importance?: string;
  // Shared
  imageAssetId?: string;
  inheritMainImage: boolean;
  effectiveImageAssetId?: string;
  generatedPrompt?: string;
  startType: StoryAnchorType;
  startId?: string;
  endType?: StoryAnchorType;
  endId?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityItem {
  id: string;
  text: string;
  meta: string;
  tone?: string;
  iconType?: string;
  timestamp: string;
}

export interface GenerationRun {
  id?: string;
  runId?: string;
  clipId?: string;
  status: string;
  promptStatus?: string;
  provider?: string;
  model?: string;
  imagePrompt?: string;
  videoPrompt?: string;
  voicePrompt?: string;
  audioPrompt?: string;
  negativePrompt?: string;
  compiledVideoPrompt?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  createdAt: string;
  completedAt?: string;
}

export interface LlmProvider {
  id: string;
  type: string;
  provider?: string;
  displayName?: string;
  model: string;
  baseUrl?: string;
  isDefault: boolean;
  status?: string;
  apiKey?: string;
}

export interface AudioProvider {
  id: string;
  seriesId: string;
  provider: "MAGE";
  displayName: string;
  model: "seed-audio-1.0";
  isActive: boolean;
  hasApiKey: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  seriesId: string;
}

// ─── Axios instance ───────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: "http://localhost:3001",
  withCredentials: true,
});

// Attach Bearer token on every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

// Refresh token queue
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (v: unknown) => void;
  reject: (r: unknown) => void;
  cfg: InternalAxiosRequestConfig;
}> = [];

function flushQueue(err: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject, cfg }) => {
    if (err) {
      reject(err);
    } else {
      if (token) cfg.headers.set("Authorization", `Bearer ${token}`);
      resolve(api(cfg));
    }
  });
  failedQueue = [];
}

// 401 → try refresh → retry, else redirect to /login
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const orig = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const requestUrl = orig?.url ?? "";
    const isAuthRequest =
      requestUrl.includes("/api/auth/login") ||
      requestUrl.includes("/api/auth/refresh");
    const token = getToken();

    // An unauthenticated /auth/me request is expected on the login page.
    // Only try refresh when a prior access token actually existed.
    if (error.response?.status === 401 && token && !isAuthRequest && !orig._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, cfg: orig });
        });
      }
      orig._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post(
          "http://localhost:3001/api/auth/refresh",
          {},
          { withCredentials: true }
        );
        const newToken: string = data.accessToken;
        setToken(newToken);
        api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
        flushQueue(null, newToken);
        orig.headers.set("Authorization", `Bearer ${newToken}`);
        return api(orig);
      } catch (refreshErr) {
        flushQueue(refreshErr, null);
        clearToken();
        if (window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string }>("/api/auth/login", { email, password }).then((r) => r.data),
  logout: () => api.post("/api/auth/logout"),
  me: () => api.get<User>("/api/auth/me").then((r) => r.data),
  refresh: () =>
    api.post<{ accessToken: string }>("/api/auth/refresh").then((r) => r.data),
};

// ─── Series ───────────────────────────────────────────────────────────────────
export interface SeriesMember {
  userId: string;
  name: string;
  email: string;
  role: string; // SeriesRole at runtime
  avatarUrl?: string;
  joinedAt?: string;
}

export const seriesApi = {
  list: () => api.get<Series[]>("/api/series").then((r) => r.data),
  create: (name: string, premise: string) =>
    api.post<Series>("/api/series", { name, premise }).then((r) => r.data),
  get: (id: string) =>
    api.get<Series>(`/api/series/${id}`).then((r) => r.data),
  update: (id: string, payload: Partial<Series>) =>
    api.put<Series>(`/api/series/${id}`, payload).then((r) => r.data),
  archive: (id: string) =>
    api.delete(`/api/series/${id}`).then((r) => r.data),
  listMembers: (id: string) =>
    api.get<SeriesMember[]>(`/api/series/${id}/members`).then((r) => r.data),
  addMember: (id: string, payload: { email: string; role: string }) =>
    api.post<SeriesMember>(`/api/series/${id}/members`, payload).then((r) => r.data),
  removeMember: (id: string, userId: string) =>
    api.delete(`/api/series/${id}/members/${userId}`),
};

// ─── Manuscript ───────────────────────────────────────────────────────────────
export const manuscriptApi = {
  get: (seriesId: string) =>
    api
      .get<Array<Record<string, unknown>>>(`/api/series/${seriesId}/manuscript`)
      .then((r) => ({
        id: seriesId,
        name: "Manuscript",
        seasons: r.data.map(normalizeSeason),
      })),
  tree: (seriesId: string) =>
    api.get<Manuscript>(`/api/series/${seriesId}/manuscript/tree`).then((r) => r.data),
  getClip: (seriesId: string, clipId: string) =>
    api
      .get<Record<string, unknown>>(`/api/series/${seriesId}/clips/${clipId}`)
      .then((r) => normalizeClip(r.data)),
  updateClip: (seriesId: string, clipId: string, data: Partial<Clip>) =>
    api.put<Clip>(`/api/series/${seriesId}/clips/${clipId}`, data).then((r) => r.data),
  getScene: (seriesId: string, sceneId: string) =>
    api
      .get<Record<string, unknown>>(`/api/series/${seriesId}/scenes/${sceneId}`)
      .then((r) => normalizeScene(r.data)),
  updateAct: (seriesId: string, actId: string, data: Partial<Act>) =>
    api.put<Act>(`/api/series/${seriesId}/acts/${actId}`, data).then((r) => r.data),
  updateScene: (seriesId: string, sceneId: string, data: Partial<Scene>) =>
    api.put<Scene>(`/api/series/${seriesId}/scenes/${sceneId}`, data).then((r) => r.data),
};

// ─── Bible ────────────────────────────────────────────────────────────────────
export const bibleApi = {
  list: (seriesId: string) =>
    api.get<BibleEntry[]>(`/api/series/${seriesId}/bible`).then((r) => r.data),
  update: (seriesId: string, type: string, content: string) =>
    api
      .put<BibleEntry>(`/api/series/${seriesId}/bible/${type}`, {
        title: type
          .toLowerCase()
          .replace(/_/g, " ")
          .replace(/^\w/, (letter: string) => letter.toUpperCase()),
        content,
      })
      .then((r) => r.data),
};

// ─── World ────────────────────────────────────────────────────────────────────
export const worldApi = {
  list: (seriesId: string, type?: string, q?: string) =>
    api
      .get<WorldEntity[]>(`/api/series/${seriesId}/world`, { params: { type, q } })
      .then((r) => r.data),
  create: (seriesId: string, entity: Omit<WorldEntity, "id" | "createdAt">) =>
    api.post<WorldEntity>(`/api/series/${seriesId}/world`, entity).then((r) => r.data),
  update: (seriesId: string, entityId: string, entity: Partial<WorldEntity>) =>
    api
      .put<WorldEntity>(`/api/series/${seriesId}/world/${entityId}`, entity)
      .then((r) => r.data),
  delete: (seriesId: string, entityId: string) =>
    api.delete(`/api/series/${seriesId}/world/${entityId}`),
  listCharacterVersions: (seriesId: string, entityId: string) =>
    api
      .get<CharacterVersion[]>(`/api/series/${seriesId}/world/${entityId}/versions`)
      .then((r) => r.data),
  createCharacterVersion: (
    seriesId: string,
    entityId: string,
    data: Partial<CharacterVersion>,
  ) =>
    api
      .post<CharacterVersion>(`/api/series/${seriesId}/world/${entityId}/versions`, data)
      .then((r) => r.data),
  updateCharacterVersion: (
    seriesId: string,
    entityId: string,
    versionId: string,
    data: Partial<CharacterVersion>,
  ) =>
    api
      .put<CharacterVersion>(
        `/api/series/${seriesId}/world/${entityId}/versions/${versionId}`,
        data,
      )
      .then((r) => r.data),
  deleteCharacterVersion: (seriesId: string, entityId: string, versionId: string) =>
    api.delete(`/api/series/${seriesId}/world/${entityId}/versions/${versionId}`),
  generateCharacterVersionPrompt: (
    seriesId: string,
    entityId: string,
    versionId: string,
  ) =>
    api
      .post<CharacterVersion>(
        `/api/series/${seriesId}/world/${entityId}/versions/${versionId}/generate-prompt`,
      )
      .then((r) => r.data),
  generateBaseCharacterPrompt: (
    seriesId: string,
    entityId: string,
    data: Partial<WorldEntity>,
  ) =>
    api
      .post<WorldEntity>(
        `/api/series/${seriesId}/world/${entityId}/generate-visual-prompt`,
        data,
      )
      .then((r) => r.data),
  generateVoiceSample: (
    seriesId: string,
    entityId: string,
    voiceProfile: string,
    sampleText?: string,
  ) =>
    api
      .post<{
        assetId: string;
        voiceSampleAssetId: string;
        downloadUrl: string;
        durationSeconds: 5;
        provider: "MAGE";
        model: "seed-audio-1.0";
        gemsCharged?: number;
      }>(
        `/api/series/${seriesId}/world/${entityId}/generate-voice-sample`,
        { voiceProfile, sampleText: sampleText || undefined },
      )
      .then((r) => r.data),
  getEntityAssignmentHistory: (seriesId: string, entityId: string) =>
    api
      .get<AssetAssignment[]>(`/api/series/${seriesId}/world/${entityId}/assignment-history`)
      .then((r) => r.data),
};

// ─── Search ───────────────────────────────────────────────────────────────────
export const searchApi = {
  query: (seriesId: string, q: string) =>
    api
      .get<{ results: SearchResult[] }>(`/api/series/${seriesId}/search`, { params: { q } })
      .then((r) =>
        r.data.results.map((result) => {
          const rawType =
            (result as SearchResult & { kind?: string }).kind ?? result.type;
          return {
            ...result,
            type: rawType
              .toLowerCase()
              .replace(/_/g, " ")
              .replace(/^\w/, (letter: string) => letter.toUpperCase()),
          };
        })
      ),
};

// ─── Assets ───────────────────────────────────────────────────────────────────
export interface AssetList { items: Asset[]; total: number; }
export interface InitiateUploadPayload {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  type: "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT" | "STORYBOARD" | "OTHER";
  title?: string;
  description?: string;
  tags?: string[];
  versionNotes?: string;
  isFinal?: boolean;
  linkedEntityId?: string;
  linkedActId?: string;
  linkedSceneId?: string;
  linkedClipId?: string;
}
export interface InitiateUploadResponse { assetId: string; uploadUrl: string; expiresIn: number; }

export const assetsApi = {
  list: (seriesId: string) =>
    api
      .get<AssetList>(`/api/series/${seriesId}/assets`)
      .then(async (r) =>
        Promise.all(
          r.data.items.map(async (asset) => {
            const detail = await api
              .get<Asset>(`/api/series/${seriesId}/assets/${asset.id}`)
              .then((response) => response.data);
            return {
              ...asset,
              ...detail,
              assetType: detail.type ?? detail.assetType,
              fileSize: detail.sizeBytes ?? detail.fileSize,
              url: detail.downloadUrl ?? detail.url,
              thumbnailUrl:
                detail.mimeType?.startsWith("image/")
                  ? detail.downloadUrl
                  : detail.thumbnailUrl,
            };
          })
        )
      ),
  initiateUpload: (seriesId: string, payload: InitiateUploadPayload) =>
    api
      .post<InitiateUploadResponse>(`/api/series/${seriesId}/assets/upload-url`, payload)
      .then((r) => r.data),
  completeUpload: (seriesId: string, assetIdOrPayload: string | { assetId: string }, title?: string, assetType?: string) => {
    const payload = typeof assetIdOrPayload === 'string'
      ? { assetId: assetIdOrPayload, title, assetType }
      : assetIdOrPayload;
    return api.post<Asset>(`/api/series/${seriesId}/assets/complete`, payload).then((r) => r.data);
  },
  getUploadUrl: (seriesId: string, filename: string, mimeType: string, sizeBytes: number) => {
    const type = mimeType.startsWith("image/")
      ? "IMAGE"
      : mimeType.startsWith("video/")
        ? "VIDEO"
        : mimeType.startsWith("audio/")
          ? "AUDIO"
          : "DOCUMENT";
    return (
    api
      .post<{ uploadUrl: string; key: string; assetId: string }>(
        `/api/series/${seriesId}/assets/upload-url`,
        { filename, mimeType, sizeBytes, type, title: filename }
      )
      .then((r) => r.data)
    );
  },
  uploadToPresigned: (url: string, file: File) =>
    axios.put(url, file, { headers: { "Content-Type": file.type } }),
  update: (seriesId: string, assetId: string, payload: Partial<Asset>) =>
    api
      .put<Asset>(`/api/series/${seriesId}/assets/${assetId}`, payload)
      .then((r) => r.data),
  getById: (seriesId: string, assetId: string) =>
    api
      .get<Asset>(`/api/series/${seriesId}/assets/${assetId}`)
      .then((r) => r.data),
  getDownload: (seriesId: string, assetId: string) =>
    api
      .get<{ downloadUrl: string; filename: string; expiresIn: number }>(
        `/api/series/${seriesId}/assets/${assetId}/download`,
      )
      .then((r) => r.data),
  getAssignmentHistory: (seriesId: string, assetId: string) =>
    api
      .get<AssetAssignment[]>(`/api/series/${seriesId}/assets/${assetId}/assignments`)
      .then((r) => r.data),
  abandonAssignment: (
    seriesId: string,
    assetId: string,
    assignmentId: string,
    note?: string,
  ) =>
    api
      .post<AssetAssignment>(
        `/api/series/${seriesId}/assets/${assetId}/assignments/${assignmentId}/abandon`,
        { note },
      )
      .then((r) => r.data),
  deleteAsset: (seriesId: string, assetId: string) =>
    api
      .delete(`/api/series/${seriesId}/assets/${assetId}`)
      .then((r) => r.data),
};

// ─── Clips ────────────────────────────────────────────────────────────────────
export const clipsApi = {
  get: (seriesId: string, clipId: string) =>
    api
      .get<Clip>(`/api/series/${seriesId}/clips/${clipId}`)
      .then((r) => r.data),
  generatePrompts: (seriesId: string, clipId: string) =>
    api
      .post<GenerationRun>(`/api/series/${seriesId}/clips/${clipId}/generate-prompts`)
      .then((r) => r.data),
  acceptPrompts: (seriesId: string, clipId: string, prompts: Partial<Clip>) =>
    api
      .post<Clip>(`/api/series/${seriesId}/clips/${clipId}/accept-prompts`, prompts)
      .then((r) => r.data),
  generationRuns: (seriesId: string, clipId: string) =>
    api
      .get<GenerationRunList>(`/api/series/${seriesId}/clips/${clipId}/generation-runs`)
      .then((r) => r.data.items),
  update: (seriesId: string, clipId: string, data: Partial<Clip>) =>
    api
      .put<Clip>(`/api/series/${seriesId}/clips/${clipId}`, data)
      .then((r) => r.data),
};

// ─── Activity ─────────────────────────────────────────────────────────────────
export const activityApi = {
  list: (seriesId: string) =>
    api.get<ActivityItem[]>(`/api/series/${seriesId}/activity`).then((r) => r.data),
};

// ─── Generation / LLM ────────────────────────────────────────────────────────
export interface GenerationRunList { items: GenerationRun[]; total: number; }

export const generationApi = {
  generate: (seriesId: string, clipId: string) =>
    api
      .post<GenerationRun>(`/api/series/${seriesId}/clips/${clipId}/generate`)
      .then((r) => r.data),
  listRuns: (seriesId: string, clipId: string) =>
    api
      .get<GenerationRunList>(`/api/series/${seriesId}/clips/${clipId}/generation-runs`)
      .then((r) => r.data),
  acceptPrompts: (seriesId: string, clipId: string, payload: object) =>
    api
      .post<Clip>(`/api/series/${seriesId}/clips/${clipId}/accept-prompts`, payload)
      .then((r) => r.data),
  listProviders: (seriesId: string) =>
    api.get<LlmProvider[]>(`/api/series/${seriesId}/llm-providers`).then((r) => r.data),
  createProvider: (seriesId: string, payload: object) =>
    api
      .post<LlmProvider>(`/api/series/${seriesId}/llm-providers`, payload)
      .then((r) => r.data),
  testProvider: (seriesId: string, configId: string) =>
    api
      .post<{ success: boolean; latencyMs: number }>(`/api/series/${seriesId}/llm-providers/${configId}/test`)
      .then((r) => r.data),
  deleteProvider: (seriesId: string, configId: string) =>
    api.delete(`/api/series/${seriesId}/llm-providers/${configId}`),
};

// ─── Settings / LLM Providers ─────────────────────────────────────────────────
export const settingsApi = {
  listProviders: (seriesId: string) =>
    api.get<LlmProvider[]>(`/api/series/${seriesId}/providers`).then((r) =>
      r.data.map((p) => ({
        ...p,
        type: (p.provider ?? p.type).toLowerCase(),
      }))
    ),
  addProvider: (seriesId: string, provider: Omit<LlmProvider, "id" | "status">) =>
    api
      .post<LlmProvider>(`/api/series/${seriesId}/providers`, {
        provider:
          provider.type === "openai-compatible"
            ? "LLAMACPP"
            : provider.type.toUpperCase(),
        displayName: provider.displayName ?? `${provider.type} ${provider.model}`,
        model: provider.model,
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        isDefault: provider.isDefault,
      })
      .then((r) => r.data),
  testProvider: (seriesId: string, providerId: string) =>
    api
      .post<{ success: boolean; latencyMs: number; error?: string }>(
        `/api/series/${seriesId}/providers/${providerId}/test`
      )
      .then((r) => ({ ok: r.data.success, message: r.data.error })),
  deleteProvider: (seriesId: string, providerId: string) =>
    api.delete(`/api/series/${seriesId}/providers/${providerId}`),
  listAudioProviders: (seriesId: string) =>
    api
      .get<AudioProvider[]>(`/api/series/${seriesId}/audio-providers`)
      .then((r) => r.data),
  addMageAudioProvider: (
    seriesId: string,
    data: { apiKey: string; displayName?: string },
  ) =>
    api
      .post<AudioProvider>(`/api/series/${seriesId}/audio-providers`, data)
      .then((r) => r.data),
  testAudioProvider: (seriesId: string, providerId: string) =>
    api
      .post<{ success: boolean }>(
        `/api/series/${seriesId}/audio-providers/${providerId}/test`,
      )
      .then((r) => r.data),
  deleteAudioProvider: (seriesId: string, providerId: string) =>
    api.delete(`/api/series/${seriesId}/audio-providers/${providerId}`),
};

// ─── Draft Manuscript ─────────────────────────────────────────────────────────

export interface DraftManuscript {
  id: string;
  seriesId: string;
  content: string;
  revisionNum: number;
  updatedAt: string;
}

export interface ManuscriptRevision {
  id: string;
  manuscriptId: string;
  revisionNum: number;
  contentPreview?: string;
  content?: string;
  authorId: string;
  authorName?: string;
  createdAt: string;
}

export const draftApi = {
  get: (seriesId: string) =>
    api.get<DraftManuscript>(`/api/series/${seriesId}/draft-manuscript`).then((r) => r.data),
  save: (seriesId: string, content: string, expectedRevision: number) =>
    api
      .put<DraftManuscript>(`/api/series/${seriesId}/draft-manuscript`, {
        content,
        expectedRevision,
      })
      .then((r) => r.data),
  revisions: (seriesId: string) =>
    api
      .get<{ items: ManuscriptRevision[] }>(`/api/series/${seriesId}/draft-manuscript/revisions`)
      .then((r) => r.data.items),
  restore: (seriesId: string, revisionId: string) =>
    api
      .post<DraftManuscript>(`/api/series/${seriesId}/draft-manuscript/revisions/restore`, {
        revisionId,
      })
      .then((r) => r.data),
};

// ─── Assistant / Chat ──────────────────────────────────────────────────────────

export type ProposalStatus = "PENDING" | "APPROVED" | "APPLIED" | "REJECTED" | "STALE" | "FAILED";

export interface ChatThread {
  id: string;
  seriesId: string;
  userId: string;
  title: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeProposal {
  id: string;
  seriesId: string;
  threadId: string;
  messageId: string;
  status: ProposalStatus;
  commandType: string;
  entityType: string;
  targetPath: Record<string, string | null>;
  payload: Record<string, unknown>;
  beforeSnap?: Record<string, unknown> | null;
  afterSnap?: Record<string, unknown> | null;
  validationErrors?: string | null;
  appliedRecordId?: string | null;
  humanReadable: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  seriesId: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  proposals?: ChangeProposal[];
  createdAt: string;
}

export interface RouteContext {
  page?: string;
  episodeId?: string;
  seasonId?: string;
  actId?: string;
  sceneId?: string;
  clipId?: string;
}

export const assistantApi = {
  getOrCreateThread: (seriesId: string) =>
    api.get<ChatThread>(`/api/series/${seriesId}/assistant/thread`).then((r) => r.data),
  newThread: (seriesId: string) =>
    api.post<ChatThread>(`/api/series/${seriesId}/assistant/thread/new`).then((r) => r.data),
  listThreads: (seriesId: string) =>
    api.get<ChatThread[]>(`/api/series/${seriesId}/assistant/threads`).then((r) => r.data),
  getMessages: (seriesId: string, threadId: string) =>
    api
      .get<ChatMessage[]>(`/api/series/${seriesId}/assistant/threads/${threadId}/messages`)
      .then((r) => r.data),
  sendMessage: (
    seriesId: string,
    threadId: string,
    content: string,
    routeContext?: RouteContext,
  ) =>
    api
      .post<{ message: ChatMessage; proposals: ChangeProposal[] }>(
        `/api/series/${seriesId}/assistant/threads/${threadId}/messages`,
        { content, routeContext },
      )
      .then((r) => r.data),
  approveProposal: (seriesId: string, proposalId: string) =>
    api
      .post<{ proposal: ChangeProposal; appliedRecordId?: string }>(
        `/api/series/${seriesId}/assistant/proposals/${proposalId}/approve`,
      )
      .then((r) => r.data),
  rejectProposal: (seriesId: string, proposalId: string) =>
    api
      .post<{ proposal: ChangeProposal }>(
        `/api/series/${seriesId}/assistant/proposals/${proposalId}/reject`,
      )
      .then((r) => r.data),
};

export default api;
