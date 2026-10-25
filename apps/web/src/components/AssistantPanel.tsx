/**
 * Floating AI assistant panel — series-scoped, proposal-based.
 *
 * Safety contract (enforced server-side; mirrored here for UX clarity):
 *   - Never executes writes directly. All changes go through explicit Approve.
 *   - Clears conversation when the series changes.
 *   - Provides per-proposal Approve / Reject controls.
 *   - Clearly labels applied, stale, failed, and rejected proposals.
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  KeyboardEvent,
} from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Loader,
  MessageSquare,
  Minus,
  Plus,
  Send,
  X,
} from "lucide-react";
import {
  assistantApi,
  ChatMessage,
  ChangeProposal,
  RouteContext,
} from "../api/client";

// ── Prop ──────────────────────────────────────────────────────────────────────

interface Props {
  seriesId: string;
  seriesName: string;
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending your review",
  APPROVED: "Approved",
  APPLIED: "Applied ✓",
  REJECTED: "Rejected",
  STALE: "Stale",
  FAILED: "Failed",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#a18353",
  APPROVED: "#5a7d59",
  APPLIED: "#3d6b3b",
  REJECTED: "#888",
  STALE: "#888",
  FAILED: "#c0392b",
};

// ── Proposal card ─────────────────────────────────────────────────────────────

function ProposalCard({
  proposal,
  seriesId,
  onApproved,
  onRejected,
}: {
  proposal: ChangeProposal;
  seriesId: string;
  onApproved: (p: ChangeProposal) => void;
  onRejected: (p: ChangeProposal) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const approveMutation = useMutation({
    mutationFn: () => assistantApi.approveProposal(seriesId, proposal.id),
    onSuccess: (res) => onApproved(res.proposal),
  });
  const rejectMutation = useMutation({
    mutationFn: () => assistantApi.rejectProposal(seriesId, proposal.id),
    onSuccess: (res) => onRejected(res.proposal),
  });

  const isPending = proposal.status === "PENDING";
  const busy = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="ap-proposal" style={{ borderLeftColor: STATUS_COLOR[proposal.status] }}>
      <div className="ap-proposal-header">
        <span className="ap-proposal-cmd">{proposal.commandType}</span>
        <span
          className="ap-proposal-status"
          style={{ color: STATUS_COLOR[proposal.status] }}
        >
          {STATUS_LABEL[proposal.status] ?? proposal.status}
        </span>
        <button
          className="ap-icon-btn"
          onClick={() => setExpanded((v) => !v)}
          title="Toggle details"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>
      <p className="ap-proposal-desc">{proposal.humanReadable}</p>

      {expanded && (
        <pre className="ap-proposal-payload">
          {JSON.stringify(proposal.payload, null, 2)}
        </pre>
      )}

      {proposal.validationErrors && (
        <p className="ap-proposal-error">{proposal.validationErrors}</p>
      )}

      {isPending && (
        <div className="ap-proposal-actions">
          <button
            className="ap-approve-btn"
            onClick={() => approveMutation.mutate()}
            disabled={busy}
          >
            {approveMutation.isPending ? (
              <Loader size={13} className="ap-spin" />
            ) : (
              <Check size={13} />
            )}
            Apply
          </button>
          <button
            className="ap-reject-btn"
            onClick={() => rejectMutation.mutate()}
            disabled={busy}
          >
            <X size={13} />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  seriesId,
  onProposalUpdate,
}: {
  message: ChatMessage;
  seriesId: string;
  onProposalUpdate: (updated: ChangeProposal) => void;
}) {
  const isUser = message.role === "USER";

  return (
    <div className={`ap-message ${isUser ? "ap-message-user" : "ap-message-ai"}`}>
      <div className="ap-message-bubble">
        <p>{message.content}</p>
      </div>
      {!isUser &&
        (message.proposals ?? []).map((p) => (
          <ProposalCard
            key={p.id}
            proposal={p}
            seriesId={seriesId}
            onApproved={onProposalUpdate}
            onRejected={onProposalUpdate}
          />
        ))}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function AssistantPanel({ seriesId, seriesName }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();
  const location = useLocation();
  const prevSeriesId = useRef<string>("");

  // Derive route context from current URL
  function getRouteContext(): RouteContext {
    const parts = location.pathname.split("/");
    const ctx: RouteContext = { page: parts[parts.length - 1] };
    const idx = (seg: string) => parts.indexOf(seg);
    if (idx("episodes") !== -1) ctx.episodeId = parts[idx("episodes") + 1];
    if (idx("scenes") !== -1) ctx.sceneId = parts[idx("scenes") + 1];
    if (idx("clips") !== -1) ctx.clipId = parts[idx("clips") + 1];
    if (idx("reader") !== -1) {
      const afterReader = parts[idx("reader") + 1];
      if (afterReader && !/^[a-z]+$/.test(afterReader)) ctx.episodeId = afterReader;
    }
    return ctx;
  }

  // Reset when series changes
  useEffect(() => {
    if (prevSeriesId.current && prevSeriesId.current !== seriesId) {
      setMessages([]);
      setThreadId(null);
      setInput("");
    }
    prevSeriesId.current = seriesId;
  }, [seriesId]);

  // Load thread once
  const { data: thread } = useQuery({
    queryKey: ["assistant-thread", seriesId],
    queryFn: () => assistantApi.getOrCreateThread(seriesId),
    enabled: !!seriesId && open,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (thread && thread.id !== threadId) {
      setThreadId(thread.id);
    }
  }, [thread?.id]);

  // Load messages when thread is available
  const { data: loadedMessages } = useQuery({
    queryKey: ["assistant-messages", seriesId, threadId],
    queryFn: () => assistantApi.getMessages(seriesId, threadId!),
    enabled: !!seriesId && !!threadId && open,
  });

  useEffect(() => {
    if (loadedMessages) setMessages(loadedMessages);
  }, [loadedMessages]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !threadId || sending) return;

    const routeCtx = getRouteContext();
    setInput("");
    setSending(true);

    // Optimistic user message
    const optimistic: ChatMessage = {
      id: `opt-${Date.now()}`,
      threadId,
      seriesId,
      role: "USER",
      content: text,
      proposals: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await assistantApi.sendMessage(seriesId, threadId, text, routeCtx);
      // Replace optimistic + add AI response
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        { ...optimistic, id: res.message.id },
        res.message,
      ]);
      qc.invalidateQueries({ queryKey: ["assistant-messages", seriesId, threadId] });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }, [input, threadId, seriesId, sending, location.pathname]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleProposalUpdate(updated: ChangeProposal) {
    setMessages((prev) =>
      prev.map((m) => ({
        ...m,
        proposals: (m.proposals ?? []).map((p) =>
          p.id === updated.id ? updated : p,
        ),
      })),
    );
    // Invalidate manuscript / structure queries so UI reflects applied changes
    qc.invalidateQueries({ queryKey: ["manuscript", seriesId] });
    qc.invalidateQueries({ queryKey: ["draft-manuscript", seriesId] });
    qc.invalidateQueries({ queryKey: ["series-overview", seriesId] });
  }

  async function startNewThread() {
    const t = await assistantApi.newThread(seriesId);
    setThreadId(t.id);
    setMessages([]);
    qc.setQueryData(["assistant-thread", seriesId], t);
    qc.invalidateQueries({ queryKey: ["assistant-messages", seriesId, t.id] });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating launcher */}
      <button
        className={`ap-launcher ${open ? "ap-launcher-active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open AI assistant"
        title="Lorelight AI Assistant"
      >
        {open ? <Minus size={22} /> : <Bot size={22} />}
      </button>

      {/* Panel */}
      {open && (
        <div className="ap-panel">
          {/* Header */}
          <div className="ap-header">
            <Bot size={16} />
            <div className="ap-header-info">
              <strong>Lorelight Assistant</strong>
              <span className="ap-series-name">{seriesName}</span>
            </div>
            <button
              className="ap-icon-btn"
              onClick={startNewThread}
              title="New conversation"
            >
              <Plus size={15} />
            </button>
            <button
              className="ap-icon-btn"
              onClick={() => setOpen(false)}
              title="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* Context pill */}
          <div className="ap-context-bar">
            <MessageSquare size={11} />
            <span>
              {location.pathname.includes("/reader")
                ? "Reader"
                : location.pathname.includes("/draft")
                ? "Draft Manuscript"
                : location.pathname.includes("/episodes")
                ? "Episodes"
                : "Overview"}
            </span>
            <span className="ap-context-dot" />
            <span>{seriesName}</span>
          </div>

          {/* Messages */}
          <div className="ap-messages">
            {messages.length === 0 && !sending && (
              <div className="ap-empty">
                <Bot size={28} strokeWidth={1.3} />
                <p>Ask me to help build your story.</p>
                <ul>
                  <li>"Create a new scene in Act II where Mara confronts the Council"</li>
                  <li>"Add a dialogue block between Cael and his sister"</li>
                  <li>"Draft the premise for Season 2"</li>
                </ul>
                <p className="ap-empty-note">
                  All suggestions need your explicit approval before any changes are saved.
                </p>
              </div>
            )}

            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                seriesId={seriesId}
                onProposalUpdate={handleProposalUpdate}
              />
            ))}

            {sending && (
              <div className="ap-message ap-message-ai">
                <div className="ap-message-bubble ap-thinking">
                  <Loader size={14} className="ap-spin" />
                  <span>Thinking…</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="ap-input-row">
            <textarea
              ref={textareaRef}
              className="ap-input"
              rows={2}
              placeholder="Ask anything about your story… (Enter to send, Shift+Enter for new line)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending || !threadId}
            />
            <button
              className="ap-send-btn"
              onClick={sendMessage}
              disabled={!input.trim() || sending || !threadId}
              title="Send"
            >
              {sending ? <Loader size={16} className="ap-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="ap-disclaimer">
            All proposals require your approval before any changes are saved.
          </p>
        </div>
      )}
    </>
  );
}
