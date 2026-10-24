import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Clapperboard,
  ChevronRight,
  Film,
  GalleryVerticalEnd,
  Sparkles,
  Zap,
  Archive,
  CircleUserRound,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { activityApi, manuscriptApi, Episode } from "../api/client";
import { useSeriesContext } from "../layouts/SeriesLayout";
import { StatusPill } from "../components/StatusPill";
import { Progress } from "../components/Progress";
import { Skeleton } from "../components/Skeleton";

function iconForTone(tone?: string) {
  switch (tone) {
    case "blue": return FileText;
    case "amber": return CircleUserRound;
    case "plum": return Archive;
    default: return Clapperboard;
  }
}

export default function OverviewPage() {
  const { seriesId, series } = useSeriesContext();
  const navigate = useNavigate();

  const { data: manuscript, isLoading: manuscriptLoading } = useQuery({
    queryKey: ["manuscript", seriesId],
    queryFn: () => manuscriptApi.get(seriesId),
    enabled: !!seriesId,
  });

  const { data: activity = [], isLoading: activityLoading } = useQuery({
    queryKey: ["activity", seriesId],
    queryFn: () => activityApi.list(seriesId),
    enabled: !!seriesId,
  });

  // Flatten structure
  const episodes: Episode[] = manuscript?.seasons?.flatMap((s) => s.episodes) ?? [];
  const scenes = episodes.flatMap((ep) => ep.acts?.flatMap((a) => a.scenes) ?? []);
  const clips = scenes.flatMap((sc) => sc.clips ?? []);
  const finalClips = clips.filter((c) => c.status === "Final" || c.status === "FINAL");
  const overallProgress =
    episodes.length > 0
      ? Math.round(
          episodes.reduce((sum, ep) => sum + (ep.progress || 0), 0) / episodes.length
        )
      : 0;

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const userName = series?.name ? `welcome back.` : "welcome back.";

  return (
    <>
      <section className="page-intro">
        <div>
          <span className="eyebrow">YOUR STORY UNIVERSE</span>
          <h1>
            {greeting}, {userName}
          </h1>
          <p>Your universe is taking shape. Here's where production stands today.</p>
        </div>
        <button
          className="outline-button"
          onClick={() => navigate(`/series/${seriesId}/bible`)}
        >
          <BookOpen size={17} />
          Open story bible
        </button>
      </section>

      {/* Metrics */}
      <section className="metric-grid">
        <article>
          <span className="metric-icon sand">
            <GalleryVerticalEnd size={19} />
          </span>
          <div>
            <p>Episodes</p>
            <strong>{manuscriptLoading ? <Skeleton height={23} width={40} /> : episodes.length}</strong>
            <small>
              <b>{episodes.filter((e) => e.status === "Production" || e.status === "PRODUCTION").length}</b>{" "}
              in production
            </small>
          </div>
        </article>
        <article>
          <span className="metric-icon blue">
            <Clapperboard size={19} />
          </span>
          <div>
            <p>Total scenes</p>
            <strong>{manuscriptLoading ? <Skeleton height={23} width={40} /> : scenes.length}</strong>
            <small>
              <b>{scenes.filter((s) => s.status === "Approved" || s.status === "APPROVED").length}</b> approved
            </small>
          </div>
        </article>
        <article>
          <span className="metric-icon plum">
            <Film size={19} />
          </span>
          <div>
            <p>Production clips</p>
            <strong>{manuscriptLoading ? <Skeleton height={23} width={40} /> : clips.length}</strong>
            <small>
              <b>{clips.filter((c) => c.status === "Ready" || c.status === "READY").length}</b> generation ready
            </small>
          </div>
        </article>
        <article>
          <span className="metric-icon sage">
            <Zap size={19} />
          </span>
          <div>
            <p>Final clips</p>
            <strong>{manuscriptLoading ? <Skeleton height={23} width={40} /> : finalClips.length}</strong>
            <small>
              <b>{clips.length ? Math.round((finalClips.length / clips.length) * 100) : 0}%</b>{" "}
              of total
            </small>
          </div>
        </article>
      </section>

      <div className="dashboard-grid">
        {/* Production pulse */}
        <section className="panel production-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">PRODUCTION PULSE</span>
              <h2>Series progress</h2>
            </div>
            <button
              className="text-button"
              onClick={() => navigate(`/series/${seriesId}/episodes`)}
            >
              View episodes <ChevronRight size={15} />
            </button>
          </div>
          <div className="overall-progress">
            <div>
              <span>Overall completion</span>
              <strong>{overallProgress}%</strong>
            </div>
            <Progress value={overallProgress} />
          </div>
          <div className="episode-progress-list">
            {manuscriptLoading
              ? [1, 2, 3].map((i) => (
                  <div key={i} style={{ padding: "10px 3px", borderBottom: "1px solid #ebe8e0" }}>
                    <Skeleton height={10} width="60%" style={{ marginBottom: 8 }} />
                    <Skeleton height={4} />
                  </div>
                ))
              : episodes.slice(0, 6).map((ep, index) => (
                  <button
                    key={ep.id}
                    onClick={() => navigate(`/series/${seriesId}/reader/${ep.id}`)}
                  >
                    <span className="ep-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="ep-info">
                      <div>
                        <strong>{ep.title}</strong>
                        <StatusPill status={ep.status} />
                      </div>
                      <Progress
                        value={ep.progress || 0}
                        tone={(ep.progress || 0) > 50 ? "sage" : "gold"}
                      />
                    </div>
                    <b>{ep.progress || 0}%</b>
                    <ChevronRight size={16} />
                  </button>
                ))}
          </div>
        </section>

        {/* Activity */}
        <aside className="panel activity-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">TEAM</span>
              <h2>Recent activity</h2>
            </div>
          </div>
          <div className="activity-list">
            {activityLoading
              ? [1, 2, 3].map((i) => (
                  <div className="activity" key={i}>
                    <Skeleton width={29} height={29} borderRadius="50%" />
                    <div style={{ flex: 1 }}>
                      <Skeleton height={9} width="80%" style={{ marginBottom: 5 }} />
                      <Skeleton height={8} width="50%" />
                    </div>
                  </div>
                ))
              : activity.slice(0, 6).map((item) => {
                  const Icon = iconForTone(item.tone);
                  return (
                    <div className="activity" key={item.id}>
                      <span className={`activity-icon ${item.tone || "sage"}`}>
                        <Icon size={16} />
                      </span>
                      <div>
                        <strong>{item.text}</strong>
                        <small>{item.meta}</small>
                      </div>
                    </div>
                  );
                })}
            {!activityLoading && activity.length === 0 && (
              <div className="search-empty" style={{ padding: "20px 0", fontSize: 9 }}>
                No recent activity
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Continue creating */}
      <section className="panel continue-panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">QUICK ACCESS</span>
            <h2>Continue creating</h2>
          </div>
        </div>
        <div className="continue-cards">
          <button onClick={() => navigate(`/series/${seriesId}/reader`)}>
            <span className="continue-icon">
              <Clapperboard size={20} />
            </span>
            <div>
              <small>MANUSCRIPT</small>
              <strong>Manuscript Reader</strong>
              <p>Navigate seasons, episodes, scenes, and clips.</p>
            </div>
            <ChevronRight size={18} />
          </button>
          <button onClick={() => navigate(`/series/${seriesId}/characters`)}>
            <span className="continue-icon">
              <CircleUserRound size={20} />
            </span>
            <div>
              <small>WORLD</small>
              <strong>Characters</strong>
              <p>The cast who shape your story.</p>
            </div>
            <ChevronRight size={18} />
          </button>
          <button onClick={() => navigate(`/series/${seriesId}/bible`)}>
            <span className="continue-icon">
              <Sparkles size={20} />
            </span>
            <div>
              <small>CANON</small>
              <strong>Story Bible</strong>
              <p>Premise, themes, lore, and canon rules.</p>
            </div>
            <ChevronRight size={18} />
          </button>
        </div>
      </section>
    </>
  );
}
