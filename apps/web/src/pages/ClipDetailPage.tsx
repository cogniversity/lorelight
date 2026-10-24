import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  RotateCcw,
  X,
  Clock3,
  Settings,
} from "lucide-react";
import { clipsApi, settingsApi, Clip, GenerationRun } from "../api/client";
import { useSeriesContext } from "../layouts/SeriesLayout";
import { StatusPill } from "../components/StatusPill";
import { Skeleton } from "../components/Skeleton";

// ─── Prompt field ──────────────────────────────────────────────────────────────
function PromptField({
  label,
  canonical,
  compiled,
  editable,
  value,
  onChange,
}: {
  label: string;
  canonical?: string;
  compiled?: string;
  editable: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="prompt-field">
      <label className="prompt-label">{label}</label>
      {editable ? (
        <textarea
          className="prompt-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}…`}
          rows={3}
        />
      ) : (
        <div className="prompt-two-col">
          <div>
            <p className="prompt-sublabel">Display (canonical)</p>
            <div className="prompt-display">
              {canonical || <em style={{ color: "#bbb" }}>Not generated</em>}
            </div>
          </div>
          {compiled && compiled !== canonical && (
            <div>
              <p className="prompt-sublabel">Compiled (with IDs)</p>
              <div className="prompt-display prompt-compiled">
                {compiled}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Generation run item ───────────────────────────────────────────────────────
function RunItem({ run }: { run: GenerationRun }) {
  return (
    <div className="gen-run">
      <div className="gen-run-header">
        <span className="gen-run-id">{(run.id ?? run.runId ?? '').slice(0, 8)}…</span>
        <StatusPill status={run.status} />
        <span className="gen-run-time">
          <Clock3 size={11} />
          {new Date(run.createdAt).toLocaleString()}
        </span>
      </div>
      {run.imagePrompt && (
        <p className="gen-run-prompt">{run.imagePrompt.slice(0, 120)}…</p>
      )}
    </div>
  );
}

// ─── ClipDetailPage ────────────────────────────────────────────────────────────
export default function ClipDetailPage() {
  const { seriesId } = useSeriesContext();
  const { clipId } = useParams<{ clipId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [promptDrafts, setPromptDrafts] = useState<Partial<Clip>>({});
  const [generatedRunId, setGeneratedRunId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState("");

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  // Fetch clip
  const { data: clip, isLoading: clipLoading } = useQuery({
    queryKey: ["clip", seriesId, clipId],
    queryFn: () => clipsApi.get(seriesId!, clipId!),
    enabled: !!seriesId && !!clipId,
  });

  // Fetch generation runs
  const { data: runs = [], isLoading: runsLoading } = useQuery({
    queryKey: ["gen-runs", seriesId, clipId],
    queryFn: () => clipsApi.generationRuns(seriesId!, clipId!),
    enabled: !!seriesId && !!clipId,
  });

  // Check LLM providers
  const { data: providers = [] } = useQuery({
    queryKey: ["llm-providers", seriesId],
    queryFn: () => settingsApi.listProviders(seriesId!),
    enabled: !!seriesId,
  });
  const hasProvider = providers.length > 0;

  // Generate prompts
  const generateMutation = useMutation({
    mutationFn: () => clipsApi.generatePrompts(seriesId!, clipId!),
    onMutate: () => setGenerating(true),
    onSuccess: (updated) => {
      setGenerating(false);
      setGeneratedRunId(updated.runId ?? updated.id ?? null);
      setEditMode(true);
      setPromptDrafts({
        imagePrompt: updated.imagePrompt,
        videoPrompt: updated.videoPrompt,
        voicePrompt: updated.voicePrompt,
        audioPrompt: updated.audioPrompt,
        negativePrompt: updated.negativePrompt,
      });
      qc.invalidateQueries({ queryKey: ["clip", seriesId, clipId] });
      qc.invalidateQueries({ queryKey: ["gen-runs", seriesId, clipId] });
      notify("Prompts generated");
    },
    onError: () => {
      setGenerating(false);
      notify("Generation failed. Check your provider settings.");
    },
  });

  // Accept prompts
  const acceptMutation = useMutation({
    mutationFn: (prompts: Partial<Clip>) =>
      generatedRunId
        ? clipsApi.acceptPrompts(seriesId!, clipId!, {
            ...prompts,
            runId: generatedRunId,
          } as Partial<Clip>)
        : clipsApi.update(seriesId!, clipId!, prompts),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clip", seriesId, clipId] });
      setEditMode(false);
      setPromptDrafts({});
      setGeneratedRunId(null);
      notify("Prompts accepted");
    },
  });

  const CLIP_FIELDS: { key: keyof Clip; label: string }[] = [
    { key: "storyBeat", label: "Story beat" },
    { key: "action", label: "Action" },
    { key: "dialogue", label: "Dialogue" },
    { key: "emotion", label: "Emotion" },
    { key: "camera", label: "Camera" },
    { key: "lighting", label: "Lighting" },
    { key: "audio", label: "Audio" },
  ];

  const PROMPT_FIELDS: {
    key: keyof Clip;
    compiledKey?: keyof Clip;
    label: string;
  }[] = [
    { key: "imagePrompt", compiledKey: "compiledImagePrompt", label: "Image prompt" },
    { key: "videoPrompt", compiledKey: "compiledVideoPrompt", label: "Video prompt" },
    { key: "voicePrompt", label: "Voice prompt" },
    { key: "audioPrompt", label: "Audio prompt" },
    { key: "negativePrompt", label: "Negative prompt" },
  ];

  const hasDraftPrompts = Object.keys(promptDrafts).some(
    (k) => !!promptDrafts[k as keyof Clip]
  );

  return (
    <>
      {/* Breadcrumb */}
      <div className="reader-breadcrumb">
        <button className="text-button" onClick={() => navigate(-1)}>
          <ChevronLeft size={14} />
          Back
        </button>
        {clip && (
          <>
            <ChevronRight size={14} style={{ color: "#bbb" }} />
            <span style={{ fontSize: 10, color: "#555" }}>{clip.clipNumber}</span>
          </>
        )}
      </div>

      {clipLoading ? (
        <div style={{ padding: 32 }}>
          <Skeleton height={28} width="50%" style={{ marginBottom: 16 }} />
          <Skeleton height={12} width="80%" style={{ marginBottom: 8 }} />
          <Skeleton height={12} width="70%" />
        </div>
      ) : clip ? (
        <div className="clip-detail-layout">
          {/* Left: clip info */}
          <div className="clip-detail-main">
            <div className="page-intro compact" style={{ marginBottom: 24 }}>
              <div>
                <span className="eyebrow">
                  CLIP {clip.clipNumber}
                </span>
                <h1 style={{ fontSize: 24, margin: "4px 0" }}>{clip.title}</h1>
              </div>
              <StatusPill status={clip.status} />
            </div>

            {/* Clip fields */}
            <section className="panel settings-form" style={{ marginBottom: 16 }}>
              <h2>Clip details</h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
                {CLIP_FIELDS.map(({ key, label }) => (
                  <label key={key}>
                    {label}
                    <div
                      style={{
                        marginTop: 6,
                        padding: "9px 10px",
                        border: "1px solid var(--line)",
                        borderRadius: 4,
                        background: "#fff",
                        fontSize: 10,
                        color: "#555",
                        minHeight: 36,
                      }}
                    >
                      {(clip[key] as string) || (
                        <em style={{ color: "#bbb" }}>—</em>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Prompts */}
            <section className="panel" style={{ padding: "22px 26px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 18,
                }}
              >
                <div>
                  <span className="eyebrow">AI GENERATION</span>
                  <h2 style={{ margin: "4px 0 0" }}>Prompts</h2>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {editMode ? (
                    <>
                      <button
                        className="outline-button"
                        onClick={() => {
                          setEditMode(false);
                          setPromptDrafts({});
                          setGeneratedRunId(null);
                        }}
                      >
                        <X size={14} />
                        Cancel
                      </button>
                      <button
                        className="primary-button"
                        disabled={acceptMutation.isPending}
                        onClick={() => acceptMutation.mutate(promptDrafts)}
                      >
                        <Check size={14} />
                        {acceptMutation.isPending ? "Saving…" : "Accept prompts"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="outline-button"
                        onClick={() => {
                          setEditMode(true);
                          setGeneratedRunId(null);
                          setPromptDrafts({
                            imagePrompt: clip.imagePrompt ?? "",
                            videoPrompt: clip.videoPrompt ?? "",
                            voicePrompt: clip.voicePrompt ?? "",
                            audioPrompt: clip.audioPrompt ?? "",
                            negativePrompt: clip.negativePrompt ?? "",
                          });
                        }}
                      >
                        Edit manually
                      </button>
                      {!hasProvider ? (
                        <Link
                          to={`/series/${seriesId}/settings`}
                          className="primary-button"
                          style={{ textDecoration: "none" }}
                        >
                          <Settings size={14} />
                          Configure provider
                        </Link>
                      ) : (
                        <>
                          {hasDraftPrompts && (
                            <button
                              className="outline-button"
                              onClick={() => generateMutation.mutate()}
                              disabled={generating}
                            >
                              <RotateCcw size={14} />
                              Regenerate
                            </button>
                          )}
                          <button
                            className="primary-button"
                            onClick={() => generateMutation.mutate()}
                            disabled={generating}
                          >
                            <Sparkles size={14} />
                            {generating
                              ? "Generating…"
                              : hasDraftPrompts
                              ? "Regenerate with AI"
                              : "Generate prompts with AI"}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {!hasProvider && !editMode && (
                <div className="provider-notice">
                  <Settings size={16} />
                  <div>
                    <strong>No LLM provider configured</strong>
                    <p>
                      Configure a provider in{" "}
                      <Link to={`/series/${seriesId}/settings`}>Settings</Link>{" "}
                      to use AI prompt generation, or edit prompts manually.
                    </p>
                  </div>
                </div>
              )}

              {PROMPT_FIELDS.map(({ key, compiledKey, label }) => (
                <PromptField
                  key={key}
                  label={label}
                  canonical={
                    editMode
                      ? undefined
                      : (clip[key] as string | undefined)
                  }
                  compiled={
                    compiledKey
                      ? (clip[compiledKey] as string | undefined)
                      : undefined
                  }
                  editable={editMode}
                  value={(promptDrafts[key] as string) ?? ""}
                  onChange={(v) =>
                    setPromptDrafts((d) => ({ ...d, [key]: v }))
                  }
                />
              ))}
            </section>
          </div>

          {/* Right: generation history */}
          <aside className="clip-detail-sidebar">
            <div className="panel" style={{ padding: "20px 18px" }}>
              <span className="eyebrow">HISTORY</span>
              <h3 style={{ margin: "6px 0 14px", fontSize: 17 }}>
                Generation runs
              </h3>
              {runsLoading ? (
                <>
                  <Skeleton height={60} style={{ marginBottom: 8 }} borderRadius={4} />
                  <Skeleton height={60} borderRadius={4} />
                </>
              ) : runs.length === 0 ? (
                <p
                  style={{ color: "#999", fontSize: 9, lineHeight: 1.6 }}
                >
                  No generation runs yet. Use the "Generate prompts with AI"
                  button to create your first run.
                </p>
              ) : (
                runs.map((run) => <RunItem key={run.id} run={run} />)
              )}
            </div>
          </aside>
        </div>
      ) : (
        <div style={{ padding: 40, textAlign: "center", color: "#999" }}>
          <p>Clip not found.</p>
        </div>
      )}

      {toast && (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      )}
    </>
  );
}
