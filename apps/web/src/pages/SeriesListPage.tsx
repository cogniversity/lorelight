import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Aperture,
  Plus,
  ChevronRight,
  Film,
  Clapperboard,
  X,
  Check,
} from "lucide-react";
import { seriesApi, Series } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Skeleton } from "../components/Skeleton";

export default function SeriesListPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [premise, setPremise] = useState("");
  const [createError, setCreateError] = useState("");

  const { data: series = [], isLoading } = useQuery({
    queryKey: ["series"],
    queryFn: seriesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: ({ n, p }: { n: string; p: string }) => seriesApi.create(n, p),
    onSuccess: (created: Series) => {
      qc.invalidateQueries({ queryKey: ["series"] });
      setShowCreate(false);
      setName("");
      setPremise("");
      navigate(`/series/${created.id}/overview`);
    },
    onError: () => setCreateError("Failed to create series. Please try again."),
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!name.trim()) return;
    createMutation.mutate({ n: name.trim(), p: premise.trim() });
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="series-list-page">
      {/* Topbar */}
      <header className="series-list-header">
        <div className="brand" style={{ borderBottom: "none", padding: "0" }}>
          <div className="brand-mark">
            <Aperture size={21} strokeWidth={1.7} />
          </div>
          <div>
            <strong>Lorelight</strong>
            <span>STORY OS</span>
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 10, color: "#83847b" }}>
            {user?.name || user?.email}
          </span>
          <button className="outline-button" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="series-list-main">
        <section className="page-intro">
          <div>
            <span className="eyebrow">YOUR UNIVERSE</span>
            <h1>Story series</h1>
            <p>Choose a series to enter, or create a new one.</p>
          </div>
          <button className="primary-button" onClick={() => setShowCreate(true)}>
            <Plus size={17} />
            New series
          </button>
        </section>

        {isLoading ? (
          <div className="series-grid">
            {[1, 2, 3].map((i) => (
              <div className="series-card panel" key={i}>
                <Skeleton height={18} width="60%" style={{ marginBottom: 12 }} />
                <Skeleton height={10} width="80%" style={{ marginBottom: 6 }} />
                <Skeleton height={10} width="50%" />
              </div>
            ))}
          </div>
        ) : series.length === 0 ? (
          <div className="panel asset-empty">
            <div className="asset-stack">
              <Film size={31} />
            </div>
            <h2>No series yet</h2>
            <p>
              Create your first cinematic story series to get started with
              Lorelight.
            </p>
            <button className="primary-button" onClick={() => setShowCreate(true)}>
              <Plus size={16} />
              Create first series
            </button>
          </div>
        ) : (
          <div className="series-grid">
            {series.map((s) => (
              <button
                key={s.id}
                className="series-card panel"
                onClick={() => navigate(`/series/${s.id}/overview`)}
              >
                <div className="series-card-art">
                  {s.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="series-card-body">
                  <h2>{s.name}</h2>
                  {s.premise && <p>{s.premise}</p>}
                  <div className="series-card-meta">
                    {s.episodeCount != null && (
                      <span>
                        <Clapperboard size={12} />
                        {s.episodeCount} episodes
                      </span>
                    )}
                    {s.clipCount != null && (
                      <span>
                        <Film size={12} />
                        {s.clipCount} clips
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} className="series-card-arrow" />
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Create series modal */}
      {showCreate && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setShowCreate(false)}
        >
          <form
            className="modal"
            onSubmit={handleCreate}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">NEW PROJECT</span>
                <h2>Create series</h2>
              </div>
              <button type="button" onClick={() => setShowCreate(false)}>
                <X size={19} />
              </button>
            </div>

            <label>
              Series name
              <input
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Children of Glass"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 6,
                  height: 38,
                  border: "1px solid var(--line)",
                  borderRadius: 4,
                  padding: "0 11px",
                  fontSize: 10,
                }}
              />
            </label>

            <label style={{ display: "block", marginTop: 14 }}>
              One-line premise
              <textarea
                value={premise}
                onChange={(e) => setPremise(e.target.value)}
                placeholder="A city built on borrowed light…"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 6,
                  height: 80,
                  border: "1px solid var(--line)",
                  borderRadius: 4,
                  padding: "10px 11px",
                  fontSize: 10,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </label>

            {createError && (
              <p style={{ color: "#994f45", fontSize: 9, marginTop: 8 }}>
                {createError}
              </p>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="outline-button"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={createMutation.isPending}
              >
                <Check size={15} />
                {createMutation.isPending ? "Creating…" : "Create series"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
