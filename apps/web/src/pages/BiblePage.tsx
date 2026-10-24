import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit3, Check, Archive, Sparkles, Plus } from "lucide-react";
import { bibleApi, BibleEntry } from "../api/client";
import { useSeriesContext } from "../layouts/SeriesLayout";
import { Skeleton } from "../components/Skeleton";

const DEFAULT_TABS = ["PREMISE", "THEMES", "CANON_RULES", "LORE", "TIMELINE"];
const tabLabel = (type: string) =>
  type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (letter: string) => letter.toUpperCase());

export default function BiblePage() {
  const { seriesId } = useSeriesContext();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("PREMISE");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["bible", seriesId],
    queryFn: () => bibleApi.list(seriesId),
    enabled: !!seriesId,
  });

  // Build a map from type → content
  const bibleMap: Record<string, string> = {};
  entries.forEach((e: BibleEntry) => {
    bibleMap[e.type] = e.content;
  });

  // Available tabs = DEFAULT_TABS + any extra types from API
  const extraTabs = entries
    .map((e) => e.type)
    .filter((t) => !DEFAULT_TABS.includes(t));
  const tabs = [...DEFAULT_TABS, ...extraTabs];

  const currentContent = bibleMap[activeTab] || "";

  useEffect(() => {
    setDraft(currentContent);
    setEditing(false);
  }, [activeTab, currentContent]);

  const saveMutation = useMutation({
    mutationFn: (content: string) => bibleApi.update(seriesId, activeTab, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bible", seriesId] });
      setEditing(false);
    },
  });

  const currentEntry = entries.find((e) => e.type === activeTab);

  return (
    <>
      <section className="page-intro compact">
        <div>
          <span className="eyebrow">FOUNDATION</span>
          <h1>Story Bible</h1>
          <p>The canonical source of truth for your story universe.</p>
        </div>
        <button className="primary-button" onClick={() => setEditing(true)}>
          <Edit3 size={16} />
          Edit {activeTab.toLowerCase()}
        </button>
      </section>

      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t}
            className={activeTab === t ? "active" : ""}
            onClick={() => setActiveTab(t)}
          >
            {tabLabel(t)}
          </button>
        ))}
      </div>

      <section className="bible-layout">
        <article className="panel document">
          <div className="document-meta">
            <span>
              {currentEntry?.updatedAt
                ? `UPDATED ${new Date(currentEntry.updatedAt).toLocaleDateString()}`
                : "AUTOSAVED"}
            </span>
            {!editing && (
              <button onClick={() => setEditing(true)}>
                <Edit3 size={16} />
              </button>
            )}
          </div>

          <h2>{activeTab}</h2>

          {isLoading ? (
            <>
              <Skeleton height={14} width="90%" style={{ marginBottom: 10 }} />
              <Skeleton height={12} width="80%" style={{ marginBottom: 8 }} />
              <Skeleton height={12} width="70%" style={{ marginBottom: 8 }} />
              <Skeleton height={12} width="85%" />
            </>
          ) : editing ? (
            <div className="bible-editor">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
                placeholder={`Write your ${activeTab.toLowerCase()} here…`}
              />
              <div>
                <button
                  className="outline-button"
                  onClick={() => {
                    setDraft(currentContent);
                    setEditing(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate(draft)}
                >
                  <Check size={15} />
                  {saveMutation.isPending ? "Saving…" : "Save entry"}
                </button>
              </div>
            </div>
          ) : currentContent ? (
            <div className="bible-content">
              {currentContent.split("\n").map((line, i) =>
                line ? (
                  <p className={i === 0 ? "lead" : ""} key={i}>
                    {line}
                  </p>
                ) : (
                  <br key={i} />
                )
              )}
            </div>
          ) : (
            <div className="empty-writing">
              <Sparkles size={26} />
              <strong>Continue building your world</strong>
              <span>Add a rich text entry for {activeTab.toLowerCase()}.</span>
              <button className="outline-button" onClick={() => setEditing(true)}>
                <Plus size={16} />
                Add entry
              </button>
            </div>
          )}
        </article>

        <aside className="panel references">
          <span className="eyebrow">CANON STATUS</span>
          <h3>Entry details</h3>
          <div className="reference-note">
            <Check size={17} />
            <div>
              <strong>Canonical</strong>
              <small>Available throughout the workspace</small>
            </div>
          </div>
          <div className="reference-note">
            <Archive size={17} />
            <div>
              <strong>API-persisted</strong>
              <small>Synced with the backend on every save</small>
            </div>
          </div>
          {currentEntry?.updatedAt && (
            <div className="reference-note">
              <Edit3 size={17} />
              <div>
                <strong>Last edited</strong>
                <small>{new Date(currentEntry.updatedAt).toLocaleString()}</small>
              </div>
            </div>
          )}
        </aside>
      </section>
    </>
  );
}
