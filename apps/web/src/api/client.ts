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
  createdAt: string;
}

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
}

export interface Act {
  id: string;
  actNumber: number;
  title: string;
  scenes: Scene[];
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
  title: string;
  type?: string;
  assetType: string;
  mimeType?: string;
  status: string;
  url?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  fileSize?: number;
  sizeBytes?: number;
  version?: number;
  createdAt: string;
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
export interface InitiateUploadPayload { filename: string; mimeType: string; sizeBytes: number; title?: string; }
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
};

export default api;
