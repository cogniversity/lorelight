import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Aperture, Archive, Bell, BookOpen, Boxes, Check, ChevronDown, ChevronRight,
  CircleUserRound, Clapperboard, Clock3, Compass, Download, Edit3, FileText,
  Film, FolderOpen, GalleryVerticalEnd, LayoutDashboard, MapPin, Menu,
  MoreHorizontal, Plus, RotateCcw, Search, Settings, Sparkles, Trash2,
  Upload, UsersRound, X, Zap,
} from "lucide-react";
import { Entity, EntityKind, useProjectStore } from "./store";

type Page = "Overview" | "Story Bible" | "Characters" | "Locations" | "Episodes" | "Scenes" | "Clips" | "Assets" | "Timeline" | "Artifacts" | "Organizations" | "Settings";

const pageKind: Partial<Record<Page, EntityKind>> = {
  Characters: "Character", Locations: "Location", Episodes: "Episode", Scenes: "Scene",
  Clips: "Clip", Assets: "Asset", Timeline: "Timeline Event", Artifacts: "Artifact",
  Organizations: "Organization",
};

const nav: { section: string; items: { label: Page; icon: typeof BookOpen }[] }[] = [
  { section: "Workspace", items: [
    { label: "Overview", icon: LayoutDashboard }, { label: "Story Bible", icon: BookOpen },
    { label: "Characters", icon: UsersRound }, { label: "Locations", icon: MapPin },
  ]},
  { section: "Production", items: [
    { label: "Episodes", icon: GalleryVerticalEnd }, { label: "Scenes", icon: Clapperboard },
    { label: "Clips", icon: Film }, { label: "Assets", icon: FolderOpen },
  ]},
  { section: "World", items: [
    { label: "Timeline", icon: Clock3 }, { label: "Artifacts", icon: Boxes },
    { label: "Organizations", icon: Compass },
  ]},
];

const kindPage: Record<EntityKind, Page> = {
  Character: "Characters", Location: "Locations", Episode: "Episodes", Scene: "Scenes",
  Clip: "Clips", Asset: "Assets", "Timeline Event": "Timeline", Artifact: "Artifacts",
  Organization: "Organizations",
};

const kindOptions: EntityKind[] = ["Character", "Location", "Episode", "Scene", "Clip", "Artifact", "Organization", "Timeline Event", "Asset"];
const statusOptions: Record<EntityKind, string[]> = {
  Character: ["Alive", "Unknown", "Deceased"], Location: ["Active", "Restricted", "Destroyed"],
  Episode: ["Outline", "Draft", "Review", "Approved", "Production", "Complete"],
  Scene: ["Draft", "Review", "Approved", "Production", "Complete"],
  Clip: ["Planned", "Ready", "Generated", "Review", "Approved", "Final"],
  Artifact: ["Active", "Missing", "Destroyed"], Organization: ["Active", "Disbanded", "Unknown"],
  "Timeline Event": ["Draft", "Canon"], Asset: ["Uploaded", "Review", "Approved"],
};

const activity = [
  { icon: Clapperboard, text: "Clip 01.01.01 moved to Final", meta: "Vikram · recently", tone: "sage" },
  { icon: FileText, text: "Scene “The Observatory” updated", meta: "Vikram · today", tone: "blue" },
  { icon: CircleUserRound, text: "Character library reviewed", meta: "Vikram · today", tone: "amber" },
  { icon: Archive, text: "World canon synchronized", meta: "System · today", tone: "plum" },
];

const initials = (value: string) => value.split(/\s+/).map(word => word[0]).slice(0, 2).join("").toUpperCase();
const labelForKind = (kind: EntityKind) => kind === "Timeline Event" ? "event" : kind.toLowerCase();

function StatusPill({ status }: { status: string }) {
  const slug = status.toLowerCase().replace(/\s/g, "-");
  return <span className={`status status-${slug}`}><i />{status}</span>;
}

function Progress({ value, tone = "gold" }: { value: number; tone?: string }) {
  return <div className="progress-track"><span className={`progress-${tone}`} style={{ width: `${value}%` }} /></div>;
}

