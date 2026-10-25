import { FormEvent, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  ChevronRight,
  X,
  Check,
  Trash2,
  Boxes,
  Clock3,
  Compass,
  Download,
  Image,
  MapPin,
  Mic,
  Sparkles,
  Upload,
  UsersRound,
} from "lucide-react";
import { assetsApi, Asset, worldApi, WorldEntity } from "../api/client";
import { useSeriesContext } from "../layouts/SeriesLayout";
import { StatusPill } from "../components/StatusPill";
import { SkeletonRow } from "../components/Skeleton";
import CharacterVersionsPanel from "../components/CharacterVersionsPanel";

type EntityType =
  | "CHARACTER"
  | "LOCATION"
  | "ARTIFACT"
  | "ORGANIZATION"
  | "TIMELINE_EVENT";

interface Props {
  entityType: EntityType;
}

const TYPE_META: Record<
  EntityType,
  { label: string; singular: string; eyebrow: string; statuses: string[] }
> = {
  CHARACTER: {
    label: "Characters",
    singular: "character",
    eyebrow: "CAST & RELATIONSHIPS",
    statuses: ["ACTIVE", "UNKNOWN", "DECEASED"],
  },
  LOCATION: {
    label: "Locations",
    singular: "location",
    eyebrow: "WORLD & VIRTUAL SETS",
    statuses: ["ACTIVE", "RESTRICTED", "DESTROYED"],
  },
  ARTIFACT: {
    label: "Artifacts",
    singular: "artifact",
    eyebrow: "OBJECTS OF POWER",
    statuses: ["ACTIVE", "MISSING", "DESTROYED"],
  },
  ORGANIZATION: {
    label: "Organizations",
    singular: "organization",
    eyebrow: "FACTIONS & INSTITUTIONS",
    statuses: ["ACTIVE", "DISBANDED", "UNKNOWN"],
  },
  TIMELINE_EVENT: {
    label: "Timeline",
    singular: "event",
    eyebrow: "CANONICAL CHRONOLOGY",
    statuses: ["DRAFT", "CANON"],
  },
};

function EntityIcon({ kind }: { kind: EntityType }) {
  switch (kind) {
    case "CHARACTER":
      return <UsersRound size={17} />;
    case "LOCATION":
      return <MapPin size={17} />;
    case "ARTIFACT":
      return <Boxes size={17} />;
    case "ORGANIZATION":
      return <Compass size={17} />;
    case "TIMELINE_EVENT":
      return <Clock3 size={17} />;
  }
}

const initials = (v: string) =>
  v
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const parseEntityTags = (value: string) =>
  [...new Set(value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))];

