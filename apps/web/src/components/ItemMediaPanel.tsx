import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronUp, Film, Music, Star, Upload } from "lucide-react";
import { assetsApi, manuscriptApi } from "../api/client";

type TargetKind = "act" | "scene" | "clip";

interface Props {
  seriesId: string;
  targetKind: TargetKind;
  targetId: string;
  title: string;
  currentTags?: string[];
  initiallyOpen?: boolean;
}

const parseTags = (value: string) =>
  [...new Set(value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))];

export default function ItemMediaPanel({
  seriesId,
  targetKind,
  targetId,
  title,
  currentTags = [],
  initiallyOpen = false,
}: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(initiallyOpen);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [assetTags, setAssetTags] = useState("");
  const [itemTags, setItemTags] = useState(currentTags.join(", "));
  const [isFinal, setIsFinal] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => setItemTags(currentTags.join(", ")), [currentTags.join("|")]);

  const { data: allAssets = [] } = useQuery({
    queryKey: ["assets", seriesId],
    queryFn: () => assetsApi.list(seriesId),
    enabled: open,
  });

  const assets = useMemo(
    () =>
      allAssets.filter((asset) => {
        if (targetKind === "act") return asset.actIds?.includes(targetId);
        if (targetKind === "scene") return asset.sceneIds?.includes(targetId);
        return asset.clipIds?.includes(targetId);
      }),
    [allAssets, targetId, targetKind],
  );

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a video or audio file first.");
      const type = file.type.startsWith("audio/") ? "AUDIO" : "VIDEO";
      const initiated = await assetsApi.initiateUpload(seriesId, {
        filename: file.name,
        mimeType: file.type || (type === "AUDIO" ? "audio/mpeg" : "video/mp4"),
        sizeBytes: file.size,
        type,
        title: `${title} — ${file.name}`,
        description: notes || undefined,
        versionNotes: notes || undefined,
        tags: parseTags(assetTags),
        isFinal,
        ...(targetKind === "act" && { linkedActId: targetId }),
        ...(targetKind === "scene" && { linkedSceneId: targetId }),
        ...(targetKind === "clip" && { linkedClipId: targetId }),
      });
      await assetsApi.uploadToPresigned(initiated.uploadUrl, file);
      return assetsApi.completeUpload(seriesId, initiated.assetId);
    },
    onSuccess: async () => {
      setFile(null);
      setNotes("");
      setAssetTags("");
      setIsFinal(false);
      setMessage("Media version uploaded");
      await qc.invalidateQueries({ queryKey: ["assets", seriesId] });
    },
    onError: (error: any) =>
      setMessage(error?.response?.data?.message ?? error?.message ?? "Upload failed"),
  });

  const tagsMutation = useMutation({
    mutationFn: async () => {
      const tags = parseTags(itemTags);
      if (targetKind === "act") return manuscriptApi.updateAct(seriesId, targetId, { tags });
      if (targetKind === "scene") return manuscriptApi.updateScene(seriesId, targetId, { tags });
      return manuscriptApi.updateClip(seriesId, targetId, { tags });
    },
    onSuccess: async () => {
      setMessage("Item tags saved");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["manuscript", seriesId] }),
        qc.invalidateQueries({ queryKey: [targetKind, seriesId, targetId] }),
      ]);
    },
  });

  const markFinal = async (assetId: string) => {
    await assetsApi.update(seriesId, assetId, { isFinal: true });
    setMessage("Final version selected");
    await qc.invalidateQueries({ queryKey: ["assets", seriesId] });
  };

  return (
    <section className="item-media-panel">
      <button className="item-media-toggle" onClick={() => setOpen((value) => !value)}>
        <Film size={14} />
        <span>Media &amp; tags</span>
        <small>
          {assets.length || ""} {assets.length === 1 ? "asset" : assets.length > 1 ? "assets" : ""}
        </small>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="item-media-body">
          <div className="item-tags-editor">
            <label>
              Item tags
              <input
                value={itemTags}
                onChange={(event) => setItemTags(event.target.value)}
                placeholder="night, council, confrontation"
              />
            </label>
            <button onClick={() => tagsMutation.mutate()} disabled={tagsMutation.isPending}>
              <Check size={13} />
              Save tags
            </button>
          </div>

          {assets.length > 0 && (
            <div className="item-media-list">
              {assets.map((asset) => (
                <article className={`item-media-card ${asset.isFinal ? "final" : ""}`} key={asset.id}>
                  {asset.mimeType?.startsWith("video/") ? (
                    <video controls preload="metadata" src={asset.downloadUrl ?? asset.url} />
                  ) : (
                    <div className="item-audio-player">
                      <Music size={17} />
                      <audio controls preload="metadata" src={asset.downloadUrl ?? asset.url} />
                    </div>
                  )}
                  <div className="item-media-meta">
                    <strong>{asset.title}</strong>
                    <span>{asset.isFinal ? "FINAL" : "DRAFT"}</span>
                    {asset.versionNotes && <p>{asset.versionNotes}</p>}
                    {!!asset.tags?.length && (
                      <div>{asset.tags.map((tag) => <i key={tag}>{tag}</i>)}</div>
                    )}
                    {!asset.isFinal && (
                      <button onClick={() => markFinal(asset.id)}>
                        <Star size={12} />
                        Set as final
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="item-media-upload">
            <label className="item-media-file">
              <Upload size={16} />
              <span>{file?.name ?? "Choose video or audio"}</span>
              <input
                type="file"
                accept="video/*,audio/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional version notes"
            />
            <input
              value={assetTags}
              onChange={(event) => setAssetTags(event.target.value)}
              placeholder="Asset tags, comma separated"
            />
            <label className="item-media-final">
              <input
                type="checkbox"
                checked={isFinal}
                onChange={(event) => setIsFinal(event.target.checked)}
              />
              Mark this version as final
            </label>
            <button
              className="primary-button"
              disabled={!file || uploadMutation.isPending}
              onClick={() => uploadMutation.mutate()}
            >
              <Upload size={14} />
              {uploadMutation.isPending ? "Uploading…" : "Upload version"}
            </button>
          </div>
          {message && <p className="item-media-message">{message}</p>}
        </div>
      )}
    </section>
  );
}