function Sidebar({ active, navigate, open, close, data }: {
  active: Page; navigate: (page: Page) => void; open: boolean; close: () => void; data: Entity[];
}) {
  return <>
    {open && <button className="sidebar-scrim" onClick={close} aria-label="Close menu" />}
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Aperture size={21} /></div><div><strong>Lorelight</strong><span>STORY OS</span></div><button className="mobile-close" onClick={close}><X size={18} /></button></div>
      <div className="project-picker"><span className="project-art">CG</span><div><small>Current series</small><strong>Children of Glass</strong></div><ChevronDown size={15} /></div>
      <nav>{nav.map(group => <div className="nav-group" key={group.section}><p>{group.section}</p>{group.items.map(item => {
        const Icon = item.icon; const kind = pageKind[item.label]; const count = kind ? data.filter(e => e.kind === kind).length : 0;
        return <button key={item.label} className={active === item.label ? "active" : ""} onClick={() => { navigate(item.label); close(); }}><Icon size={17} /><span>{item.label}</span>{kind && <em>{count}</em>}</button>;
      })}</div>)}</nav>
      <div className="sidebar-bottom"><button onClick={() => navigate("Settings")}><Settings size={17} />Series settings</button><div className="user"><div className="avatar">VK</div><div><strong>Vikram K.</strong><span>Administrator</span></div><MoreHorizontal size={18} /></div></div>
    </aside>
  </>;
}

function Header({ page, onSearch, onMenu, onCreate, onNotifications }: {
  page: Page; onSearch: () => void; onMenu: () => void; onCreate: () => void; onNotifications: () => void;
}) {
  return <header><button className="menu-button" onClick={onMenu}><Menu size={20} /></button><div className="breadcrumb"><span>Children of Glass</span><ChevronRight size={14} /><strong>{page}</strong></div><div className="header-actions"><button className="search-button" onClick={onSearch}><Search size={16} /><span>Search the universe...</span><kbd>⌘ K</kbd></button><button className="icon-button notification-button" onClick={onNotifications}><Bell size={18} /><i /></button><button className="primary-button" onClick={onCreate}><Plus size={17} />Create</button></div></header>;
}

