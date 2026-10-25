import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Image,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Asset,
  assetsApi,
  CharacterVersion,
  manuscriptApi,
  StoryAnchorType,
  WorldEntity,
  worldApi,
} from "../api/client";

interface Props {
  seriesId: string;
  entity: WorldEntity;
  assets: Asset[];
}

interface AnchorOption {
  value: string;
  label: string;
}

const blankVersion = (): Partial<CharacterVersion> => ({
  name: "",
  externalId: "",
  description: "",
  age: undefined,
  ethnicity: "",
  skinTone: "",
  facialFeatures: "",
  visualSilhouetteDress: "",
  visualDescription: "",
  voiceProfile: "",
  voiceDescription: "",
  costumeDescription: "",
  mannerisms: "",
  architectureNotes: "",
  moodNotes: "",
  lightingNotes: "",
  environmentNotes: "",
  weatherNotes: "",
  origin: "",
  currentOwner: "",
  importance: "",
  inheritMainImage: true,
  startType: "SERIES",
  startId: undefined,
  endType: undefined,
  endId: undefined,
});

const anchorValue = (type?: StoryAnchorType, id?: string) =>
  type ? `${type}:${id ?? ""}` : "";

const parseAnchor = (value: string) => {
  if (!value) return { type: undefined, id: undefined };
  const [type, id] = value.split(":");
  return {
    type: type as StoryAnchorType,
    id: id || undefined,
  };
};

