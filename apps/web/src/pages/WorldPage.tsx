import { FormEvent, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  ChevronRight,
  X,
  Check,
  Trash2,
  Boxes,
  Clock3,
  Compass,
  MapPin,
  UsersRound,
} from "lucide-react";
import { worldApi, WorldEntity } from "../api/client";
import { useSeriesContext } from "../layouts/SeriesLayout";
import { StatusPill } from "../components/StatusPill";
import { SkeletonRow } from "../components/Skeleton";

type EntityType =
  | "CHARACTER"
  | "LOCATION"
  | "ARTIFACT"
  | "ORGANIZATION"
  | "TIMELINE_EVENT";

interface Props {
  entityType: EntityType;
}

const TYPE_META: Record<
  EntityType,
  { label: string; singular: string; eyebrow: string; statuses: string[] }
> = {
  CHARACTER: {
    label: "Characters",
    singular: "character",
    eyebrow: "CAST & RELATIONSHIPS",
    statuses: ["ACTIVE", "UNKNOWN", "DECEASED"],
  },
  LOCATION: {
    label: "Locations",
    singular: "location",
    eyebrow: "WORLD & VIRTUAL SETS",
    statuses: ["ACTIVE", "RESTRICTED", "DESTROYED"],
  },
  ARTIFACT: {
    label: "Artifacts",
    singular: "artifact",
    eyebrow: "OBJECTS OF POWER",
    statuses: ["ACTIVE", "MISSING", "DESTROYED"],
  },
  ORGANIZATION: {
    label: "Organizations",
    singular: "organization",
    eyebrow: "FACTIONS & INSTITUTIONS",
    statuses: ["ACTIVE", "DISBANDED", "UNKNOWN"],
  },
  TIMELINE_EVENT: {
    label: "Timeline",
    singular: "event",
    eyebrow: "CANONICAL CHRONOLOGY",
    statuses: ["DRAFT", "CANON"],
  },
};

function EntityIcon({ kind }: { kind: EntityType }) {
  switch (kind) {
    case "CHARACTER":
      return <UsersRound size={17} />;
    case "LOCATION":
      return <MapPin size={17} />;
    case "ARTIFACT":
      return <Boxes size={17} />;
    case "ORGANIZATION":
      return <Compass size={17} />;
    case "TIMELINE_EVENT":
      return <Clock3 size={17} />;
  }
}