// ─── Entity Modal ──────────────────────────────────────────────────────────────
function EntityModal({
  entityType,
  entity,
  onClose,
  onSave,
  onDelete,
  assets,
  onUploadMedia,
  uploadingMedia,
  seriesId,
}: {
  entityType: EntityType;
  entity?: WorldEntity;
  onClose: () => void;
  onSave: (data: Partial<WorldEntity>) => void;
  onDelete?: () => void;
  assets: Asset[];
  onUploadMedia?: (file: File, kind: "photo" | "voice" | "reference") => void;
  uploadingMedia?: "photo" | "voice" | "reference" | null;
  seriesId: string;
}) {
  const meta = TYPE_META[entityType];
  const [displayName, setDisplayName] = useState(entity?.displayName ?? "");
  const [externalId, setExternalId] = useState(entity?.externalId ?? "");
  const [subtitle, setSubtitle] = useState(entity?.subtitle ?? "");
  const [description, setDescription] = useState(entity?.description ?? "");
  const [status, setStatus] = useState(entity?.status ?? meta.statuses[0]);
  const [tags, setTags] = useState(entity?.tags?.join(", ") ?? "");
  const [age, setAge] = useState(entity?.age ?? 20);
  const [ethnicity, setEthnicity] = useState(entity?.ethnicity ?? "");
  const [skinTone, setSkinTone] = useState(
    entity?.skinTone ?? "Fitzpatrick Type II Pinkish-ivory skin",
  );
  const [facialFeatures, setFacialFeatures] = useState(entity?.facialFeatures ?? "");
  const [visualSilhouetteDress, setVisualSilhouetteDress] = useState(
    entity?.visualSilhouetteDress ?? "",
  );
  const [voiceProfile, setVoiceProfile] = useState(entity?.voiceProfile ?? "");
  const [visualDescription, setVisualDescription] = useState(
    entity?.visualDescription ?? "",
  );
  const [mannerisms, setMannerisms] = useState(entity?.mannerisms ?? "");
  const [biography, setBiography] = useState(entity?.biography ?? "");
  const [architectureNotes, setArchitectureNotes] = useState(entity?.architectureNotes ?? "");
  const [moodNotes, setMoodNotes] = useState(entity?.moodNotes ?? "");
  const [lightingNotes, setLightingNotes] = useState(entity?.lightingNotes ?? "");
  const [environmentNotes, setEnvironmentNotes] = useState(entity?.environmentNotes ?? "");
  const [weatherNotes, setWeatherNotes] = useState(entity?.weatherNotes ?? "");
  const [origin, setOrigin] = useState(entity?.origin ?? "");
  const [currentOwner, setCurrentOwner] = useState(entity?.currentOwner ?? "");
  const [importance, setImportance] = useState(entity?.importance ?? "");
  const [baseImagePrompt, setBaseImagePrompt] = useState(entity?.imagePrompt ?? "");
  const [basePromptMessage, setBasePromptMessage] = useState("");
  const [generatedVoiceUrl, setGeneratedVoiceUrl] = useState("");
  const [voiceGenerationMessage, setVoiceGenerationMessage] = useState("");
  const modalQueryClient = useQueryClient();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    onSave({
      displayName: displayName.trim(),
      externalId: externalId.trim() || undefined,
      subtitle: subtitle.trim(),
      description: description.trim(),
      status,
      tags: parseEntityTags(tags),
      type: entityType,
      ...(entityType === "CHARACTER" && {
        age,
        ethnicity: ethnicity.trim() || undefined,
        skinTone: skinTone.trim(),
        facialFeatures: facialFeatures.trim(),
        visualSilhouetteDress: visualSilhouetteDress.trim(),
        voiceProfile: voiceProfile.trim(),
        visualDescription: visualDescription.trim(),
        mannerisms: mannerisms.trim(),
        biography: biography.trim(),
      }),
      ...(entityType === "LOCATION" && {
        architectureNotes: architectureNotes.trim(),
        moodNotes: moodNotes.trim(),
        lightingNotes: lightingNotes.trim(),
        environmentNotes: environmentNotes.trim(),
        weatherNotes: weatherNotes.trim(),
      }),
      ...(entityType === "ARTIFACT" && {
        origin: origin.trim(),
        currentOwner: currentOwner.trim(),
        importance: importance.trim(),
      }),
    });
  };

  const profilePhoto = assets.find((asset) => asset.id === entity?.profilePhotoAssetId);
  const voiceSample = assets.find((asset) => asset.id === entity?.voiceSampleAssetId);
  const referenceImage = assets.find((asset) => asset.id === entity?.referenceImageAssetId);
  const { data: assignmentHistory = [] } = useQuery({
    queryKey: ["entity-assignment-history", seriesId, entity?.id],
    queryFn: () => worldApi.getEntityAssignmentHistory(seriesId, entity!.id),
    enabled: !!entity,
  });
  const basePromptMutation = useMutation({
    mutationFn: () =>
      worldApi.generateBaseCharacterPrompt(seriesId, entity!.id, {
        displayName,
        externalId,
        description,
        age,
        ethnicity,
        skinTone,
        facialFeatures,
        visualSilhouetteDress,
        visualDescription,
        voiceProfile,
        mannerisms,
      }),
    onSuccess: async (updated) => {
      setBaseImagePrompt(updated.imagePrompt ?? "");
      setBasePromptMessage(`Generated for base version of ${displayName}`);
      await modalQueryClient.invalidateQueries({
        queryKey: ["world", seriesId, entityType],
      });
    },
    onError: (error: any) =>
      setBasePromptMessage(
        error?.response?.data?.message ??
          "Prompt generation failed. Check the series LLM provider.",
      ),
  });
  const voiceSampleMutation = useMutation({
    mutationFn: () =>
      worldApi.generateVoiceSample(seriesId, entity!.id, voiceProfile),
    onSuccess: async (result) => {
      setGeneratedVoiceUrl(result.downloadUrl);
      setVoiceGenerationMessage(
        `Generated 5-second Mage sample${
          result.gemsCharged !== undefined
            ? ` · ${result.gemsCharged} gems`
            : ""
        }`,
      );
      await Promise.all([
        modalQueryClient.invalidateQueries({ queryKey: ["assets", seriesId] }),
        modalQueryClient.invalidateQueries({
          queryKey: ["world", seriesId, entityType],
        }),
        modalQueryClient.invalidateQueries({
          queryKey: ["entity-assignment-history", seriesId, entity?.id],
        }),
      ]);
    },
    onError: (error: any) =>
      setVoiceGenerationMessage(
        error?.response?.data?.message ?? "Voice sample generation failed",
      ),
  });

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal entity-modal"
        onSubmit={handleSubmit}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">
              {entity ? `EDIT ${meta.singular.toUpperCase()}` : `NEW ${meta.singular.toUpperCase()}`}
            </span>
            <h2>{entity ? entity.displayName : `Create ${meta.singular}`}</h2>
          </div>
          <button type="button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>

        <div className="modal-fields">
          <label>
            Display name
            <input
              autoFocus
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={`Untitled ${meta.singular}`}
            />
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {meta.statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>

        <label>
          External ID / prompt alias
          <input
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
            placeholder="jcerna-01a3"
            pattern="[a-zA-Z0-9_-]{1,64}"
          />
        </label>

        <label>
          Role / context
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Role, setting, or context"
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Story details, goals, or visual direction"
          />
        </label>

        <label>
          Tags
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="searchable, metadata, tags"
          />
        </label>

        {entityType === "CHARACTER" && (
          <section className="character-profile-fields">
            <div className="character-profile-section-head">
              <span className="eyebrow">CHARACTER APPEARANCE & PERFORMANCE</span>
              <p>These details are available to story and production prompts.</p>
            </div>

            <div className="modal-fields">
              <label>
                Age
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={age}
                  onChange={(event) => setAge(Number(event.target.value))}
                />
              </label>
              <label>
                Ethnicity <small>(optional)</small>
                <input
                  value={ethnicity}
                  onChange={(event) => setEthnicity(event.target.value)}
                  placeholder="Optional cultural or ethnic identity"
                />
              </label>
            </div>

            <label>
              Skin tone
              <input
                value={skinTone}
                onChange={(event) => setSkinTone(event.target.value)}
                placeholder="Fitzpatrick type and descriptive tone"
              />
            </label>

            <label>
              Facial features
              <textarea
                value={facialFeatures}
                onChange={(e) => setFacialFeatures(e.target.value)}
                placeholder="Face shape, eyes, hair, complexion, distinguishing marks…"
              />
            </label>

            <label>
              Visual Silhouette &amp; Dress
              <textarea
                value={visualSilhouetteDress}
                onChange={(e) => setVisualSilhouetteDress(e.target.value)}
                placeholder="Recognizable silhouette, build, posture, wardrobe, palette, accessories…"
              />
            </label>

            <label>
              Overall visual profile
              <textarea
                value={visualDescription}
                onChange={(e) => setVisualDescription(e.target.value)}
                placeholder="The complete visual direction for image and video generation…"
              />
            </label>

            <label>
              Voice Profile
              <textarea
                value={voiceProfile}
                onChange={(e) => setVoiceProfile(e.target.value)}
                placeholder="Age, register, accent, cadence, texture, emotional range, delivery notes…"
              />
            </label>

            <label>
              Mannerisms &amp; physical behavior
              <textarea
                value={mannerisms}
                onChange={(e) => setMannerisms(e.target.value)}
                placeholder="Gestures, posture, movement patterns, habitual expressions…"
              />
            </label>

            <label>
              Biography
              <textarea
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                placeholder="Background and personal history…"
              />
            </label>

            <div className="base-character-prompt">
              <div>
                <span className="eyebrow">BASE VERSION VISUAL PROMPT</span>
                <p>
                  Generates the canonical appearance for {displayName || "this character"},
                  separate from story-specific versions.
                </p>
              </div>
              <button
                type="button"
                className="outline-button"
                disabled={!entity || basePromptMutation.isPending}
                onClick={() => basePromptMutation.mutate()}
              >
                <Sparkles size={13} />
                {basePromptMutation.isPending
                  ? `Generating for ${displayName}…`
                  : `Generate base prompt for “${displayName || "character"}”`}
              </button>
              {baseImagePrompt && (
                <label>
                  Base visual prompt for “{displayName}”
                  <textarea
                    className="character-generated-prompt"
                    readOnly
                    value={baseImagePrompt}
                  />
                </label>
              )}
              {basePromptMessage && <small>{basePromptMessage}</small>}
            </div>

            <div className="character-media-grid">
              <div className="character-media-field">
                <span>Profile photo</span>
                {profilePhoto?.thumbnailUrl || profilePhoto?.downloadUrl ? (
                  <img
                    src={profilePhoto.thumbnailUrl ?? profilePhoto.downloadUrl}
                    alt={`${entity?.displayName ?? "Character"} profile`}
                  />
                ) : (
                  <div className="character-media-placeholder">
                    <Image size={22} />
                    <small>No profile photo</small>
                  </div>
                )}
                {entity && onUploadMedia ? (
                  <label className="character-media-upload">
                    <Upload size={13} />
                    {uploadingMedia === "photo" ? "Uploading…" : "Upload image"}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={!!uploadingMedia}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) onUploadMedia(file, "photo");
                        event.target.value = "";
                      }}
                    />
                  </label>
                ) : (
                  <small className="character-media-hint">Save the character before uploading.</small>
                )}
                {profilePhoto?.downloadUrl && (
                  <a className="character-media-upload" href={profilePhoto.downloadUrl} download={profilePhoto.filename}>
                    <Download size={13} /> Download image
                  </a>
                )}
              </div>

              <div className="character-media-field">
                <span>Voice sample</span>
                {generatedVoiceUrl || voiceSample?.downloadUrl ? (
                  <audio
                    controls
                    preload="metadata"
                    src={generatedVoiceUrl || voiceSample?.downloadUrl}
                  >
                    Your browser does not support audio playback.
                  </audio>
                ) : (
                  <div className="character-media-placeholder">
                    <Mic size={22} />
                    <small>No voice sample</small>
                  </div>
                )}
                {entity && onUploadMedia ? (
                  <>
                    <label className="character-media-upload">
                      <Upload size={13} />
                      {uploadingMedia === "voice" ? "Uploading…" : "Upload audio"}
                      <input
                        type="file"
                        accept="audio/*"
                        disabled={!!uploadingMedia}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) onUploadMedia(file, "voice");
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="character-media-upload"
                      disabled={
                        voiceSampleMutation.isPending || !voiceProfile.trim()
                      }
                      onClick={() => voiceSampleMutation.mutate()}
                    >
                      <Sparkles size={13} />
                      {voiceSampleMutation.isPending
                        ? "Generating 5-second sample…"
                        : "Generate with Mage · 5 sec"}
                    </button>
                    <small className="character-media-hint">
                      Voice-profile reference only. Mage Gems are charged.
                    </small>
                    {voiceGenerationMessage && (
                      <small className="character-version-message">
                        {voiceGenerationMessage}
                      </small>
                    )}
                  </>
                ) : (
                  <small className="character-media-hint">Save the character before uploading.</small>
                )}
                {(generatedVoiceUrl || voiceSample?.downloadUrl) && (
                  <a
                    className="character-media-upload"
                    href={generatedVoiceUrl || voiceSample?.downloadUrl}
                    download={voiceSample?.filename || `${displayName}-voice-sample.mp3`}
                  >
                    <Download size={13} /> Download voice sample
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        {["CHARACTER", "LOCATION", "ARTIFACT"].includes(entityType) && entity && (
          <CharacterVersionsPanel
            seriesId={seriesId}
            entity={entity}
            assets={assets}
          />
        )}

        {(entityType === "LOCATION" || entityType === "ARTIFACT") && (
          <section className="character-profile-fields">
            {entityType === "LOCATION" ? (
              <>
                <label>Architecture notes<textarea value={architectureNotes} onChange={(e) => setArchitectureNotes(e.target.value)} /></label>
                <label>Mood notes<textarea value={moodNotes} onChange={(e) => setMoodNotes(e.target.value)} /></label>
                <label>Lighting notes<textarea value={lightingNotes} onChange={(e) => setLightingNotes(e.target.value)} /></label>
                <label>Environment notes<textarea value={environmentNotes} onChange={(e) => setEnvironmentNotes(e.target.value)} /></label>
                <label>Weather notes<textarea value={weatherNotes} onChange={(e) => setWeatherNotes(e.target.value)} /></label>
              </>
            ) : (
              <>
                <label>Origin<textarea value={origin} onChange={(e) => setOrigin(e.target.value)} /></label>
                <label>Current owner<textarea value={currentOwner} onChange={(e) => setCurrentOwner(e.target.value)} /></label>
                <label>Importance<textarea value={importance} onChange={(e) => setImportance(e.target.value)} /></label>
              </>
            )}
            <div className="character-profile-section-head">
              <span className="eyebrow">VISUAL REFERENCE</span>
              <p>Save a canonical reference image for this {meta.singular}.</p>
            </div>
            <div className="character-media-field">
              <span>{entityType === "LOCATION" ? "Location photo" : "Artifact photo"}</span>
              {referenceImage?.thumbnailUrl || referenceImage?.downloadUrl ? (
                <img
                  src={referenceImage.thumbnailUrl ?? referenceImage.downloadUrl}
                  alt={`${entity?.displayName ?? meta.singular} reference`}
                />
              ) : (
                <div className="character-media-placeholder">
                  <Image size={22} />
                  <small>No reference image</small>
                </div>
              )}
              {entity && onUploadMedia ? (
                <label className="character-media-upload">
                  <Upload size={13} />
                  {uploadingMedia === "reference" ? "Uploading…" : "Upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={!!uploadingMedia}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) onUploadMedia(file, "reference");
                      event.target.value = "";
                    }}
                  />
                </label>
              ) : (
                <small className="character-media-hint">Save the {meta.singular} before uploading.</small>
              )}
              {referenceImage?.downloadUrl && (
                <a className="character-media-upload" href={referenceImage.downloadUrl} download={referenceImage.filename}>
                  <Download size={13} /> Download image
                </a>
              )}
            </div>
          </section>
        )}

        {entity && assignmentHistory.length > 0 && (
          <section className="character-profile-fields asset-lifecycle-history">
            <div className="character-profile-section-head">
              <span className="eyebrow">ASSET LIFECYCLE</span>
              <p>Current and previously replaced media for this {meta.singular}.</p>
            </div>
            {assignmentHistory.map((assignment) => (
              <div className="asset-lifecycle-row" key={assignment.id}>
                <span className={`asset-assignment-status ${assignment.status.toLowerCase()}`}>
                  {assignment.status}
                </span>
                <div>
                  <strong>{assignment.asset?.title ?? assignment.role.replace(/_/g, " ")}</strong>
                  <small>
                    {assignment.role.replace(/_/g, " ")}
                    {assignment.asset?.source ? ` · ${assignment.asset.source.replace(/_/g, " ")}` : ""}
                    {assignment.asset?.generationModel ? ` · ${assignment.asset.generationModel}` : ""}
                  </small>
                  {assignment.note && <p>{assignment.note}</p>}
                </div>
              </div>
            ))}
          </section>
        )}

        <div className="modal-actions">
          {entity && onDelete && (
            <button className="danger-text" type="button" onClick={onDelete}>
              <Trash2 size={15} />
              Delete
            </button>
          )}
          <span />
          <button className="outline-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            <Check size={15} />
            {entity ? "Save changes" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── WorldPage ─────────────────────────────────────────────────────────────────
export default function WorldPage({ entityType }: Props) {
  const { seriesId } = useSeriesContext();
  const qc = useQueryClient();
  const meta = TYPE_META[entityType];
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modal, setModal] = useState<{ entity?: WorldEntity } | null>(null);
  const [toast, setToast] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState<
    "photo" | "voice" | "reference" | null
  >(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const { data: entities = [], isLoading } = useQuery({
    queryKey: ["world", seriesId, entityType],
    queryFn: () => worldApi.list(seriesId, entityType),
    enabled: !!seriesId,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["assets", seriesId],
    queryFn: () => assetsApi.list(seriesId),
    enabled:
      !!seriesId &&
      ["CHARACTER", "LOCATION", "ARTIFACT"].includes(entityType),
  });

  const uploadCharacterMedia = async (
    entity: WorldEntity,
    file: File,
    kind: "photo" | "voice" | "reference",
  ) => {
    setUploadingMedia(kind);
    const label =
      kind === "photo"
        ? "Profile Photo"
        : kind === "voice"
          ? "Voice Sample"
          : "Reference Image";
    try {
      const isPhoto = kind !== "voice";
      const initiated = await assetsApi.initiateUpload(seriesId, {
        filename: file.name,
        mimeType: file.type || (isPhoto ? "image/jpeg" : "audio/mpeg"),
        sizeBytes: file.size,
        type: isPhoto ? "IMAGE" : "AUDIO",
        title: `${entity.displayName} — ${label}`,
        description: `${label} for ${entity.displayName}`,
        tags: [
          kind === "photo"
            ? "character-profile"
            : kind === "voice"
              ? "character-voice-sample"
              : `${entity.type.toLowerCase()}-reference`,
        ],
        linkedEntityId: entity.id,
      });
      await assetsApi.uploadToPresigned(initiated.uploadUrl, file);
      const asset = await assetsApi.completeUpload(seriesId, initiated.assetId);
      const updated = await worldApi.update(seriesId, entity.id, {
        [
          kind === "photo"
            ? "profilePhotoAssetId"
            : kind === "voice"
              ? "voiceSampleAssetId"
              : "referenceImageAssetId"
        ]: asset.id,
      });
      setModal({ entity: updated });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["assets", seriesId] }),
        qc.invalidateQueries({ queryKey: ["world", seriesId, entityType] }),
        qc.invalidateQueries({
          queryKey: ["entity-assignment-history", seriesId, entity.id],
        }),
      ]);
      notify(`${label} uploaded`);
    } catch (error: any) {
      notify(
        error?.response?.data?.message ??
          `Unable to upload ${label.toLowerCase()}`,
      );
    } finally {
      setUploadingMedia(null);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<WorldEntity>) =>
      worldApi.create(seriesId, { ...data, type: entityType } as Omit<WorldEntity, "id" | "createdAt">),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["world", seriesId, entityType] });
      setModal(null);
      notify(`${meta.singular} created`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WorldEntity> }) =>
      worldApi.update(seriesId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["world", seriesId, entityType] });
      setModal(null);
      notify("Changes saved");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => worldApi.delete(seriesId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["world", seriesId, entityType] });
      setModal(null);
      notify(`${meta.singular} deleted`);
    },
  });

  const filtered = entities.filter(
    (e) =>
      (statusFilter === "All" || e.status === statusFilter) &&
      (e.displayName + (e.externalId ?? "") + (e.subtitle ?? "") + (e.description ?? ""))
        .toLowerCase()
        .includes(query.toLowerCase())
  );

  const isCharOrLoc = entityType === "CHARACTER" || entityType === "LOCATION";
  const getAsset = (assetId?: string) =>
    assetId ? assets.find((asset) => asset.id === assetId) : undefined;
  const getVisualAsset = (entity: WorldEntity) =>
    getAsset(
      entity.type === "CHARACTER"
        ? entity.profilePhotoAssetId
        : entity.referenceImageAssetId,
    );

  return (
    <>
      <section className="page-intro compact">
        <div>
          <span className="eyebrow">{meta.eyebrow}</span>
          <h1>{meta.label}</h1>
        </div>
        <button className="primary-button" onClick={() => setModal({})}>
          <Plus size={17} />
          New {meta.singular}
        </button>
      </section>

      <div className="filter-row">
        <div className="field-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${meta.label.toLowerCase()}…`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>All</option>
          {meta.statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <span>{filtered.length} results</span>
      </div>

      {isCharOrLoc ? (
        /* Card grid for Characters & Locations */
        <section className="character-grid">
          {isLoading
            ? [1, 2, 3, 4].map((i) => (
                <div className="character-card panel" key={i}>
                  <div
                    className="character-visual"
                    style={{ "--card-color": "#5f564d" } as React.CSSProperties}
                  />
                  <div className="character-copy" style={{ padding: 16 }}>
                    <div style={{ height: 60 }} />
                  </div>
                </div>
              ))
            : filtered.map((entity) => (
                <article className="character-card" key={entity.id}>
                  <button
                    className="card-hitarea"
                    onClick={() => setModal({ entity })}
                    aria-label={`Open ${entity.displayName}`}
                  />
                  <div
                    className="character-visual"
                    style={
                      {
                        "--card-color": entity.color || "#655b4f",
                      } as React.CSSProperties
                    }
                  >
                    {getVisualAsset(entity)?.thumbnailUrl ||
                    getVisualAsset(entity)?.downloadUrl ? (
                      <img
                        className="character-profile-photo"
                        src={
                          getVisualAsset(entity)?.thumbnailUrl ??
                          getVisualAsset(entity)?.downloadUrl
                        }
                        alt={entity.displayName}
                      />
                    ) : (
                      <span>{initials(entity.displayName)}</span>
                    )}
                    <i>{entity.status}</i>
                  </div>
                  <div className="character-copy">
                    <small>{entity.subtitle}</small>
                    <h2>{entity.displayName}</h2>
                    {entity.externalId && <code className="external-id-badge">{entity.externalId}</code>}
                    <p>"{entity.description}"</p>
                    <div>
                      <span>
                        {entity.type === "CHARACTER" && entity.voiceSampleAssetId
                          ? "Voice sample ready"
                          : entity.tags?.join(" · ") || "Profile ready"}
                      </span>
                      <button onClick={() => setModal({ entity })}>
                        Open profile <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
          {!isLoading && filtered.length === 0 && (
            <div
              className="panel asset-empty"
              style={{ gridColumn: "1 / -1" }}
            >
              <h2>No {meta.label.toLowerCase()} found</h2>
              <p>Create the first one or adjust your search filters.</p>
              <button className="primary-button" onClick={() => setModal({})}>
                <Plus size={16} />
                Add {meta.singular}
              </button>
            </div>
          )}
        </section>
      ) : (
        /* Table for other types */
        <section className="panel data-table">
          <div className="data-head">
            <span>NAME & DESCRIPTION</span>
            <span>STATUS</span>
            <span>TAGS</span>
            <span>ACTIONS</span>
          </div>
          {isLoading
            ? [1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)
            : filtered.map((entity) => (
                <button
                  className="data-row"
                  key={entity.id}
                  onClick={() => setModal({ entity })}
                >
                  <span className="entity-main">
                    <i>
                      <EntityIcon kind={entityType} />
                    </i>
                    <span>
                      <strong>{entity.displayName}</strong>
                      <small>
                        {entity.subtitle}
                        {entity.externalId ? ` · ${entity.externalId}` : ""}
                        {entity.description ? ` · ${entity.description}` : ""}
                      </small>
                    </span>
                  </span>
                  <span>
                    <StatusPill status={entity.status} />
                  </span>
                  <span>{entity.tags?.join(", ") || "—"}</span>
                  <span className="row-actions">
                    <ChevronRight size={15} />
                  </span>
                </button>
              ))}
          {!isLoading && filtered.length === 0 && (
            <div style={{ padding: "32px", textAlign: "center", color: "#999", fontSize: 9 }}>
              No {meta.label.toLowerCase()} found.{" "}
              <button
                style={{ background: "none", border: 0, color: "#a08356", cursor: "pointer" }}
                onClick={() => setModal({})}
              >
                Create one →
              </button>
            </div>
          )}
        </section>
      )}

      {modal && (
        <EntityModal
          seriesId={seriesId}
          entityType={entityType}
          entity={modal.entity}
          onClose={() => setModal(null)}
          onSave={(data) => {
            if (modal.entity) {
              updateMutation.mutate({ id: modal.entity.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          assets={assets}
          uploadingMedia={uploadingMedia}
          onUploadMedia={
            modal.entity &&
            ["CHARACTER", "LOCATION", "ARTIFACT"].includes(entityType)
              ? (file, kind) => uploadCharacterMedia(modal.entity!, file, kind)
              : undefined
          }
          onDelete={
            modal.entity
              ? () => {
                  if (confirm(`Delete "${modal.entity!.displayName}"? This cannot be undone.`)) {
                    deleteMutation.mutate(modal.entity!.id);
                  }
                }
              : undefined
          }
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
