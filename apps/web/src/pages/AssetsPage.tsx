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

  const handleUpload = async () => {
    setUploading(true);
    for (const file of files) {
      setProgress((p) => ({ ...p, [file.name]: "Getting URL…" }));
      try {
        // Step 1: get presigned URL
        const { uploadUrl, assetId } = await assetsApi.getUploadUrl(
          seriesId,
          file.name,
          file.type || "application/octet-stream",
          file.size
        );

        // Step 2: PUT directly to MinIO
        setProgress((p) => ({ ...p, [file.name]: "Uploading…" }));
        await assetsApi.uploadToPresigned(uploadUrl, file);

        // Step 3: complete
        setProgress((p) => ({ ...p, [file.name]: "Completing…" }));
        const assetType = file.type.startsWith("image/")
          ? "IMAGE"
          : file.type.startsWith("video/")
          ? "VIDEO"
          : file.type.startsWith("audio/")
          ? "AUDIO"
          : "DOCUMENT";
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

        <div className="modal-actions">
          <button className="outline-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary-button"
            disabled={!files.length || uploading}
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
function AssetCard({ asset }: { asset: Asset }) {
  return (
    <div className="asset-card panel">
      <div className="asset-card-preview">
        {asset.thumbnailUrl ? (
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
          {asset.fileSize && (
            <span style={{ fontSize: 8, color: "#999" }}>
              {formatBytes(asset.fileSize)}
            </span>
          )}
        </div>
        {asset.assetType && (
          <small className="asset-type">{asset.assetType}</small>
        )}
      </div>
      {asset.url && (
        <a
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          className="asset-download"
          title="Download"
          onClick={(e) => e.stopPropagation()}
        >
          <Download size={14} />
        </a>
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

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["assets", seriesId],
    queryFn: () => assetsApi.list(seriesId),
    enabled: !!seriesId,
  });

  const typeFilters = ["All", "IMAGE", "VIDEO", "AUDIO", "DOCUMENT"];

  const filtered =
    filter === "All"
      ? assets
      : assets.filter((a) => a.assetType?.toUpperCase() === filter);

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
            <AssetCard key={asset.id} asset={asset} />
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
