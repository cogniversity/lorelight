import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Film } from "lucide-react";
import { manuscriptApi, Scene, Clip } from "../api/client";
import { useSeriesContext } from "../layouts/SeriesLayout";
import { StatusPill } from "../components/StatusPill";
import { Skeleton } from "../components/Skeleton";

export default function SceneReaderPage() {
  const { seriesId } = useSeriesContext();
  const { episodeId, sceneId } = useParams<{ episodeId: string; sceneId: string }>();
  const navigate = useNavigate();

  const { data: manuscript, isLoading } = useQuery({
    queryKey: ["manuscript", seriesId],
    queryFn: () => manuscriptApi.get(seriesId),
    enabled: !!seriesId,
  });

  const allScenes: Scene[] =
    manuscript?.seasons
      ?.flatMap((s) => s.episodes)
      .flatMap((ep) => ep.acts)
      .flatMap((act) => act.scenes) ?? [];

  const scene = allScenes.find((sc) => sc.id === sceneId);
  const clips: Clip[] = scene?.clips ?? [];

  return (
    <>
      <div className="reader-breadcrumb">
        <button
          className="text-button"
          onClick={() => navigate(`/series/${seriesId}/reader/${episodeId}`)}
        >
          <ChevronLeft size={14} />
          Episode
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: 32 }}>
          <Skeleton height={28} width="50%" style={{ marginBottom: 16 }} />
          <Skeleton height={12} width="80%" style={{ marginBottom: 8 }} />
          <Skeleton height={12} width="70%" />
        </div>
      ) : scene ? (
        <>
          <section className="page-intro compact">
            <div>
              <span className="eyebrow">
                SCENE {String(scene.sceneNumber).padStart(2, "0")}
                {scene.location ? ` · ${scene.location}` : ""}
                {scene.timeOfDay ? ` · ${scene.timeOfDay}` : ""}
              </span>
              <h1>{scene.title}</h1>
            </div>
            <StatusPill status={scene.status} />
          </section>

          {/* Script blocks */}
          {scene.scriptBlocks && scene.scriptBlocks.length > 0 && (
            <div className="panel" style={{ padding: "22px 26px", marginBottom: 14 }}>
              <span className="eyebrow">SCRIPT</span>
              <div className="reader-script" style={{ marginTop: 14 }}>
                {scene.scriptBlocks.map((block, i) => {
                  switch (block.type) {
                    case "heading":
                      return <h3 key={i} className="script-heading">{block.content}</h3>;
                    case "action":
                      return <p key={i} className="script-action">{block.content}</p>;
                    case "dialogue":
                      return (
                        <div key={i} className="script-dialogue">
                          {block.character && (
                            <span className="script-character">{block.character}</span>
                          )}
                          <p>{block.content}</p>
                        </div>
                      );
                    case "direction":
                      return <p key={i} className="script-parenthetical">({block.content})</p>;
                    case "transition":
                      return <p key={i} className="script-transition">{block.content}</p>;
                    default:
                      return <p key={i} className="script-action">{block.content}</p>;
                  }
                })}
              </div>
            </div>
          )}

          {/* Clips */}
          <div className="panel" style={{ padding: "22px 26px" }}>
            <span className="eyebrow">CLIPS</span>
            <h3 style={{ margin: "6px 0 16px" }}>
              {clips.length} clip{clips.length !== 1 ? "s" : ""}
            </h3>
            {clips.map((clip) => (
              <button
                key={clip.id}
                className="data-row"
                style={{ borderRadius: 4, marginBottom: 4 }}
                onClick={() => navigate(`/series/${seriesId}/clips/${clip.id}`)}
              >
                <span className="entity-main">
                  <i><Film size={17} /></i>
                  <span>
                    <strong>{clip.clipNumber} · {clip.title}</strong>
                    <small>{clip.storyBeat || clip.action || ""}</small>
                  </span>
                </span>
                <span><StatusPill status={clip.status} /></span>
                <span style={{ fontSize: 8, color: "#999" }}>{clip.duration}</span>
              </button>
            ))}
            {clips.length === 0 && (
              <p style={{ color: "#999", fontSize: 9 }}>No clips in this scene yet.</p>
            )}
          </div>
        </>
      ) : (
        <div style={{ padding: 40, textAlign: "center", color: "#999" }}>
          <p>Scene not found.</p>
        </div>
      )}
    </>
  );
}
