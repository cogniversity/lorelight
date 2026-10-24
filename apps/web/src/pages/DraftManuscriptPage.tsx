import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Clock,
  Eye,
  EyeOff,
  History,
  RotateCcw,
  Save,
} from "lucide-react";
import { draftApi } from "../api/client";

const AUTOSAVE_DELAY_MS = 4000;

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function DraftManuscriptPage() {
  const { seriesId = "" } = useParams<{ seriesId: string }>();
  const qc = useQueryClient();

  const [content, setContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "conflict">("saved");
  const revisionRef = useRef<number>(0);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: draft, isLoading } = useQuery({
    queryKey: ["draft-manuscript", seriesId],
    queryFn: () => draftApi.get(seriesId),
    enabled: !!seriesId,
  });

  const { data: revisions = [] } = useQuery({
    queryKey: ["draft-revisions", seriesId],
    queryFn: () => draftApi.revisions(seriesId),
    enabled: showHistory && !!seriesId,
  });

  // Populate editor when draft loads
  useEffect(() => {
    if (draft) {
      setContent(draft.content);
      revisionRef.current = draft.revisionNum;
      setDirty(false);
      setSaveStatus("saved");
    }
  }, [draft?.id]);

  const saveMutation = useMutation({
    mutationFn: ({ text, rev }: { text: string; rev: number }) =>
      draftApi.save(seriesId, text, rev),
    onSuccess: (updated) => {
      revisionRef.current = updated.revisionNum;
      setDirty(false);
      setSaveStatus("saved");
      qc.setQueryData(["draft-manuscript", seriesId], updated);
    },
    onError: (err: any) => {
      const isConflict = err?.response?.status === 409;
      setSaveStatus(isConflict ? "conflict" : "unsaved");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (revisionId: string) => draftApi.restore(seriesId, revisionId),
    onSuccess: (updated) => {
      setContent(updated.content);
      revisionRef.current = updated.revisionNum;
      setDirty(false);
      setSaveStatus("saved");
      qc.setQueryData(["draft-manuscript", seriesId], updated);
      qc.invalidateQueries({ queryKey: ["draft-revisions", seriesId] });
      setShowHistory(false);
    },
  });

  const triggerSave = useCallback(() => {
    if (!dirty) return;
    setSaveStatus("saving");
    saveMutation.mutate({ text: content, rev: revisionRef.current });
  }, [dirty, content, saveMutation]);

  // Autosave
  useEffect(() => {
    if (!dirty) return;
    setSaveStatus("unsaved");
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(triggerSave, AUTOSAVE_DELAY_MS);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [content, dirty, triggerSave]);

  // Navigate-away protection
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Keyboard save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        triggerSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [triggerSave]);

  function handleChange(val: string) {
    setContent(val);
    setDirty(true);
  }

  const statusLabel = {
    saved: "Saved",
    saving: "Saving…",
    unsaved: "Unsaved changes",
    conflict: "Conflict — reload and try again",
  }[saveStatus];

  const statusColor = {
    saved: "#6b7a5f",
    saving: "#a18353",
    unsaved: "#a18353",
    conflict: "#c0392b",
  }[saveStatus];

  if (isLoading) {
    return (
      <div className="page-intro">
        <div>
          <span className="eyebrow">DRAFT MANUSCRIPT</span>
          <h1>Loading…</h1>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "calc(100vh - 62px)", overflow: "hidden" }}>
      {/* Toolbar */}
      <div className="draft-toolbar">
        <div className="draft-toolbar-left">
          <BookOpen size={17} strokeWidth={1.8} style={{ color: "var(--gold)" }} />
          <span className="draft-title">Draft Manuscript</span>
          <span className="draft-wc">{wordCount(content).toLocaleString()} words</span>
        </div>
        <div className="draft-toolbar-right">
          <span style={{ fontSize: 10, color: statusColor, display: "flex", alignItems: "center", gap: 4 }}>
            {saveStatus === "saving" || saveStatus === "unsaved" ? (
              <Clock size={12} />
            ) : saveStatus === "conflict" ? (
              <span style={{ color: "#c0392b" }}>⚠</span>
            ) : null}
            {statusLabel}
          </span>
          <button className="draft-tool-btn" onClick={() => setShowHistory(!showHistory)} title="Revision history">
            <History size={16} />
          </button>
          <button className="draft-tool-btn" onClick={() => setShowPreview(!showPreview)} title="Toggle preview">
            {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            className="draft-save-btn"
            onClick={triggerSave}
            disabled={!dirty || saveStatus === "saving"}
          >
            <Save size={14} />
            Save
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Editor */}
        {!showPreview && (
          <textarea
            className="draft-editor"
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Start writing your story here in Markdown…

# Act One
## Scene: The Relay Room

Dust settles on the console. A forgotten amber light blinks once, then holds.

MARA crouches over the terminal, headset on, fingers moving carefully.

> "There you are."

---

Write freely. You can structure this into seasons, episodes, and scenes later using the AI assistant.`}
            spellCheck
          />
        )}

        {/* Preview */}
        {showPreview && (
          <div className="draft-preview">
            <PreviewRenderer content={content} />
          </div>
        )}

        {/* Revision history sidebar */}
        {showHistory && (
          <aside className="draft-history">
            <div className="draft-history-head">
              <History size={15} />
              Revision History
            </div>
            {revisions.length === 0 ? (
              <p style={{ padding: "12px 14px", color: "#999", fontSize: 11 }}>
                No revisions yet. Save to create the first snapshot.
              </p>
            ) : (
              revisions.map((rev) => (
                <div key={rev.id} className="draft-rev-item">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 11 }}>
                      Rev {rev.revisionNum}
                    </div>
                    <div style={{ fontSize: 10, color: "#999", margin: "2px 0" }}>
                      {formatRelative(rev.createdAt)} · {rev.authorName}
                    </div>
                    <div style={{ fontSize: 10, color: "#888", fontStyle: "italic" }}>
                      {rev.contentPreview}
                    </div>
                  </div>
                  <button
                    className="draft-restore-btn"
                    onClick={() => {
                      if (window.confirm(`Restore revision ${rev.revisionNum}? Current content will be saved as a new revision first.`)) {
                        restoreMutation.mutate(rev.id);
                      }
                    }}
                    title="Restore this revision"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              ))
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

// ── Simple Markdown-to-HTML preview ──────────────────────────────────────────

function PreviewRenderer({ content }: { content: string }) {
  const html = markdownToHtml(content);
  return (
    <div
      className="draft-preview-body"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function markdownToHtml(md: string): string {
  return md
    // Escape
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Headings
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold / italic
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    // Blockquote
    .replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>")
    // HR
    .replace(/^---$/gm, "<hr>")
    // Paragraphs
    .split(/\n\n+/)
    .map((block) => {
      if (/^<(h[1-6]|hr|blockquote)/.test(block.trim())) return block;
      return `<p>${block.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");
}