function Overview({ entities, navigate }: { entities: Entity[]; navigate: (page: Page) => void }) {
  const episodes = entities.filter(e => e.kind === "Episode");
  const scenes = entities.filter(e => e.kind === "Scene");
  const clips = entities.filter(e => e.kind === "Clip");
  const final = clips.filter(e => e.status === "Final");
  const overall = episodes.length ? Math.round(episodes.reduce((sum, item) => sum + (item.progress || 0), 0) / episodes.length) : 0;
  return <>
    <section className="page-intro"><div><span className="eyebrow">YOUR STORY UNIVERSE</span><h1>Good evening, Vikram.</h1><p>Your universe is taking shape. Here’s where production stands today.</p></div><button className="outline-button" onClick={() => navigate("Story Bible")}><BookOpen size={17} />Open story bible</button></section>
    <section className="metric-grid">
      <article><span className="metric-icon sand"><GalleryVerticalEnd size={19} /></span><div><p>Episodes</p><strong>{episodes.length}</strong><small><b>{episodes.filter(e => e.status === "Production").length}</b> in production</small></div></article>
      <article><span className="metric-icon blue"><Clapperboard size={19} /></span><div><p>Total scenes</p><strong>{scenes.length}</strong><small><b>{scenes.filter(e => e.status === "Approved").length}</b> approved</small></div></article>
      <article><span className="metric-icon plum"><Film size={19} /></span><div><p>Production clips</p><strong>{clips.length}</strong><small><b>{clips.filter(e => e.status === "Ready").length}</b> generation ready</small></div></article>
      <article><span className="metric-icon sage"><Zap size={19} /></span><div><p>Final clips</p><strong>{final.length}</strong><small><b>{clips.length ? Math.round(final.length / clips.length * 100) : 0}%</b> of total</small></div></article>
    </section>
    <div className="dashboard-grid"><section className="panel production-panel"><div className="panel-head"><div><span className="eyebrow">PRODUCTION PULSE</span><h2>Series progress</h2></div><button className="text-button" onClick={() => navigate("Episodes")}>View episodes <ChevronRight size={15} /></button></div><div className="overall-progress"><div><span>Overall completion</span><strong>{overall}%</strong></div><Progress value={overall} /></div><div className="episode-progress-list">{episodes.map((ep, index) => <button key={ep.id} onClick={() => navigate("Episodes")}><span className="ep-number">{String(index + 1).padStart(2, "0")}</span><div className="ep-info"><div><strong>{ep.title}</strong><StatusPill status={ep.status} /></div><Progress value={ep.progress || 0} tone={(ep.progress || 0) > 50 ? "sage" : "gold"} /></div><b>{ep.progress || 0}%</b><ChevronRight size={16} /></button>)}</div></section>
      <aside className="panel activity-panel"><div className="panel-head"><div><span className="eyebrow">TEAM</span><h2>Recent activity</h2></div></div><div className="activity-list">{activity.map((item, index) => { const Icon = item.icon; return <div className="activity" key={index}><span className={`activity-icon ${item.tone}`}><Icon size={16} /></span><div><strong>{item.text}</strong><small>{item.meta}</small></div></div>; })}</div><button className="full-text-button" onClick={() => navigate("Timeline")}>Open timeline</button></aside></div>
    <section className="panel continue-panel"><div className="panel-head"><div><span className="eyebrow">QUICK ACCESS</span><h2>Continue creating</h2></div></div><div className="continue-cards">{[
      { page: "Scenes" as Page, Icon: Clapperboard, label: "SCENE", item: scenes[0] },
      { page: "Characters" as Page, Icon: CircleUserRound, label: "CHARACTER", item: entities.find(e => e.kind === "Character") },
      { page: "Story Bible" as Page, Icon: Sparkles, label: "CANON", item: undefined },
    ].map(({ page: target, Icon, label, item }) => <button key={target} onClick={() => navigate(target)}><span className="continue-icon"><Icon size={20} /></span><div><small>{label}</small><strong>{item?.title || "Story Bible"}</strong><p>{item?.description || "Premise, themes, lore, and canon rules."}</p></div><ChevronRight size={18} /></button>)}</div></section>
  </>;
}

function StoryBible({ bible, saveBible }: { bible: Record<string, string>; saveBible: (tab: string, value: string) => void }) {
  const tabs = ["Premise", "Themes", "Canon rules", "Lore", "Timeline"];
  const [tab, setTab] = useState("Premise");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bible[tab]);
  useEffect(() => { setDraft(bible[tab] || ""); setEditing(false); }, [tab, bible]);
  return <><section className="page-intro compact"><div><span className="eyebrow">FOUNDATION</span><h1>Story Bible</h1><p>The canonical source of truth for the Children of Glass universe.</p></div><button className="primary-button" onClick={() => setEditing(true)}><Edit3 size={16} />Edit {tab.toLowerCase()}</button></section><div className="tabs">{tabs.map(item => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>)}</div><section className="bible-layout"><article className="panel document"><div className="document-meta"><span>AUTOSAVED LOCALLY</span>{!editing && <button onClick={() => setEditing(true)}><Edit3 size={16} /></button>}</div><h2>{tab}</h2>{editing ? <div className="bible-editor"><textarea value={draft} onChange={e => setDraft(e.target.value)} autoFocus /><div><button className="outline-button" onClick={() => { setDraft(bible[tab]); setEditing(false); }}>Cancel</button><button className="primary-button" onClick={() => { saveBible(tab, draft); setEditing(false); }}><Check size={15} />Save entry</button></div></div> : <div className="bible-content">{(bible[tab] || "").split("\n").map((line, index) => line ? <p className={index === 0 ? "lead" : ""} key={index}>{line}</p> : <br key={index} />)}</div>}</article><aside className="panel references"><span className="eyebrow">CANON STATUS</span><h3>Entry details</h3><div className="reference-note"><Check size={17} /><div><strong>Canonical</strong><small>Available throughout the workspace</small></div></div><div className="reference-note"><Archive size={17} /><div><strong>Locally persisted</strong><small>Changes survive browser refreshes</small></div></div></aside></section></>;
}

