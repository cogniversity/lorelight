import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  GalleryVerticalEnd,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { manuscriptApi, Episode } from "../api/client";
import { useSeriesContext } from "../layouts/SeriesLayout";
import { StatusPill } from "../components/StatusPill";
import { Progress } from "../components/Progress";
import { Skeleton } from "../components/Skeleton";

export default function EpisodesPage() {
  const { seriesId } = useSeriesContext();
  const navigate = useNavigate();

  const { data: manuscript, isLoading } = useQuery({
    queryKey: ["manuscript", seriesId],
    queryFn: () => manuscriptApi.get(seriesId),
    enabled: !!seriesId,
  });

  const episodes: Episode[] = manuscript?.seasons?.flatMap((s) => s.episodes) ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const current = selected
    ? episodes.find((e) => e.id === selected)
    : episodes[0] ?? null;

  if (!selected && episodes.length > 0 && !selected) {
    // default to first episode without state update
  }

  const scenes = current?.acts?.flatMap((a) => a.scenes) ?? [];
  const clips = scenes.flatMap((s) => s.clips ?? []);

  return (
    <>
      <section className="page-intro compact">
        <div>
          <span className="eyebrow">SEASON ONE</span>
          <h1>Episodes</h1>
          <p>From story arc to generation-ready clips.</p>
        </div>
        <button className="primary-button">
          <Plus size={17} />
          New episode
        </button>
      </section>

      <div className="episode-workspace">
        {/* Episode list */}
        <section className="panel episode-list">
          <div className="list-head">
            <span>{isLoading ? "…" : `${episodes.length} EPISODE${episodes.length !== 1 ? "S" : ""}`}</span>
            <button>
              <MoreHorizontal size={18} />
            </button>
          </div>
          {isLoading
            ? [1, 2, 3].map((i) => (
                <div key={i} style={{ padding: "14px 13px", borderBottom: "1px solid #ebe8e0" }}>
                  <Skeleton height={10} width="70%" style={{ marginBottom: 8 }} />
                  <Skeleton height={8} width="50%" />
                </div>
              ))
            : episodes.map((ep, idx) => (
                <button
                  key={ep.id}
                  className={
                    (selected ? ep.id === selected : idx === 0) ? "selected" : ""
                  }
                  onClick={() => setSelected(ep.id)}
                >
                  <span>{String(ep.episodeNumber || idx + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{ep.title}</strong>
                    <small>
                      {ep.acts?.flatMap((a) => a.scenes).length ?? 0} scenes ·{" "}
                      {ep.acts?.flatMap((a) => a.scenes).flatMap((s) => s.clips ?? []).length ?? 0} clips
                    </small>
                  </div>
                  <StatusPill status={ep.status} />
                </button>
              ))}
        </section>

        {/* Episode detail */}
        {current ? (
          <section className="panel episode-detail">
            <div className="episode-hero">
              <div>
                <span className="eyebrow">
                  EPISODE {String(current.episodeNumber || 1).padStart(2, "0")}
                </span>
                <h2>{current.title}</h2>
                {current.synopsis && <p>{current.synopsis}</p>}
              </div>
              <button className="dots-button">
                <MoreHorizontal size={19} />
              </button>
            </div>

            <div className="episode-facts">
              <div>
                <span>Status</span>
                <StatusPill status={current.status} />
              </div>
              <div>
                <span>Runtime</span>
                <strong>{current.runtime || "—"}</strong>
              </div>
              <div>
                <span>Scenes</span>
                <strong>{scenes.length}</strong>
              </div>
              <div>
                <span>Clips</span>
                <strong>{clips.length}</strong>
              </div>
            </div>

            <div className="episode-completion">
              <div>
                <span>Episode completion</span>
                <b>{current.progress || 0}%</b>
              </div>
              <Progress value={current.progress || 0} tone="sage" />
            </div>

            <div className="acts-head">
              <div>
                <span className="eyebrow">STRUCTURE</span>
                <h3>Acts &amp; scenes</h3>
              </div>
              <button className="outline-button">
                <Plus size={15} />
                Add scene
              </button>
            </div>

            {current.acts?.map((act) => (
              <div key={act.id}>
                <div className="act-row">
                  <ChevronDown size={16} />
                  <span className="act-index">
                    {String(act.actNumber).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{act.title}</strong>
                    <small>
                      {act.scenes.length} scene{act.scenes.length !== 1 ? "s" : ""} ·{" "}
                      {act.scenes.flatMap((s) => s.clips ?? []).length} clips
                    </small>
                  </div>
                  <MoreHorizontal size={17} />
                </div>
                {act.scenes.map((sc) => (
                  <button
                    key={sc.id}
                    className="data-row"
                    onClick={() => navigate(`/series/${seriesId}/reader/${current.id}/scenes/${sc.id}`)}
                    style={{ borderLeft: "none", borderRight: "none", borderRadius: 0 }}
                  >
                    <span className="entity-main">
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
                    <span />
                  </button>
                ))}
              </div>
            ))}

            <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
              <button
                className="outline-button"
                onClick={() => navigate(`/series/${seriesId}/reader/${current.id}`)}
              >
                <GalleryVerticalEnd size={15} />
                Open in reader
              </button>
            </div>
          </section>
        ) : (
          !isLoading && (
            <div className="panel" style={{ padding: 40, textAlign: "center" }}>
              <p style={{ color: "#999", fontSize: 10 }}>
                No episodes yet. Create your first episode to get started.
              </p>
            </div>
          )
        )}
      </div>
    </>
  );
}