const initials = (v: string) =>
  v
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// ─── Entity Modal ──────────────────────────────────────────────────────────────
function EntityModal({
  entityType,
  entity,
  onClose,
  onSave,
  onDelete,
}: {
  entityType: EntityType;
  entity?: WorldEntity;
  onClose: () => void;
  onSave: (data: Partial<WorldEntity>) => void;
  onDelete?: () => void;
}) {
  const meta = TYPE_META[entityType];
  const [displayName, setDisplayName] = useState(entity?.displayName ?? "");
  const [externalId, setExternalId] = useState(entity?.externalId ?? "");
  const [subtitle, setSubtitle] = useState(entity?.subtitle ?? "");
  const [description, setDescription] = useState(entity?.description ?? "");
  const [status, setStatus] = useState(entity?.status ?? meta.statuses[0]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    onSave({
      displayName: displayName.trim(),
      externalId: externalId.trim() || undefined,
      subtitle: subtitle.trim(),
      description: description.trim(),
      status,
      type: entityType,
    });
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal entity-modal"
        onSubmit={handleSubmit}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">
              {entity ? `EDIT ${meta.singular.toUpperCase()}` : `NEW ${meta.singular.toUpperCase()}`}
            </span>
            <h2>{entity ? entity.displayName : `Create ${meta.singular}`}</h2>
          </div>
          <button type="button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>

        <div className="modal-fields">
          <label>
            Display name
            <input
              autoFocus
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={`Untitled ${meta.singular}`}
            />
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {meta.statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>

        <label>
          External ID / prompt alias
          <input
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
            placeholder="jcerna-01a3"
            pattern="[a-zA-Z0-9_-]{1,64}"
          />
        </label>

        <label>
          Role / context
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Role, setting, or context"
          />
        </label>

        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Story details, goals, or visual direction"
          />
        </label>

        <div className="modal-actions">
          {entity && onDelete && (
            <button className="danger-text" type="button" onClick={onDelete}>
              <Trash2 size={15} />
              Delete
            </button>
          )}
          <span />
          <button className="outline-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            <Check size={15} />
            {entity ? "Save changes" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── WorldPage ─────────────────────────────────────────────────────────────────
export default function WorldPage({ entityType }: Props) {
  const { seriesId } = useSeriesContext();
  const qc = useQueryClient();
  const meta = TYPE_META[entityType];
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modal, setModal] = useState<{ entity?: WorldEntity } | null>(null);
  const [toast, setToast] = useState("");

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  };

  const { data: entities = [], isLoading } = useQuery({
    queryKey: ["world", seriesId, entityType],
    queryFn: () => worldApi.list(seriesId, entityType),
    enabled: !!seriesId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<WorldEntity>) =>
      worldApi.create(seriesId, { ...data, type: entityType } as Omit<WorldEntity, "id" | "createdAt">),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["world", seriesId, entityType] });
      setModal(null);
      notify(`${meta.singular} created`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WorldEntity> }) =>
      worldApi.update(seriesId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["world", seriesId, entityType] });
      setModal(null);
      notify("Changes saved");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => worldApi.delete(seriesId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["world", seriesId, entityType] });
      setModal(null);
      notify(`${meta.singular} deleted`);
    },
  });

  const filtered = entities.filter(
    (e) =>
      (statusFilter === "All" || e.status === statusFilter) &&
      (e.displayName + (e.externalId ?? "") + (e.subtitle ?? "") + (e.description ?? ""))
        .toLowerCase()
        .includes(query.toLowerCase())
  );

  const isCharOrLoc = entityType === "CHARACTER" || entityType === "LOCATION";

  return (
    <>
      <section className="page-intro compact">
        <div>
          <span className="eyebrow">{meta.eyebrow}</span>
          <h1>{meta.label}</h1>
        </div>
        <button className="primary-button" onClick={() => setModal({})}>
          <Plus size={17} />
          New {meta.singular}
        </button>
      </section>

      <div className="filter-row">
        <div className="field-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${meta.label.toLowerCase()}…`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>All</option>
          {meta.statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <span>{filtered.length} results</span>
      </div>

      {isCharOrLoc ? (
        /* Card grid for Characters & Locations */
        <section className="character-grid">
          {isLoading
            ? [1, 2, 3, 4].map((i) => (
                <div className="character-card panel" key={i}>
                  <div
                    className="character-visual"
                    style={{ "--card-color": "#5f564d" } as React.CSSProperties}
                  />
                  <div className="character-copy" style={{ padding: 16 }}>
                    <div style={{ height: 60 }} />
                  </div>
                </div>
              ))
            : filtered.map((entity) => (
                <article className="character-card" key={entity.id}>
                  <button
                    className="card-hitarea"
                    onClick={() => setModal({ entity })}
                    aria-label={`Open ${entity.displayName}`}
                  />
                  <div
                    className="character-visual"
                    style={
                      {
                        "--card-color": entity.color || "#655b4f",
                      } as React.CSSProperties
                    }
                  >
                    <span>{initials(entity.displayName)}</span>
                    <i>{entity.status}</i>
                  </div>
                  <div className="character-copy">
                    <small>{entity.subtitle}</small>
                    <h2>{entity.displayName}</h2>
                    {entity.externalId && <code className="external-id-badge">{entity.externalId}</code>}
                    <p>"{entity.description}"</p>
                    <div>
                      <span>{entity.tags?.join(" · ") || "Profile ready"}</span>
                      <button onClick={() => setModal({ entity })}>
                        Open profile <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
          {!isLoading && filtered.length === 0 && (
            <div
              className="panel asset-empty"
              style={{ gridColumn: "1 / -1" }}
            >
              <h2>No {meta.label.toLowerCase()} found</h2>
              <p>Create the first one or adjust your search filters.</p>
              <button className="primary-button" onClick={() => setModal({})}>
                <Plus size={16} />
                Add {meta.singular}
              </button>
            </div>
          )}
        </section>
      ) : (
        /* Table for other types */
        <section className="panel data-table">
          <div className="data-head">
            <span>NAME & DESCRIPTION</span>
            <span>STATUS</span>
            <span>TAGS</span>
            <span>ACTIONS</span>
          </div>
          {isLoading
            ? [1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)
            : filtered.map((entity) => (
                <button
                  className="data-row"
                  key={entity.id}
                  onClick={() => setModal({ entity })}
                >
                  <span className="entity-main">
                    <i>
                      <EntityIcon kind={entityType} />
                    </i>
                    <span>
                      <strong>{entity.displayName}</strong>
                      <small>
                        {entity.subtitle}
                        {entity.externalId ? ` · ${entity.externalId}` : ""}
                        {entity.description ? ` · ${entity.description}` : ""}
                      </small>
                    </span>
                  </span>
                  <span>
                    <StatusPill status={entity.status} />
                  </span>
                  <span>{entity.tags?.join(", ") || "—"}</span>
                  <span className="row-actions">
                    <ChevronRight size={15} />
                  </span>
                </button>
              ))}
          {!isLoading && filtered.length === 0 && (
            <div style={{ padding: "32px", textAlign: "center", color: "#999", fontSize: 9 }}>
              No {meta.label.toLowerCase()} found.{" "}
              <button
                style={{ background: "none", border: 0, color: "#a08356", cursor: "pointer" }}
                onClick={() => setModal({})}
              >
                Create one →
              </button>
            </div>
          )}
        </section>
      )}

      {modal && (
        <EntityModal
          entityType={entityType}
          entity={modal.entity}
          onClose={() => setModal(null)}
          onSave={(data) => {
            if (modal.entity) {
              updateMutation.mutate({ id: modal.entity.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          onDelete={
            modal.entity
              ? () => {
                  if (confirm(`Delete "${modal.entity!.displayName}"? This cannot be undone.`)) {
                    deleteMutation.mutate(modal.entity!.id);
                  }
                }
              : undefined
          }
        />
      )}

      {toast && (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      )}
    </>
  );
}