function CardLibrary({ kind, entities, onNew, onOpen }: { kind: "Character" | "Location"; entities: Entity[]; onNew: () => void; onOpen: (e: Entity) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const items = entities.filter(e => e.kind === kind && (status === "All" || e.status === status) && (e.title + e.subtitle + e.description).toLowerCase().includes(query.toLowerCase()));
  return <><section className="page-intro compact"><div><span className="eyebrow">{kind === "Character" ? "CAST & RELATIONSHIPS" : "WORLD & VIRTUAL SETS"}</span><h1>{kind === "Character" ? "Characters" : "Locations"}</h1><p>{kind === "Character" ? "The people who shape your story and the connections between them." : "Reusable environments, architecture, mood, and visual direction."}</p></div><button className="primary-button" onClick={onNew}><Plus size={17} />New {kind.toLowerCase()}</button></section><div className="filter-row"><div className="field-search"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${kind.toLowerCase()}s...`} /></div><select value={status} onChange={e => setStatus(e.target.value)}><option>All</option>{statusOptions[kind].map(s => <option key={s}>{s}</option>)}</select><span>{items.length} results</span></div><section className="character-grid">{items.map(item => <article className="character-card" key={item.id}><button className="card-hitarea" onClick={() => onOpen(item)} aria-label={`Open ${item.title}`} /><div className="character-visual" style={{ "--card-color": item.color || "#655b4f" } as React.CSSProperties}><span>{initials(item.title)}</span><i>{item.status}</i></div><div className="character-copy"><small>{item.subtitle}</small><h2>{item.title}</h2><p>“{item.description}”</p><div><span>{item.tags?.join(" · ") || "Profile ready"}</span><button onClick={() => onOpen(item)}>Open profile <ChevronRight size={14} /></button></div></div></article>)}</section>{!items.length && <EmptyState label={kind.toLowerCase()} onAdd={onNew} />}</>;
}

function EntityWorkspace({ kind, entities, onNew, onOpen }: { kind: EntityKind; entities: Entity[]; onNew: () => void; onOpen: (e: Entity) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const items = entities.filter(e => e.kind === kind && (status === "All" || e.status === status) && (e.title + e.subtitle + e.description).toLowerCase().includes(query.toLowerCase()));
  const page = kindPage[kind];
  const descriptions: Record<EntityKind, string> = {
    Character: "", Location: "", Episode: "Build season arcs and track each episode through production.",
    Scene: "Structure episodes into dramatic scenes and production beats.",
    Clip: "Prepare generation-ready cinematic shots, prompts, audio, and status.",
    Asset: "Reference images, video, audio, storyboards, and documents.",
    Artifact: "Objects that carry history, power, and meaning through the story.",
    Organization: "Factions, institutions, leadership, and relationships.",
    "Timeline Event": "The canonical chronology of your story universe.",
  };
  const Icon = kind === "Episode" ? GalleryVerticalEnd : kind === "Scene" ? Clapperboard : kind === "Clip" ? Film : kind === "Asset" ? FolderOpen : kind === "Artifact" ? Boxes : kind === "Organization" ? Compass : Clock3;
  return <><section className="page-intro compact"><div><span className="eyebrow">{kind === "Clip" ? "AI GENERATION PIPELINE" : "STRUCTURED KNOWLEDGE"}</span><h1>{page}</h1><p>{descriptions[kind]}</p></div><button className="primary-button" onClick={onNew}><Plus size={17} />New {labelForKind(kind)}</button></section><div className="filter-row"><div className="field-search"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${page.toLowerCase()}...`} /></div><select value={status} onChange={e => setStatus(e.target.value)}><option>All</option>{statusOptions[kind].map(s => <option key={s}>{s}</option>)}</select><span>{items.length} results</span></div>
    <section className="panel data-table"><div className="data-head"><span>NAME & DESCRIPTION</span><span>STATUS</span><span>{kind === "Episode" ? "PROGRESS" : "DURATION / TYPE"}</span><span>ACTIONS</span></div>{items.map(item => <button className="data-row" key={item.id} onClick={() => onOpen(item)}><span className="entity-main"><i><Icon size={17} /></i><span><strong>{item.title}</strong><small>{item.subtitle}<br />{item.description}</small></span></span><span><StatusPill status={item.status} /></span><span>{kind === "Episode" ? <span className="inline-progress"><Progress value={item.progress || 0} /><b>{item.progress || 0}%</b></span> : item.duration || item.tags?.join(", ") || "—"}</span><span className="row-actions"><Edit3 size={15} /><ChevronRight size={15} /></span></button>)}</section>{!items.length && <EmptyState label={labelForKind(kind)} onAdd={onNew} />}</>;
}