export default function CharacterVersionsPanel({
  seriesId,
  entity,
  assets,
}: Props) {
  const entityLabel = entity.type.toLowerCase();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Partial<CharacterVersion>>(blankVersion());
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: versions = [] } = useQuery({
    queryKey: ["entity-versions", seriesId, entity.id],
    queryFn: () => worldApi.listCharacterVersions(seriesId, entity.id),
  });

  const { data: manuscript } = useQuery({
    queryKey: ["manuscript", seriesId],
    queryFn: () => manuscriptApi.get(seriesId),
  });

  const anchors = useMemo<AnchorOption[]>(() => {
    const items: AnchorOption[] = [{ value: "SERIES:", label: "Beginning of series" }];
    for (const season of manuscript?.seasons ?? []) {
      items.push({
        value: `SEASON:${season.id}`,
        label: `Season ${season.seasonNumber}`,
      });
      for (const episode of season.episodes) {
        items.push({
          value: `EPISODE:${episode.id}`,
          label: `  Episode ${episode.episodeNumber}: ${episode.title}`,
        });
        for (const act of episode.acts) {
          items.push({
            value: `ACT:${act.id}`,
            label: `    Act ${act.actNumber}: ${act.title}`,
          });
          for (const scene of act.scenes) {
            items.push({
              value: `SCENE:${scene.id}`,
              label: `      Scene ${scene.sceneNumber}: ${scene.title}`,
            });
          }
        }
      }
    }
    return items;
  }, [manuscript]);

  useEffect(() => {
    if (!selectedId) return;
    const selected = versions.find((version) => version.id === selectedId);
    if (selected) setDraft(selected);
  }, [selectedId, versions]);

  const payload = () => ({
    name: draft.name?.trim(),
    externalId: draft.externalId?.trim() ?? "",
    description: draft.description ?? "",
    age: draft.age,
    ethnicity: draft.ethnicity ?? "",
    skinTone: draft.skinTone ?? "",
    facialFeatures: draft.facialFeatures ?? "",
    visualSilhouetteDress: draft.visualSilhouetteDress ?? "",
    visualDescription: draft.visualDescription ?? "",
    voiceProfile: draft.voiceProfile ?? "",
    costumeDescription: draft.costumeDescription ?? "",
    voiceDescription: draft.voiceDescription ?? "",
    mannerisms: draft.mannerisms ?? "",
    architectureNotes: draft.architectureNotes ?? "",
    moodNotes: draft.moodNotes ?? "",
    lightingNotes: draft.lightingNotes ?? "",
    environmentNotes: draft.environmentNotes ?? "",
    weatherNotes: draft.weatherNotes ?? "",
    origin: draft.origin ?? "",
    currentOwner: draft.currentOwner ?? "",
    importance: draft.importance ?? "",
    inheritMainImage: draft.inheritMainImage ?? true,
    imageAssetId: draft.inheritMainImage ? undefined : draft.imageAssetId,
    startType: draft.startType ?? "SERIES",
    startId: draft.startType === "SERIES" ? undefined : draft.startId,
    endType: draft.endType,
    endId: draft.endType === "SERIES" ? undefined : draft.endId,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      selectedId
        ? worldApi.updateCharacterVersion(
            seriesId,
            entity.id,
            selectedId,
            payload(),
          )
        : worldApi.createCharacterVersion(seriesId, entity.id, payload()),
    onSuccess: async (saved) => {
      setCreating(false);
      setSelectedId(saved.id);
      setDraft(saved);
      setMessage(`${entity.type === "CHARACTER" ? "Character" : entity.type === "LOCATION" ? "Location" : "Artifact"} version saved`);
      await qc.invalidateQueries({
        queryKey: ["entity-versions", seriesId, entity.id],
      });
    },
    onError: (error: any) =>
      setMessage(error?.response?.data?.message ?? "Unable to save version"),
  });

  const promptMutation = useMutation({
    mutationFn: () =>
      worldApi.generateCharacterVersionPrompt(
        seriesId,
        entity.id,
        selectedId!,
      ),
    onSuccess: async (updated) => {
      setDraft(updated);
      setMessage("Visual prompt generated");
      await qc.invalidateQueries({
        queryKey: ["entity-versions", seriesId, entity.id],
      });
    },
    onError: (error: any) =>
      setMessage(
        error?.response?.data?.message ??
          "Prompt generation failed. Check the series LLM provider.",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      worldApi.deleteCharacterVersion(seriesId, entity.id, selectedId!),
    onSuccess: async () => {
      setCreating(false);
      setSelectedId(null);
      setDraft(blankVersion());
      setMessage("Entity version removed");
      await qc.invalidateQueries({
        queryKey: ["entity-versions", seriesId, entity.id],
      });
    },
  });

  const uploadImage = async (file: File) => {
    if (!selectedId) {
      setMessage("Save the version before uploading its image.");
      return;
    }
    setUploading(true);
    try {
      const initiated = await assetsApi.initiateUpload(seriesId, {
        filename: file.name,
        mimeType: file.type || "image/jpeg",
        sizeBytes: file.size,
        type: "IMAGE",
        title: `${entity.displayName} — ${draft.name} version`,
        description: `Version-specific ${entityLabel} image for ${draft.name}`,
        tags: [`${entityLabel}-version`, entity.displayName.toLowerCase()],
        linkedEntityId: entity.id,
      });
      await assetsApi.uploadToPresigned(initiated.uploadUrl, file);
      const asset = await assetsApi.completeUpload(seriesId, initiated.assetId);
      const updated = await worldApi.updateCharacterVersion(
        seriesId,
        entity.id,
        selectedId,
        { imageAssetId: asset.id, inheritMainImage: false },
      );
      setDraft(updated);
      setMessage("Version image uploaded");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["assets", seriesId] }),
        qc.invalidateQueries({
          queryKey: ["entity-versions", seriesId, entity.id],
        }),
      ]);
    } catch (error: any) {
      setMessage(error?.response?.data?.message ?? "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const effectiveImage = assets.find(
    (asset) => asset.id === draft.effectiveImageAssetId,
  );
  const anchorLabel = (type?: StoryAnchorType, id?: string) =>
    anchors
      .find((anchor) => anchor.value === anchorValue(type, id))
      ?.label.trim() ?? type ?? "Story";
  const rangeLabel = (version: CharacterVersion) => {
    const start = anchorLabel(version.startType, version.startId);
    return version.endType
      ? `${start} — ${anchorLabel(version.endType, version.endId)}`
      : `${start} onward`;
  };
  const editorOpen = creating || selectedId !== null;
  const editorTitle = creating
    ? `New ${entityLabel} version`
    : draft.name || `Selected ${entityLabel} version`;

  return (
    <section className="character-versions">
      <div className="character-profile-section-head">
        <span className="eyebrow">STORY VERSIONS</span>
        <p>
          Track how this {entityLabel} changes over the course of the story.
        </p>
      </div>

      <div className="character-version-accordions">
        {versions.map((version) => (
          <div
            className={`character-version-accordion ${
              version.id === selectedId ? "active" : ""
            }`}
            key={version.id}
          >
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setSelectedId(
                  version.id === selectedId ? null : version.id,
                );
              }}
            >
              {version.id === selectedId ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
              <span>
                <strong>{version.name}</strong>
                <small>{rangeLabel(version)}</small>
              </span>
              <code>{version.effectiveExternalId}</code>
            </button>
          </div>
        ))}
        <button
          type="button"
          className={`character-version-add ${creating ? "active" : ""}`}
          onClick={() => {
            setSelectedId(null);
            if (creating) {
              setCreating(false);
            } else {
              setCreating(true);
              setDraft(blankVersion());
            }
          }}
        >
          {creating ? <ChevronDown size={14} /> : <Plus size={12} />}
          New version
        </button>
      </div>

      {editorOpen && (
      <div className="character-version-editor">
      <div className="character-version-editor-heading">
        <span>Editing version</span>
        <strong>{editorTitle}</strong>
        {!creating && (
          <small>
            Generated prompts below apply only to this {entityLabel} version.
          </small>
        )}
      </div>
      <div className="modal-fields">
        <label>
          Version name
          <input
            value={draft.name ?? ""}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder="Exile, wounded, ceremonial dress…"
          />
        </label>
        <label>
          External ID / prompt alias
          <input
            value={draft.externalId ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, externalId: event.target.value })
            }
            placeholder={`Inherit ${entity.externalId ?? entity.displayName}`}
          />
          <small>
            Effective alias: {draft.externalId || entity.externalId || entity.displayName}
          </small>
        </label>
      </div>

      <div className="modal-fields">
        <label>
          Applies from
          <select
            value={anchorValue(draft.startType, draft.startId)}
            onChange={(event) => {
              const anchor = parseAnchor(event.target.value);
              setDraft({
                ...draft,
                startType: anchor.type,
                startId: anchor.id,
              });
            }}
          >
            {anchors.map((anchor) => (
              <option key={anchor.value} value={anchor.value}>
                {anchor.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Through (optional)
          <select
            value={anchorValue(draft.endType, draft.endId)}
            onChange={(event) => {
              const anchor = parseAnchor(event.target.value);
              setDraft({
                ...draft,
                endType: anchor.type,
                endId: anchor.id,
              });
            }}
          >
            <option value="">Rest of story</option>
            {anchors.slice(1).map((anchor) => (
              <option key={anchor.value} value={anchor.value}>
                {anchor.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Version context
        <textarea
          value={draft.description ?? ""}
          onChange={(event) =>
            setDraft({ ...draft, description: event.target.value })
          }
          placeholder="What has changed and why?"
        />
      </label>
      {entity.type === "CHARACTER" && (
        <>
          <div className="modal-fields">
            <label>
              Age
              <input
                type="number"
                min={0}
                max={200}
                value={draft.age ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    age: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  })
                }
                placeholder={`Inherit ${entity.age ?? 20}`}
              />
            </label>
            <label>
              Ethnicity
              <input
                value={draft.ethnicity ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, ethnicity: event.target.value })
                }
                placeholder={`Inherit ${entity.ethnicity || "unspecified"}`}
              />
            </label>
          </div>
          <label>
            Skin tone
            <input
              value={draft.skinTone ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, skinTone: event.target.value })
              }
              placeholder={`Inherit ${entity.skinTone ?? "Fitzpatrick Type II Pinkish-ivory skin"}`}
            />
          </label>
          <label>Facial features<textarea value={draft.facialFeatures ?? ""} onChange={(event) => setDraft({ ...draft, facialFeatures: event.target.value })} placeholder="Leave blank to inherit the main character profile" /></label>
          <label>Visual Silhouette &amp; Dress<textarea value={draft.visualSilhouetteDress ?? ""} onChange={(event) => setDraft({ ...draft, visualSilhouetteDress: event.target.value })} placeholder="Version-specific silhouette, clothing, palette, and accessories" /></label>
          <label>Overall visual profile<textarea value={draft.visualDescription ?? ""} onChange={(event) => setDraft({ ...draft, visualDescription: event.target.value })} placeholder="Version-specific visual direction" /></label>
          <label>Voice profile<textarea value={draft.voiceProfile ?? ""} onChange={(event) => setDraft({ ...draft, voiceProfile: event.target.value })} placeholder="Version-specific register, cadence, texture, or delivery" /></label>
          <label>Costume details<textarea value={draft.costumeDescription ?? ""} onChange={(event) => setDraft({ ...draft, costumeDescription: event.target.value })} placeholder="Materials, wear, layers, symbols, and accessories" /></label>
        </>
      )}
      {entity.type === "LOCATION" && (
        <>
          <label>Architecture<textarea value={draft.architectureNotes ?? ""} onChange={(event) => setDraft({ ...draft, architectureNotes: event.target.value })} /></label>
          <label>Mood<textarea value={draft.moodNotes ?? ""} onChange={(event) => setDraft({ ...draft, moodNotes: event.target.value })} /></label>
          <label>Lighting<textarea value={draft.lightingNotes ?? ""} onChange={(event) => setDraft({ ...draft, lightingNotes: event.target.value })} /></label>
          <label>Environment<textarea value={draft.environmentNotes ?? ""} onChange={(event) => setDraft({ ...draft, environmentNotes: event.target.value })} /></label>
          <label>Weather<textarea value={draft.weatherNotes ?? ""} onChange={(event) => setDraft({ ...draft, weatherNotes: event.target.value })} /></label>
        </>
      )}
      {entity.type === "ARTIFACT" && (
        <>
          <label>Origin<textarea value={draft.origin ?? ""} onChange={(event) => setDraft({ ...draft, origin: event.target.value })} /></label>
          <label>Current owner<textarea value={draft.currentOwner ?? ""} onChange={(event) => setDraft({ ...draft, currentOwner: event.target.value })} /></label>
          <label>Importance<textarea value={draft.importance ?? ""} onChange={(event) => setDraft({ ...draft, importance: event.target.value })} /></label>
        </>
      )}

      <div className="character-version-image">
        <label className="character-version-inherit">
          <input
            type="checkbox"
            checked={draft.inheritMainImage ?? true}
            onChange={(event) =>
              setDraft({ ...draft, inheritMainImage: event.target.checked })
            }
          />
          Share the {entityLabel}'s main reference image
        </label>
        {effectiveImage?.thumbnailUrl || effectiveImage?.downloadUrl ? (
          <img
            src={effectiveImage.thumbnailUrl ?? effectiveImage.downloadUrl}
            alt={`${entity.displayName} ${draft.name ?? ""}`}
          />
        ) : (
          <div className="character-media-placeholder">
            <Image size={22} />
            <small>No image available</small>
          </div>
        )}
        {effectiveImage?.downloadUrl && (
          <a className="character-media-upload" href={effectiveImage.downloadUrl} download={effectiveImage.filename}>
            <Download size={13} /> Download image
          </a>
        )}
        <label className="character-media-upload">
          <Upload size={13} />
          {uploading ? "Uploading…" : "Upload version-specific image"}
          <input
            type="file"
            accept="image/*"
            disabled={uploading || !selectedId}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadImage(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {draft.generatedPrompt && (
        <label>
          Generated visual prompt for “{draft.name}”
          <textarea
            className="character-generated-prompt"
            readOnly
            value={draft.generatedPrompt}
          />
        </label>
      )}

      <div className="character-version-actions">
        {selectedId && (
          <button
            type="button"
            className="danger-text"
            onClick={() => {
              if (window.confirm(`Delete ${entityLabel} version "${draft.name}"?`)) {
                deleteMutation.mutate();
              }
            }}
          >
            <Trash2 size={13} />
            Delete version
          </button>
        )}
        <span />
        <button
          type="button"
          className="outline-button"
          disabled={!selectedId || promptMutation.isPending}
          onClick={() => promptMutation.mutate()}
        >
          <Sparkles size={13} />
          {promptMutation.isPending
            ? `Generating for ${draft.name}…`
            : `Generate prompt for “${draft.name}”`}
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={!draft.name?.trim() || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? "Saving…" : "Save version"}
        </button>
      </div>
      {message && <p className="character-version-message">{message}</p>}
      </div>
      )}
    </section>
  );
}
