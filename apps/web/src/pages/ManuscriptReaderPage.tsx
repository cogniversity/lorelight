import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Film,
  Clapperboard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { manuscriptApi, Season, Episode, Act, Scene, Clip } from "../api/client";
import { useSeriesContext } from "../layouts/SeriesLayout";
import { StatusPill } from "../components/StatusPill";
import { Skeleton } from "../components/Skeleton";

// ─── Status color dot ─────────────────────────────────────────────────────────
function statusColor(status: string): string {
  const s = status?.toLowerCase() ?? "";
  if (s === "final" || s === "approved") return "#6d876d";
  if (s === "review") return "#b18b51";
  if (s === "ready" || s === "production") return "#577275";
  if (s === "generated") return "#79677d";
  return "#96978f";
}

// ─── Clip card ────────────────────────────────────────────────────────────────
function ClipCard({
  clip,
  onOpen,
}: {
  clip: Clip;
  onOpen: () => void;
}) {
  return (
    <div className="clip-card">
      <div className="clip-card-header">
        <span className="clip-number">{clip.clipNumber}</span>
        <span
          className="clip-status-dot"
          style={{ background: statusColor(clip.status) }}
          title={clip.status}
        />
        <span className="clip-title">{clip.title}</span>
      </div>
      {(clip.action || clip.storyBeat) && (
        <p className="clip-beat">{clip.storyBeat || clip.action}</p>
      )}
      {clip.camera && (
        <p className="clip-camera">{clip.camera}</p>
      )}
      <div className="clip-card-footer">
        <StatusPill status={clip.status} />
        {clip.duration && <span className="clip-duration">{clip.duration}</span>}
        <button
          className="text-button"
          onClick={onOpen}
          style={{ marginLeft: "auto" }}
        >
          Open detail <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Script block renderer ────────────────────────────────────────────────────
function ScriptContent({
  scene,
  onOpenClip,
}: {
  scene: Scene;
  onOpenClip: (clip: Clip) => void;
}) {
  return (
    <section
      id={`reader-scene-${scene.id}`}
      className="manuscript-scene-content continuous-scene"
    >
      <div className="scene-heading">
        <small className="eyebrow">SCENE {scene.sceneNumber}</small>
        <h2 className="scene-title">{scene.title}</h2>
        {(scene.location || scene.timeOfDay) && (
          <p className="scene-slugline">
            {[scene.location, scene.timeOfDay].filter(Boolean).join(" · ")}
          </p>
        )}
        <StatusPill status={scene.status} />
      </div>

      <div className="script-body">
        {scene.scriptBlocks && scene.scriptBlocks.length > 0 ? (
          scene.scriptBlocks.map((block, i) => {
            switch (block.type) {
              case "heading":
                return (
                  <h3 key={i} className="script-heading">
                    {block.content}
                  </h3>
                );
              case "action":
                return (
                  <p key={i} className="script-action">
                    {block.content}
                  </p>
                );
              case "dialogue":
                return (
                  <div key={i} className="script-dialogue">
                    {block.character && (
                      <p className="script-character">{block.character}</p>
                    )}
                    <p className="script-line">{block.content}</p>
                  </div>
                );
              case "direction":
                return (
                  <p key={i} className="script-direction">
                    ({block.content})
                  </p>
                );
              case "transition":
                return (
                  <p key={i} className="script-transition">
                    {block.content}
                  </p>
                );
              default:
                return (
                  <p key={i} className="script-action">
                    {block.content}
                  </p>
                );
            }
          })
        ) : (
          <p className="script-action" style={{ color: "#999", fontStyle: "italic" }}>
            No script content yet for this scene.
          </p>
        )}
      </div>

      {/* Production markers stay visually secondary to the manuscript. */}
      {scene.clips && scene.clips.length > 0 && (
        <div className="reader-clip-markers" aria-label="Production clips">
          <div className="reader-clip-markers-label">
            <Film size={14} />
            <span className="eyebrow" style={{ margin: 0 }}>
              {scene.clips.length} CLIP{scene.clips.length !== 1 ? "S" : ""}
            </span>
          </div>
          <div className="reader-clip-marker-list">
            {scene.clips.map((clip) => (
              <button
                key={clip.id}
                className="reader-clip-marker"
                onClick={() => onOpenClip(clip)}
                title="Open production detail"
              >
                <span>{clip.clipNumber}</span>
                {clip.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Outline tree node ────────────────────────────────────────────────────────
function EpisodeNode({
  episode,
  selectedSceneId,
  onSelectScene,
}: {
  episode: Episode;
  selectedSceneId: string | null;
  onSelectScene: (scene: Scene, ep: Episode) => void;
}) {
  const [open, setOpen] = useState(true);
  const sceneCount = episode.acts?.flatMap((a) => a.scenes).length ?? 0;
  const clipCount =
    episode.acts?.flatMap((a) => a.scenes.flatMap((s) => s.clips ?? [])).length ?? 0;

  return (
    <div className="outline-episode">
      <button className="outline-ep-header" onClick={() => setOpen((v) => !v)}>
        <span className="outline-ep-toggle">
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        <div className="outline-ep-info">
          <strong>{episode.title}</strong>
          <small>
            {sceneCount} scenes · {clipCount} clips
          </small>
        </div>
        <span
          className="clip-status-dot"
          style={{ background: statusColor(episode.status), flexShrink: 0 }}
          title={episode.status}
        />
      </button>

      {open &&
        episode.acts?.map((act) => (
          <div key={act.id} className="outline-act">
            <div className="outline-act-label">{act.title}</div>
            {act.scenes.map((scene) => (
              <button
                key={scene.id}
                className={`outline-scene ${selectedSceneId === scene.id ? "active" : ""}`}
                onClick={() => onSelectScene(scene, episode)}
              >
                <Clapperboard size={12} />
                <span>
                  {scene.sceneNumber}. {scene.title}
                </span>
                <span
                  className="clip-status-dot"
                  style={{
                    background: statusColor(scene.status),
                    flexShrink: 0,
                    marginLeft: "auto",
                  }}
                />
                {scene.clips && scene.clips.length > 0 && (
                  <span className="outline-clip-count">{scene.clips.length}</span>
                )}
              </button>
            ))}
          </div>
        ))}
    </div>
  );
}

// ─── ManuscriptReaderPage ─────────────────────────────────────────────────────
export default function ManuscriptReaderPage() {
  const { seriesId } = useSeriesContext();
  const navigate = useNavigate();
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);

  const { data: manuscript, isLoading } = useQuery({
    queryKey: ["manuscript", seriesId],
    queryFn: () => manuscriptApi.get(seriesId),
    enabled: !!seriesId,
  });

  const allSeasons: Season[] = manuscript?.seasons ?? [];

  const sceneSummaries = allSeasons.flatMap((season) =>
    season.episodes.flatMap((episode) =>
      episode.acts.flatMap((act) => act.scenes)
    )
  );
  const sceneQueries = useQueries({
    queries: sceneSummaries.map((scene) => ({
      queryKey: ["scene", seriesId, scene.id],
      queryFn: () => manuscriptApi.getScene(seriesId, scene.id),
      enabled: !!seriesId,
      staleTime: 60_000,
    })),
  });
  const sceneDetails = new Map(
    sceneSummaries.map((scene, index) => [
      scene.id,
      sceneQueries[index]?.data ?? scene,
    ])
  );

  const handleSelectScene = (scene: Scene, ep: Episode) => {
    setSelectedScene(scene);
    void ep;
    document
      .getElementById(`reader-scene-${scene.id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Auto-select first scene
  const firstScene =
    selectedScene ??
    allSeasons[0]?.episodes?.[0]?.acts?.[0]?.scenes?.[0] ??
    null;

  return (
    <div className="reader-layout">
      {/* Left outline */}
      <aside className="reader-outline">
        <div className="reader-outline-head">
          <span className="eyebrow">MANUSCRIPT</span>
          <h3>Story outline</h3>
        </div>

        {isLoading ? (
          <div style={{ padding: "12px 8px" }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={32} style={{ marginBottom: 6 }} borderRadius={4} />
            ))}
          </div>
        ) : allSeasons.length === 0 ? (
          <div style={{ padding: "16px 8px", color: "#999", fontSize: 9 }}>
            No manuscript content yet.
          </div>
        ) : (
          allSeasons.map((season) =>
            season.episodes.map((ep) => (
              <EpisodeNode
                key={ep.id}
                episode={ep}
                selectedSceneId={selectedScene?.id ?? null}
                onSelectScene={handleSelectScene}
              />
            ))
          )
        )}
      </aside>

      {/* Continuous manuscript reading view */}
      <div className="reader-main">
        {isLoading ? (
          <div className="manuscript-scene-content">
            <Skeleton height={12} width="30%" style={{ marginBottom: 16 }} />
            <Skeleton height={28} width="60%" style={{ marginBottom: 20 }} />
            <Skeleton height={12} width="90%" style={{ marginBottom: 8 }} />
            <Skeleton height={12} width="80%" style={{ marginBottom: 8 }} />
            <Skeleton height={12} width="85%" style={{ marginBottom: 8 }} />
            <Skeleton height={12} width="70%" />
          </div>
        ) : firstScene ? (
          <div className="continuous-manuscript">
            {allSeasons.map((season) => (
              <section key={season.id} className="reader-season">
                <header className="reader-season-header">
                  <span className="eyebrow">
                    SEASON {String(season.seasonNumber).padStart(2, "0")}
                  </span>
                </header>
                {season.episodes.map((episode) => (
                  <article key={episode.id} className="reader-episode">
                    <header className="reader-episode-title">
                      <span className="eyebrow">
                        EPISODE {String(episode.episodeNumber).padStart(2, "0")}
                      </span>
                      <h1>{episode.title}</h1>
                      {episode.synopsis && <p>{episode.synopsis}</p>}
                    </header>
                    {episode.acts.map((act) => (
                      <section key={act.id} className="reader-act">
                        <header className="reader-act-title">
                          <div>
                            <span>ACT {act.actNumber}</span>
                            <h2>{act.title}</h2>
                          </div>
                        </header>
                        {act.scenes.map((scene) => (
                          <ScriptContent
                            key={scene.id}
                            scene={sceneDetails.get(scene.id) ?? scene}
                            onOpenClip={(clip) =>
                              navigate(`/series/${seriesId}/clips/${clip.id}`)
                            }
                          />
                        ))}
                      </section>
                    ))}
                  </article>
                ))}
              </section>
            ))}
          </div>
        ) : (
          <div style={{ padding: 48, textAlign: "center", color: "#999" }}>
            <p>Select a scene from the outline to begin reading.</p>
          </div>
        )}
      </div>
    </div>
  );
}