function EmptyState({ label, onAdd }: { label: string; onAdd: () => void }) {
  return <section className="panel asset-empty"><div className="asset-stack"><FolderOpen size={31} /></div><h2>No {label}s found</h2><p>Create the first one or adjust your current search and filters.</p><button className="primary-button" onClick={onAdd}><Plus size={16} />Add {label}</button></section>;
}

function SettingsPage({ seriesName, premise, onSave, onReset }: { seriesName: string; premise: string; onSave: (a: string, b: string) => void; onReset: () => void }) {
  const [name, setName] = useState(seriesName); const [summary, setSummary] = useState(premise);
  return <><section className="page-intro compact"><div><span className="eyebrow">WORKSPACE</span><h1>Series settings</h1><p>Manage your project identity and local workspace data.</p></div></section><section className="settings-grid"><form className="panel settings-form" onSubmit={e => { e.preventDefault(); onSave(name, summary); }}><h2>Project details</h2><label>Series name<input value={name} onChange={e => setName(e.target.value)} /></label><label>One-line premise<textarea value={summary} onChange={e => setSummary(e.target.value)} /></label><button className="primary-button"><Check size={15} />Save settings</button></form><aside className="panel danger-zone"><h2>Local data</h2><p>All content is stored in this browser. Resetting restores the original demo universe and removes your changes.</p><button className="danger-button" type="button" onClick={onReset}><RotateCcw size={15} />Reset demo data</button></aside></section></>;
}

