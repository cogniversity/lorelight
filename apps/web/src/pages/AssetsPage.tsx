import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  FileText,
  Film,
  Image,
  Music,
  Download,
  X,
  FolderOpen,
  Plus,
  Search,
} from "lucide-react";
import { assetsApi, Asset } from "../api/client";
import { useSeriesContext } from "../layouts/SeriesLayout";
import { StatusPill } from "../components/StatusPill";
import { Skeleton } from "../components/Skeleton";

// ─── Asset type icon ───────────────────────────────────────────────────────────
function AssetIcon({ mimeType }: { mimeType?: string }) {
  if (!mimeType) return <FileText size={18} />;
  if (mimeType.startsWith("image/")) return <Image size={18} />;
  if (mimeType.startsWith("video/")) return <Film size={18} />;
  if (mimeType.startsWith("audio/")) return <Music size={18} />;
  return <FileText size={18} />;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Upload modal ──────────────────────────────────────────────────────────────
function UploadModal({
  seriesId,
  onClose,
  onComplete,
}: {
  seriesId: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [isFinal, setIsFinal] = useState(false);

  const handleUpload = async () => {
    setUploading(true);
    for (const file of files) {
      setProgress((p) => ({ ...p, [file.name]: "Getting URL…" }));
      try {
        // Step 1: get presigned URL
        const assetType = file.type.startsWith("image/")
          ? "IMAGE"
          : file.type.startsWith("video/")
            ? "VIDEO"
            : file.type.startsWith("audio/")
              ? "AUDIO"
              : "DOCUMENT";
        const { uploadUrl, assetId } = await assetsApi.initiateUpload(seriesId, {
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          type: assetType,
          title: file.name,
          description: notes || undefined,
          versionNotes: notes || undefined,
          tags: tags.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean),
          isFinal: files.length === 1 && isFinal,
        });

        // Step 2: PUT directly to MinIO
        setProgress((p) => ({ ...p, [file.name]: "Uploading…" }));
        await assetsApi.uploadToPresigned(uploadUrl, file);

        // Step 3: complete
        setProgress((p) => ({ ...p, [file.name]: "Completing…" }));
        await assetsApi.completeUpload(seriesId, assetId, file.name, assetType);
        setProgress((p) => ({ ...p, [file.name]: "Done" }));
      } catch {
        setProgress((p) => ({ ...p, [file.name]: "Failed" }));
      }
    }
    setUploading(false);
    onComplete();
    onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">ASSET LIBRARY</span>
            <h2>Upload assets</h2>
          </div>
          <button onClick={onClose}>
            <X size={19} />
          </button>
        </div>

        <button
          className="upload-zone"
          onClick={() => fileInput.current?.click()}
        >
          <Upload size={27} />
          <strong>Choose production files</strong>
          <span>Images, video, audio, storyboards, and documents</span>
        </button>

        <input
          ref={fileInput}
          hidden
          type="file"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />

        {files.map((file) => (
          <div className="upload-file" key={file.name}>
            <FileText size={16} />
            <span>{file.name}</span>
            <small>{formatBytes(file.size)}</small>
            {progress[file.name] && (
              <small style={{ color: "#5e755e" }}>{progress[file.name]}</small>
            )}
          </div>
        ))}

        <label className="asset-upload-field">
          Tags
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="reference, exterior, approved"
          />
        </label>
        <label className="asset-upload-field">
          Description / version notes
          <textarea
            required
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Required: what this asset is for, its source, or version context"
          />
        </label>
        {files.length <= 1 && (
          <label className="asset-final-check">
            <input
              type="checkbox"
              checked={isFinal}
              onChange={(event) => setIsFinal(event.target.checked)}
            />
            Mark as final
          </label>
        )}

        <div className="modal-actions">
          <button className="outline-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-button"
            disabled={!files.length || !notes.trim() || uploading}
            onClick={handleUpload}
          >
            <Upload size={15} />
            {uploading ? "Uploading…" : `Upload ${files.length || ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AssetCard ─────────────────────────────────────────────────────────────────
function AssetCard({
  asset,
  onAbandon,
  onDownload,
}: {
  asset: Asset;
  onAbandon: (assetId: string, assignmentId: string) => void;
  onDownload: (assetId: string) => void;
}) {
  return (
    <div className="asset-card panel">
      <div className="asset-card-preview">
        {asset.mimeType?.startsWith("video/") && (asset.downloadUrl || asset.url) ? (
          <video controls preload="metadata" src={asset.downloadUrl ?? asset.url} />
        ) : asset.mimeType?.startsWith("audio/") && (asset.downloadUrl || asset.url) ? (
          <div className="asset-audio-preview">
            <Music size={22} />
            <audio controls preload="metadata" src={asset.downloadUrl ?? asset.url} />
          </div>
        ) : asset.thumbnailUrl ? (
          <img src={asset.thumbnailUrl} alt={asset.title} className="asset-thumb" />
        ) : (
          <div className="asset-thumb-placeholder">
            <AssetIcon mimeType={asset.mimeType} />
          </div>
        )}
      </div>
      <div className="asset-card-body">
        <strong className="asset-title">{asset.title}</strong>
        <div className="asset-meta">
          <StatusPill status={asset.status} />
          {(asset.sizeBytes || asset.fileSize) && (
            <span style={{ fontSize: 8, color: "#999" }}>
              {formatBytes(asset.sizeBytes ?? asset.fileSize)}
            </span>
          )}
        </div>
        {asset.assetType && (
          <small className="asset-type">{asset.assetType}</small>
        )}
        <small className="asset-type">
          {asset.source === "MAGE_SEED_AUDIO"
            ? `Generated · ${asset.generationProvider ?? "Mage"} · ${asset.generationModel ?? ""}`
            : "Uploaded"}
        </small>
        {asset.generationPrompt && (
          <details className="asset-provenance">
            <summary>Prompt used</summary>
            <p>{asset.generationPrompt}</p>
            {asset.generationRequestId && <code>{asset.generationRequestId}</code>}
          </details>
        )}
        {asset.isFinal && <span className="asset-final-badge">FINAL</span>}
        {asset.versionNotes && <p className="asset-version-notes">{asset.versionNotes}</p>}
        {!!asset.tags?.length && (
          <div className="asset-tags">
            {asset.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        )}
        {!!asset.assignments?.length && (
          <div className="asset-assignment-list">
            {asset.assignments.map((assignment) => (
              <div key={assignment.id}>
                <span className={`asset-assignment-status ${assignment.status.toLowerCase()}`}>
                  {assignment.status}
                </span>
                <small>{assignment.role.replace(/_/g, " ")}</small>
                {assignment.note && <p>{assignment.note}</p>}
                {assignment.status === "ASSIGNED" && (
                  <button
                    type="button"
                    className="danger-text"
                    onClick={() => onAbandon(asset.id, assignment.id)}
                  >
                    Abandon assignment
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {asset.status !== "PENDING" && (
        <button
          type="button"
          className="asset-download"
          title="Download"
          onClick={(event) => {
            event.stopPropagation();
            onDownload(asset.id);
          }}
        >
          <Download size={14} />
        </button>
      )}
    </div>
  );
}

// ─── AssetsPage ───────────────────────────────────────────────────────────────
export default function AssetsPage() {
  const { seriesId } = useSeriesContext();
  const qc = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [filter, setFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [assignmentFilter, setAssignmentFilter] = useState("All");
  const [query, setQuery] = useState("");

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["assets", seriesId],
    queryFn: () => assetsApi.list(seriesId),
    enabled: !!seriesId,
  });

  const typeFilters = ["All", "IMAGE", "VIDEO", "AUDIO", "DOCUMENT"];
  const abandonMutation = useMutation({
    mutationFn: ({
      assetId,
      assignmentId,
    }: {
      assetId: string;
      assignmentId: string;
    }) =>
      assetsApi.abandonAssignment(
        seriesId,
        assetId,
        assignmentId,
        window.prompt("Reason for abandoning this assignment?") || undefined,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets", seriesId] }),
  });
  const downloadAsset = async (assetId: string) => {
    const { downloadUrl } = await assetsApi.getDownload(seriesId, assetId);
    window.location.assign(downloadUrl);
  };

  const filtered = assets.filter((asset) => {
    const typeMatches =
      filter === "All" ||
      asset.type?.toUpperCase() === filter ||
      asset.assetType?.toUpperCase() === filter;
    const sourceMatches =
      sourceFilter === "All" || asset.source === sourceFilter;
    const assignmentMatches =
      assignmentFilter === "All" ||
      asset.assignments?.some((assignment) => assignment.status === assignmentFilter);
    const haystack = [
      asset.title,
      asset.versionNotes,
      ...(asset.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      typeMatches &&
      sourceMatches &&
      assignmentMatches &&
      haystack.includes(query.trim().toLowerCase())
    );
  });

  return (
    <>
      <section className="page-intro compact">
        <div>
          <span className="eyebrow">PRODUCTION LIBRARY</span>
          <h1>Assets</h1>
          <p>Reference images, storyboards, video, audio, and documents.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => setShowUpload(true)}
        >
          <Plus size={17} />
          Upload asset
        </button>
      </section>

      {/* Filter row */}
      <div className="filter-row" style={{ marginBottom: 18 }}>
        <div className="field-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search names, notes, or tags…"
          />
        </div>
        {typeFilters.map((t) => (
          <button
            key={t}
            style={{
              height: 34,
              padding: "0 12px",
              border: `1px solid ${filter === t ? "#66776a" : "var(--line)"}`,
              borderRadius: 4,
              background: filter === t ? "#e8eee8" : "var(--paper)",
              fontSize: 9,
              color: filter === t ? "#4c6151" : "#6f7069",
              cursor: "pointer",
            }}
            onClick={() => setFilter(t)}
          >
            {t}
          </button>
        ))}
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="All">All sources</option>
          <option value="UPLOAD">Uploaded</option>
          <option value="MAGE_SEED_AUDIO">Mage generated</option>
        </select>
        <select value={assignmentFilter} onChange={(e) => setAssignmentFilter(e.target.value)}>
          <option value="All">All lifecycle states</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="ABANDONED">Abandoned</option>
        </select>
        <span style={{ marginLeft: "auto", fontSize: 9, color: "#999" }}>
          {filtered.length} asset{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {isLoading ? (
        <div className="asset-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div className="asset-card panel" key={i}>
              <div className="asset-card-preview">
                <div className="asset-thumb-placeholder">
                  <Skeleton width={40} height={40} borderRadius="50%" />
                </div>
              </div>
              <div className="asset-card-body">
                <Skeleton height={10} width="80%" style={{ marginBottom: 8 }} />
                <Skeleton height={18} width={60} borderRadius={10} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <section className="panel asset-empty">
          <div className="asset-stack">
            <FolderOpen size={31} />
          </div>
          <h2>
            {filter === "All" ? "Your creative library" : `No ${filter.toLowerCase()} assets`}
          </h2>
          <p>
            {filter === "All"
              ? "Upload and organize references, generated media, audio, and documents."
              : `Upload ${filter.toLowerCase()} files to get started.`}
          </p>
          <button
            className="primary-button"
            onClick={() => setShowUpload(true)}
          >
            <Plus size={16} />
            Upload first asset
          </button>
        </section>
      ) : (
        <div className="asset-grid">
          {filtered.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onAbandon={(assetId, assignmentId) =>
                abandonMutation.mutate({ assetId, assignmentId })
              }
              onDownload={downloadAsset}
            />
          ))}
        </div>
      )}

      {showUpload && (
        <UploadModal
          seriesId={seriesId}
          onClose={() => setShowUpload(false)}
          onComplete={() =>
            qc.invalidateQueries({ queryKey: ["assets", seriesId] })
          }
        />
      )}
    </>
  );
}
