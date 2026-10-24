import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Film } from "lucide-react";
import { manuscriptApi, Scene } from "../api/client";
import { useSeriesContext } from "../layouts/SeriesLayout";
import { StatusPill } from "../components/StatusPill";
import { Skeleton } from "../components/Skeleton";

export default function SceneDetailPage() {
  const { seriesId } = useSeriesContext();
  const { sceneId } = useParams<{ sceneId: string }>();
  const navigate = useNavigate();

  const { data: manuscript, isLoading } = useQuery({
    queryKey: ["manuscript", seriesId],
    queryFn: () => manuscriptApi.get(seriesId),
    enabled: !!seriesId,
  });

  // Find scene across all seasons/episodes/acts
  let foundScene: Scene | null = null;
  let foundEpisodeId: string | null = null;

  for (const season of manuscript?.seasons ?? []) {
    for (const ep of season.episodes) {
      for (const act of ep.acts ?? []) {
        const sc = act.scenes.find((s) => s.id === sceneId);
        if (sc) {
          foundScene = sc;
          foundEpisodeId = ep.id;
          break;
        }
      }
      if (foundScene) break;
    }
    if (foundScene) break;
  }

  return (
    <>
      <div className="reader-breadcrumb">
        <button
          className="text-button"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={14} />
          Back
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: 32 }}>
          <Skeleton height={28} width="50%" style={{ marginBottom: 16 }} />
          <Skeleton height={12} width="80%" style={{ marginBottom: 8 }} />
          <Skeleton height={12} width="70%" />
        </div>
      ) : foundScene ? (
        <>
          <section className="page-intro compact">
            <div>
              <span className="eyebrow">SCENE {foundScene.sceneNumber}</span>
              <h1>{foundScene.title}</h1>
              {(foundScene.location || foundScene.timeOfDay) && (
                <p style={{ color: "#83847b", fontSize: 11, margin: 0 }}>
                  {[foundScene.location, foundScene.timeOfDay].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <StatusPill status={foundScene.status} />
          </section>

          {foundScene.clips && foundScene.clips.length > 0 && (
            <div className="panel" style={{ padding: "22px 26px", marginTop: 18 }}>
              <span className="eyebrow">CLIPS IN THIS SCENE</span>
              <h3 style={{ margin: "6px 0 16px" }}>
                {foundScene.clips.length} clip{foundScene.clips.length !== 1 ? "s" : ""}
              </h3>
              {foundScene.clips.map((clip) => (
                <button
                  key={clip.id}
                  className="data-row"
                  style={{ borderRadius: 4, marginBottom: 4 }}
                  onClick={() => navigate(`/series/${seriesId}/clips/${clip.id}`)}
                >
                  <span className="entity-main">
                    <i>
                      <Film size={17} />
                    </i>
                    <span>
                      <strong>
                        {clip.clipNumber} · {clip.title}
                      </strong>
                      <small>{clip.storyBeat || clip.action || "—"}</small>
                    </span>
                  </span>
                  <span>
                    <StatusPill status={clip.status} />
                  </span>
                  <span style={{ fontSize: 8, color: "#999" }}>
                    {clip.duration || "—"}
                  </span>
                  <span className="row-actions">
                    <ChevronRight size={15} />
                  </span>
                </button>
              ))}
            </div>
          )}

          {foundEpisodeId && (
            <div style={{ marginTop: 16 }}>
              <Link
                to={`/series/${seriesId}/reader/${foundEpisodeId}/scenes/${foundScene.id}`}
                className="outline-button"
                style={{ textDecoration: "none", display: "inline-flex" }}
              >
                Open in Manuscript Reader
                <ChevronRight size={15} />
              </Link>
            </div>
          )}
        </>
      ) : (
        <div style={{ padding: 40, textAlign: "center", color: "#999" }}>
          <p>Scene not found.</p>
        </div>
      )}
    </>
  );
}