function EntityModal({ entity, initialKind, episodes, onClose, onSave, onDelete }: {
  entity?: Entity; initialKind: EntityKind; episodes: Entity[]; onClose: () => void;
  onSave: (input: Omit<Entity, "id" | "createdAt"> & { id?: string }) => void; onDelete: (id: string) => void;
}) {
  const [kind, setKind] = useState<EntityKind>(entity?.kind || initialKind);
  const [title, setTitle] = useState(entity?.title || "");
  const [subtitle, setSubtitle] = useState(entity?.subtitle || "");
  const [description, setDescription] = useState(entity?.description || "");
  const [status, setStatus] = useState(entity?.status || statusOptions[entity?.kind || initialKind][0]);
  const [episode, setEpisode] = useState(entity?.episode || "");
  const [duration, setDuration] = useState(entity?.duration || "");
  const [progress, setProgress] = useState(entity?.progress || 0);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    onSave({ id: entity?.id, kind, title: title.trim(), subtitle: subtitle.trim(), description: description.trim(), status, episode: episode || undefined, duration: duration || undefined, progress: kind === "Episode" ? progress : undefined, tags: entity?.tags, color: entity?.color || ["#745c45", "#445f63", "#756456", "#8a6c3f"][Math.floor(Math.random() * 4)] });
  };
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="modal entity-modal" onSubmit={submit} onMouseDown={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">{entity ? "EDIT ENTITY" : "ADD TO YOUR UNIVERSE"}</span><h2>{entity ? entity.title : `Create new ${labelForKind(kind)}`}</h2></div><button type="button" onClick={onClose}><X size={19} /></button></div>{!entity && <><label>Entity type</label><select value={kind} onChange={e => { const next = e.target.value as EntityKind; setKind(next); setStatus(statusOptions[next][0]); }}>{kindOptions.map(item => <option key={item}>{item}</option>)}</select></>}<div className="modal-fields"><label>Title<input autoFocus required value={title} onChange={e => setTitle(e.target.value)} placeholder={`Untitled ${labelForKind(kind)}`} /></label><label>Status<select value={status} onChange={e => setStatus(e.target.value)}>{statusOptions[kind].map(item => <option key={item}>{item}</option>)}</select></label></div><label>Role / context<input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Role, setting, shot, or context" /></label><label>Description<textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Story details, goals, action, or visual direction" /></label>{["Scene", "Clip"].includes(kind) && <div className="modal-fields"><label>Episode<select value={episode} onChange={e => setEpisode(e.target.value)}><option value="">Unassigned</option>{episodes.map(ep => <option key={ep.id} value={ep.id}>{ep.title}</option>)}</select></label><label>Duration<input value={duration} onChange={e => setDuration(e.target.value)} placeholder={kind === "Clip" ? "7 sec" : "03:30"} /></label></div>}{kind === "Episode" && <label>Production progress: {progress}%<input type="range" min="0" max="100" value={progress} onChange={e => setProgress(Number(e.target.value))} /></label>}<div className="modal-actions">{entity && <button className="danger-text" type="button" onClick={() => onDelete(entity.id)}><Trash2 size={15} />Delete</button>}<span /><button className="outline-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit"><Check size={15} />{entity ? "Save changes" : "Create"}</button></div></form></div>;
}

