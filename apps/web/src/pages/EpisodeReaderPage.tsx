import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Film } from "lucide-react";
import { manuscriptApi, Episode, Scene } from "../api/client";
import { useSeriesContext } from "../layouts/SeriesLayout";
import { StatusPill } from "../components/StatusPill";
import { Skeleton } from "../components/Skeleton";

export default function EpisodeReaderPage() {
  const { seriesId } = useSeriesContext();
  const { episodeId } = useParams<{ episodeId: string }>();
  const navigate = useNavigate();

  const { data: manuscript, isLoading } = useQuery({
    queryKey: ["manuscript", seriesId],
    queryFn: () => manuscriptApi.get(seriesId),
    enabled: !!seriesId,
  });

  const allEpisodes: Episode[] =
    manuscript?.seasons?.flatMap((s) => s.episodes) ?? [];
  const episode = allEpisodes.find((ep) => ep.id === episodeId);
  const scenes: Scene[] = episode?.acts?.flatMap((a) => a.scenes) ?? [];

  return (
    <>
      <div className="reader-breadcrumb">
        <button
          className="text-button"
          onClick={() => navigate(`/series/${seriesId}/reader`)}
        >
          <ChevronLeft size={14} />
          Manuscript
        </button>
        {episode && (
          <>
            <ChevronRight size={14} style={{ color: "#bbb" }} />
            <span style={{ fontSize: 10, color: "#777" }}>{episode.title}</span>
          </>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: 32 }}>
          <Skeleton height={28} width="50%" style={{ marginBottom: 16 }} />
          <Skeleton height={12} width="80%" style={{ marginBottom: 8 }} />
          <Skeleton height={12} width="70%" />
        </div>
      ) : episode ? (
        <>
          <section className="page-intro compact">
            <div>
              <span className="eyebrow">
                EPISODE {String(episode.episodeNumber || 1).padStart(2, "0")}
              </span>
              <h1>{episode.title}</h1>
              {episode.synopsis && <p>{episode.synopsis}</p>}
            </div>
            <StatusPill status={episode.status} />
          </section>

          <div className="panel" style={{ padding: "22px 26px" }}>
            <span className="eyebrow">SCENES</span>
            <h3 style={{ margin: "6px 0 16px" }}>
              {scenes.length} scene{scenes.length !== 1 ? "s" : ""}
            </h3>

            {scenes.map((sc) => (
              <button
                key={sc.id}
                className="data-row"
                style={{ borderRadius: 4, marginBottom: 4 }}
                onClick={() =>
                  navigate(
                    `/series/${seriesId}/reader/${episodeId}/scenes/${sc.id}`
                  )
                }
              >
                <span className="entity-main">
                  <i>
                    <Film size={17} />
                  </i>
                  <span>
                    <strong>
                      Scene {sc.sceneNumber} · {sc.title}
                    </strong>
                    <small>
                      {sc.location || ""}
                      {sc.timeOfDay ? ` · ${sc.timeOfDay}` : ""}
                    </small>
                  </span>
                </span>
                <span>
                  <StatusPill status={sc.status} />
                </span>
                <span style={{ fontSize: 8, color: "#999" }}>
                  {sc.clips?.length ?? 0} clips
                </span>
                <span className="row-actions">
                  <ChevronRight size={15} />
                </span>
              </button>
            ))}

            {scenes.length === 0 && (
              <p style={{ color: "#999", fontSize: 9 }}>
                No scenes in this episode yet.
              </p>
            )}
          </div>
        </>
      ) : (
        <div style={{ padding: 40, textAlign: "center", color: "#999" }}>
          <p>Episode not found.</p>
        </div>
      )}
    </>
  );
}
