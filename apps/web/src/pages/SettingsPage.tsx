import { FormEvent, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Trash2, X, Zap, RotateCcw } from "lucide-react";
import { seriesApi, settingsApi, LlmProvider } from "../api/client";
import { useSeriesContext } from "../layouts/SeriesLayout";
import { Skeleton } from "../components/Skeleton";

// ─── Provider form ────────────────────────────────────────────────────────────
function AddProviderModal({
  seriesId,
  onClose,
  onSave,
}: {
  seriesId: string;
  onClose: () => void;
  onSave: (provider: Omit<LlmProvider, "id" | "status">) => void;
}) {
  const [type, setType] = useState("openai");
  const [model, setModel] = useState("gpt-4o");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      type,
      model,
      baseUrl: baseUrl || undefined,
      apiKey: apiKey || undefined,
      isDefault,
    });
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal entity-modal"
        onSubmit={handleSubmit}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">AI INTEGRATION</span>
            <h2>Add LLM provider</h2>
          </div>
          <button type="button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>

        <div className="modal-fields">
          <label>
            Provider type
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="openai">OpenAI</option>
              <option value="ollama">Ollama (local)</option>
              <option value="openai-compatible">llama.cpp (OpenAI-compatible)</option>
            </select>
          </label>
          <label>
            Model
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o, claude-3-5-sonnet, etc."
            />
          </label>
        </div>

        <label>
          Base URL{" "}
          <span style={{ color: "#999", fontWeight: 400 }}>(optional)</span>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
          />
        </label>

        <label>
          API key
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-…"
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            style={{ width: "auto", margin: 0 }}
          />
          Set as default provider
        </label>

        <div className="modal-actions">
          <button type="button" className="outline-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-button">
            <Check size={15} />
            Add provider
          </button>
        </div>
      </form>
    </div>
  );
}

function AddAudioProviderModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: { apiKey: string; displayName?: string }) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [displayName, setDisplayName] = useState("Mage Seed Audio");
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal entity-modal"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ apiKey, displayName: displayName.trim() || undefined });
        }}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">VOICE PROFILE GENERATION</span>
            <h2>Add Mage audio provider</h2>
          </div>
          <button type="button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <div className="provider-notice">
          <Zap size={16} />
          <div>
            <strong>Seed Audio only</strong>
            <p>
              This integration is restricted to five-second character voice
              samples. Each generation currently costs Mage Gems.
            </p>
          </div>
        </div>
        <label>
          Display name
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </label>
        <label>
          Mage API key
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="mage_sk_…"
            required
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="outline-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="primary-button"
            disabled={!apiKey.startsWith("mage_sk_")}
          >
            <Check size={15} />
            Add Mage provider
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── SettingsPage ──────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { seriesId, series } = useSeriesContext();
  const qc = useQueryClient();
  const [name, setName] = useState(series?.name ?? "");
  const [premise, setPremise] = useState(series?.premise ?? "");
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showAddAudioProvider, setShowAddAudioProvider] = useState(false);
  const [toast, setToast] = useState("");
  const [testResult, setTestResult] = useState<Record<string, string>>({});

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  // Sync form when series loads
  if (series && !name) {
    setName(series.name);
    setPremise(series.premise ?? "");
  }

  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ["llm-providers", seriesId],
    queryFn: () => settingsApi.listProviders(seriesId),
    enabled: !!seriesId,
  });
  const { data: audioProviders = [], isLoading: audioProvidersLoading } = useQuery({
    queryKey: ["audio-providers", seriesId],
    queryFn: () => settingsApi.listAudioProviders(seriesId),
    enabled: !!seriesId,
  });

  const saveMutation = useMutation({
    mutationFn: () => seriesApi.update(seriesId, { name, premise }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["series"] });
      notify("Settings saved");
    },
    onError: () => notify("Failed to save settings"),
  });

  const addProviderMutation = useMutation({
    mutationFn: (provider: Omit<LlmProvider, "id" | "status">) =>
      settingsApi.addProvider(seriesId, provider),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["llm-providers", seriesId] });
      setShowAddProvider(false);
      notify("Provider added");
    },
  });

  const deleteProviderMutation = useMutation({
    mutationFn: (id: string) => settingsApi.deleteProvider(seriesId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["llm-providers", seriesId] });
      notify("Provider removed");
    },
  });
  const addAudioProviderMutation = useMutation({
    mutationFn: (data: { apiKey: string; displayName?: string }) =>
      settingsApi.addMageAudioProvider(seriesId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audio-providers", seriesId] });
      setShowAddAudioProvider(false);
      notify("Mage audio provider added");
    },
    onError: (error: any) =>
      notify(error?.response?.data?.message ?? "Could not add audio provider"),
  });
  const deleteAudioProviderMutation = useMutation({
    mutationFn: (id: string) => settingsApi.deleteAudioProvider(seriesId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audio-providers", seriesId] });
      notify("Audio provider removed");
    },
  });

  const testProvider = async (id: string) => {
    setTestResult((r) => ({ ...r, [id]: "testing" }));
    try {
      const res = await settingsApi.testProvider(seriesId, id);
      setTestResult((r) => ({
        ...r,
        [id]: res.ok ? "ok" : res.message || "failed",
      }));
    } catch {
      setTestResult((r) => ({ ...r, [id]: "error" }));
    }
  };
  const testAudioProvider = async (id: string) => {
    setTestResult((result) => ({ ...result, [id]: "testing" }));
    try {
      await settingsApi.testAudioProvider(seriesId, id);
      setTestResult((result) => ({ ...result, [id]: "ok" }));
    } catch {
      setTestResult((result) => ({ ...result, [id]: "error" }));
    }
  };

  const archiveMutation = useMutation({
    mutationFn: () => seriesApi.archive(seriesId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["series"] });
      notify("Series archived");
    },
  });

  return (
    <>
      <section className="page-intro compact">
        <div>
          <span className="eyebrow">WORKSPACE</span>
          <h1>Series settings</h1>
          <p>Manage your project identity, AI providers, and team.</p>
        </div>
      </section>

      <section className="settings-grid">
        {/* Project details */}
        <div>
          <form
            className="panel settings-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            style={{ marginBottom: 13 }}
          >
            <h2>Project details</h2>
            <label>
              Series name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label>
              One-line premise
              <textarea
                value={premise}
                onChange={(e) => setPremise(e.target.value)}
                placeholder="The central conflict or logline"
              />
            </label>
            <button
              className="primary-button"
              type="submit"
              disabled={saveMutation.isPending}
            >
              <Check size={15} />
              {saveMutation.isPending ? "Saving…" : "Save settings"}
            </button>
          </form>

          {/* LLM Providers */}
          <div className="panel settings-form">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <h2 style={{ margin: 0 }}>AI Providers</h2>
              <button
                className="outline-button"
                onClick={() => setShowAddProvider(true)}
              >
                <Plus size={14} />
                Add provider
              </button>
            </div>

            {providersLoading ? (
              <>
                <Skeleton height={52} style={{ marginBottom: 8 }} borderRadius={4} />
                <Skeleton height={52} borderRadius={4} />
              </>
            ) : providers.length === 0 ? (
              <div className="provider-notice">
                <Zap size={16} />
                <div>
                  <strong>No providers configured</strong>
                  <p>
                    Add an OpenAI, Ollama, or llama.cpp provider to enable AI
                    prompt generation.
                  </p>
                </div>
              </div>
            ) : (
              providers.map((p) => (
                <div key={p.id} className="provider-row">
                  <div className="provider-info">
                    <strong>
                      {p.type} · {p.model}
                    </strong>
                    {p.isDefault && (
                      <span className="status status-approved" style={{ marginLeft: 8 }}>
                        <i />
                        Default
                      </span>
                    )}
                    {p.baseUrl && <small>{p.baseUrl}</small>}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {testResult[p.id] && (
                      <span
                        style={{
                          fontSize: 8,
                          color:
                            testResult[p.id] === "ok"
                              ? "#5e755e"
                              : testResult[p.id] === "testing"
                              ? "#8b6c3f"
                              : "#994f45",
                          fontFamily: "DM Mono",
                        }}
                      >
                        {testResult[p.id] === "ok"
                          ? "✓ Connected"
                          : testResult[p.id] === "testing"
                          ? "Testing…"
                          : "✗ Failed"}
                      </span>
                    )}
                    <button
                      className="outline-button"
                      style={{ height: 28, fontSize: 8 }}
                      onClick={() => testProvider(p.id)}
                    >
                      Test
                    </button>
                    <button
                      style={{
                        background: "none",
                        border: 0,
                        color: "#994f45",
                        cursor: "pointer",
                        padding: 4,
                      }}
                      onClick={() => {
                        if (confirm(`Remove ${p.type} provider?`)) {
                          deleteProviderMutation.mutate(p.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="panel settings-form" style={{ marginTop: 13 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Audio provider</h2>
                <small>Character voice-profile samples only · exactly 5 seconds</small>
              </div>
              <button
                className="outline-button"
                onClick={() => setShowAddAudioProvider(true)}
              >
                <Plus size={14} />
                Add Mage
              </button>
            </div>
            {audioProvidersLoading ? (
              <Skeleton height={52} borderRadius={4} />
            ) : audioProviders.length === 0 ? (
              <div className="provider-notice">
                <Zap size={16} />
                <div>
                  <strong>No audio provider configured</strong>
                  <p>Add Mage to generate five-second character voice samples.</p>
                </div>
              </div>
            ) : (
              audioProviders.map((provider) => (
                <div key={provider.id} className="provider-row">
                  <div className="provider-info">
                    <strong>
                      {provider.displayName} · {provider.model}
                    </strong>
                    <small>Restricted to voice samples · 5 seconds</small>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {testResult[provider.id] && (
                      <span style={{ fontSize: 8, fontFamily: "DM Mono" }}>
                        {testResult[provider.id] === "ok"
                          ? "✓ Connected"
                          : testResult[provider.id] === "testing"
                            ? "Testing…"
                            : "✗ Failed"}
                      </span>
                    )}
                    <button
                      className="outline-button"
                      style={{ height: 28, fontSize: 8 }}
                      onClick={() => testAudioProvider(provider.id)}
                    >
                      Test
                    </button>
                    <button
                      style={{
                        background: "none",
                        border: 0,
                        color: "#994f45",
                        cursor: "pointer",
                        padding: 4,
                      }}
                      onClick={() => {
                        if (confirm(`Remove ${provider.displayName}?`)) {
                          deleteAudioProviderMutation.mutate(provider.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Danger zone */}
        <aside className="panel danger-zone">
          <h2>Danger zone</h2>
          <p>
            Archiving a series removes it from your active workspace. This
            action can be reversed by contacting support.
          </p>
          <button
            className="danger-button"
            onClick={() => {
              if (
                confirm(
                  `Archive "${series?.name}"? It will be removed from your workspace.`
                )
              ) {
                archiveMutation.mutate();
              }
            }}
          >
            <RotateCcw size={15} />
            Archive series
          </button>
        </aside>
      </section>

      {showAddProvider && (
        <AddProviderModal
          seriesId={seriesId}
          onClose={() => setShowAddProvider(false)}
          onSave={(provider) => addProviderMutation.mutate(provider)}
        />
      )}
      {showAddAudioProvider && (
        <AddAudioProviderModal
          onClose={() => setShowAddAudioProvider(false)}
          onSave={(data) => addAudioProviderMutation.mutate(data)}
        />
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