function SearchModal({ entities, close, open }: { entities: Entity[]; close: () => void; open: (entity: Entity) => void }) {
  const [query, setQuery] = useState("");
  const results = entities.filter(item => (item.title + item.subtitle + item.description + item.kind).toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  return <div className="modal-backdrop search-backdrop" onMouseDown={close}><div className="search-modal" onMouseDown={e => e.stopPropagation()}><div className="command-input"><Search size={20} /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search characters, scenes, clips, lore..." /><kbd>ESC</kbd></div><p>{query ? `${results.length} RESULTS` : "RECENT & FEATURED"}</p>{results.map(item => <button key={item.id} onClick={() => open(item)}><span>{item.kind === "Character" ? <CircleUserRound size={17} /> : item.kind === "Location" ? <MapPin size={17} /> : <FileText size={17} />}</span><div><strong>{item.title}</strong><small>{item.kind} · {item.subtitle}</small></div><ChevronRight size={16} /></button>)}{!results.length && <div className="search-empty">No matching entities</div>}<footer><span>Type to filter</span><span>↵ Open</span><span>esc Close</span></footer></div></div>;
}

function Notifications({ close }: { close: () => void }) {
  return <div className="popover-scrim" onClick={close}><aside className="notification-popover" onClick={e => e.stopPropagation()}><div><h3>Notifications</h3><button onClick={close}><X size={17} /></button></div>{activity.slice(0, 3).map((item, index) => <button key={index}><span className={`activity-icon ${item.tone}`}><item.icon size={15} /></span><span><strong>{item.text}</strong><small>{item.meta}</small></span></button>)}<button className="mark-read" onClick={close}><Check size={14} />Mark all as read</button></aside></div>;
}

function AssetUpload({ close, save }: { close: () => void; save: (input: Omit<Entity, "id" | "createdAt">) => void }) {
  const input = useRef<HTMLInputElement>(null); const [files, setFiles] = useState<File[]>([]);
  return <div className="modal-backdrop" onMouseDown={close}><div className="modal" onMouseDown={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">ASSET LIBRARY</span><h2>Upload assets</h2></div><button onClick={close}><X size={19} /></button></div><button className="upload-zone" onClick={() => input.current?.click()}><Upload size={27} /><strong>Choose production files</strong><span>Images, video, audio, storyboards, and documents</span></button><input ref={input} hidden type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))} />{files.map(file => <div className="upload-file" key={file.name}><FileText size={16} /><span>{file.name}</span><small>{Math.ceil(file.size / 1024)} KB</small></div>)}<div className="modal-actions"><button className="outline-button" onClick={close}>Cancel</button><button className="primary-button" disabled={!files.length} onClick={() => { files.forEach(file => save({ kind: "Asset", title: file.name, subtitle: file.type || "Document", description: `Uploaded production asset · ${Math.ceil(file.size / 1024)} KB`, status: "Uploaded", duration: "", tags: [file.type || "file"] })); close(); }}><Upload size={15} />Upload {files.length || ""}</button></div></div></div>;
}

export default function FullApp() {
  const { data, saveEntity, deleteEntity, saveBible, updateSettings, reset } = useProjectStore();
  const [page, setPage] = useState<Page>("Overview");
  const [sidebar, setSidebar] = useState(false);
  const [search, setSearch] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [modal, setModal] = useState<{ kind: EntityKind; entity?: Entity } | null>(null);
  const [upload, setUpload] = useState(false);
  const [toast, setToast] = useState("");
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const navigate = (target: Page) => { setPage(target); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openEntity = (entity: Entity) => { setSearch(false); navigate(kindPage[entity.kind]); setModal({ kind: entity.kind, entity }); };
  const createForPage = () => page === "Assets" ? setUpload(true) : setModal({ kind: pageKind[page] || "Clip" });
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearch(true); }
      if (event.key === "Escape") { setSearch(false); setModal(null); setUpload(false); }
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, []);
  const content = useMemo(() => {
    if (page === "Overview") return <Overview entities={data.entities} navigate={navigate} />;
    if (page === "Story Bible") return <StoryBible bible={data.bible} saveBible={(tab, value) => { saveBible(tab, value); notify("Story Bible saved"); }} />;
    if (page === "Characters" || page === "Locations") { const kind = page === "Characters" ? "Character" : "Location"; return <CardLibrary kind={kind} entities={data.entities} onNew={() => setModal({ kind })} onOpen={openEntity} />; }
    if (page === "Settings") return <SettingsPage seriesName={data.seriesName} premise={data.premise} onSave={(name, premise) => { updateSettings(name, premise); notify("Settings saved"); }} onReset={() => { if (confirm("Reset all local data to the original demo?")) { reset(); notify("Demo data restored"); } }} />;
    const kind = pageKind[page]!;
    return <EntityWorkspace kind={kind} entities={data.entities} onNew={() => kind === "Asset" ? setUpload(true) : setModal({ kind })} onOpen={openEntity} />;
  }, [page, data]);
  return <div className="app-shell"><Sidebar active={page} navigate={navigate} open={sidebar} close={() => setSidebar(false)} data={data.entities} /><div className="main-shell"><Header page={page} onSearch={() => setSearch(true)} onMenu={() => setSidebar(true)} onCreate={createForPage} onNotifications={() => setNotifications(value => !value)} /><main>{content}</main></div>{search && <SearchModal entities={data.entities} close={() => setSearch(false)} open={openEntity} />}{notifications && <Notifications close={() => setNotifications(false)} />}{modal && <EntityModal entity={modal.entity} initialKind={modal.kind} episodes={data.entities.filter(e => e.kind === "Episode")} onClose={() => setModal(null)} onSave={input => { saveEntity(input); setModal(null); navigate(kindPage[input.kind]); notify(modal.entity ? "Changes saved" : `${input.kind} created`); }} onDelete={id => { if (confirm("Delete this entity? This cannot be undone.")) { deleteEntity(id); setModal(null); notify("Entity deleted"); } }} />}{upload && <AssetUpload close={() => setUpload(false)} save={input => { saveEntity(input); notify("Assets uploaded"); }} />}{toast && <div className="toast"><span>✓</span>{toast}</div>}</div>;
}
