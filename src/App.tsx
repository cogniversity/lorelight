import { useMemo, useState } from "react";
import {
  Aperture, Archive, Bell, BookOpen, Boxes, ChevronDown, ChevronRight,
  CircleUserRound, Clapperboard, Clock3, Compass, FileText, Film, FolderOpen,
  GalleryVerticalEnd, LayoutDashboard, MapPin, Menu, MoreHorizontal, Plus,
  Search, Settings, Sparkles, UsersRound, X, Zap,
} from "lucide-react";

type Page = "Overview" | "Story Bible" | "Characters" | "Locations" | "Episodes" | "Assets";

const episodes = [
  { no: "01", title: "The Signal Beneath", synopsis: "A forbidden transmission draws Mara back to the city she escaped.", status: "Production", scenes: 18, clips: 74, progress: 68, runtime: "42 min" },
  { no: "02", title: "Glass Memory", synopsis: "An archived memory reveals a fracture in the Council's origin story.", status: "Review", scenes: 14, clips: 61, progress: 43, runtime: "38 min" },
  { no: "03", title: "The Hollow Crown", synopsis: "Two heirs meet in secret while the lower rings prepare to revolt.", status: "Draft", scenes: 11, clips: 47, progress: 22, runtime: "—" },
  { no: "04", title: "A Sky Without Stars", synopsis: "Mara crosses the veil and discovers what the city was built to hide.", status: "Outline", scenes: 8, clips: 28, progress: 9, runtime: "—" },
];

const characters = [
  { name: "Mara Vey", role: "Protagonist · Signal Runner", initials: "MV", color: "#745c45", quote: "The city remembers what we choose to forget.", status: "Alive", scenes: 28 },
  { name: "Cael Orin", role: "Council Heir · Archivist", initials: "CO", color: "#445f63", quote: "Truth has always had a cost.", status: "Alive", scenes: 19 },
  { name: "The Regent", role: "Antagonist · First Voice", initials: "TR", color: "#59535d", quote: "Order is the only mercy left to us.", status: "Unknown", scenes: 11 },
  { name: "Ilyan Sable", role: "Guide · Former Cartographer", initials: "IS", color: "#8a6c3f", quote: "Every border begins as a lie.", status: "Alive", scenes: 16 },
];

const activity = [
  { icon: Clapperboard, text: "Clip 01.04.12 moved to Ready", meta: "Vikram · 12 min ago", tone: "sage" },
  { icon: FileText, text: "Scene 08 “The Observatory” updated", meta: "Nora · 46 min ago", tone: "blue" },
  { icon: CircleUserRound, text: "Cael Orin visual reference added", meta: "Vikram · 2 hrs ago", tone: "amber" },
  { icon: Archive, text: "6 production assets approved", meta: "Mina · Yesterday", tone: "plum" },
];

const nav: { section: string; items: { label: Page | string; icon: typeof BookOpen; badge?: string }[] }[] = [
  { section: "Workspace", items: [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Story Bible", icon: BookOpen },
    { label: "Characters", icon: UsersRound, badge: "12" },
    { label: "Locations", icon: MapPin, badge: "8" },
  ]},
  { section: "Production", items: [
    { label: "Episodes", icon: GalleryVerticalEnd, badge: "4" },
    { label: "Scenes", icon: Clapperboard, badge: "51" },
    { label: "Clips", icon: Film, badge: "210" },
    { label: "Assets", icon: FolderOpen },
  ]},
  { section: "World", items: [
    { label: "Timeline", icon: Clock3 },
    { label: "Artifacts", icon: Boxes },
    { label: "Organizations", icon: Compass },
  ]},
];

function StatusPill({ status }: { status: string }) {
  const slug = status.toLowerCase().replace(" ", "-");
  return <span className={`status status-${slug}`}><i />{status}</span>;
}

function Progress({ value, tone = "gold" }: { value: number; tone?: string }) {
  return <div className="progress-track"><span className={`progress-${tone}`} style={{ width: `${value}%` }} /></div>;
}

function Sidebar({ active, setActive, open, close }: { active: Page; setActive: (p: Page) => void; open: boolean; close: () => void }) {
  return (
    <>
      {open && <button className="sidebar-scrim" onClick={close} aria-label="Close menu" />}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Aperture size={21} strokeWidth={1.7} /></div>
          <div><strong>Lorelight</strong><span>STORY OS</span></div>
          <button className="mobile-close" onClick={close}><X size={18} /></button>
        </div>
        <div className="project-picker">
          <span className="project-art">CG</span>
          <div><small>Current series</small><strong>Children of Glass</strong></div>
          <ChevronDown size={15} />
        </div>
        <nav>
          {nav.map(group => (
            <div className="nav-group" key={group.section}>
              <p>{group.section}</p>
              {group.items.map(item => {
                const Icon = item.icon;
                const enabled = ["Overview", "Story Bible", "Characters", "Locations", "Episodes", "Assets"].includes(item.label);
                return (
                  <button key={item.label} className={active === item.label ? "active" : ""} onClick={() => {
                    if (enabled) setActive(item.label as Page);
                    close();
                  }}>
                    <Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>{item.badge && <em>{item.badge}</em>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button><Settings size={17} />Series settings</button>
          <div className="user"><div className="avatar">VK</div><div><strong>Vikram K.</strong><span>Administrator</span></div><MoreHorizontal size={18} /></div>
        </div>
      </aside>
    </>
  );
}

function Header({ page, onSearch, onMenu, onCreate }: { page: Page; onSearch: () => void; onMenu: () => void; onCreate: () => void }) {
  return (
    <header>
      <button className="menu-button" onClick={onMenu}><Menu size={20} /></button>
      <div className="breadcrumb"><span>Children of Glass</span><ChevronRight size={14} /><strong>{page}</strong></div>
      <div className="header-actions">
        <button className="search-button" onClick={onSearch}><Search size={16} /><span>Search the universe...</span><kbd>⌘ K</kbd></button>
        <button className="icon-button"><Bell size={18} /></button>
        <button className="primary-button" onClick={onCreate}><Plus size={17} />Create</button>
      </div>
    </header>
  );
}

function Overview({ openPage }: { openPage: (p: Page) => void }) {
  return (
    <>
      <section className="page-intro">
        <div><span className="eyebrow">SATURDAY, OCTOBER 24</span><h1>Good evening, Vikram.</h1><p>Your universe is taking shape. Here’s where production stands today.</p></div>
        <button className="outline-button" onClick={() => openPage("Story Bible")}><BookOpen size={17} />Open story bible</button>
      </section>

      <section className="metric-grid">
        <article><span className="metric-icon sand"><GalleryVerticalEnd size={19} /></span><div><p>Episodes</p><strong>4</strong><small><b>2</b> in progress</small></div></article>
        <article><span className="metric-icon blue"><Clapperboard size={19} /></span><div><p>Total scenes</p><strong>51</strong><small><b>+6</b> this week</small></div></article>
        <article><span className="metric-icon plum"><Film size={19} /></span><div><p>Production clips</p><strong>210</strong><small><b>128</b> generation ready</small></div></article>
        <article><span className="metric-icon sage"><Zap size={19} /></span><div><p>Final clips</p><strong>37</strong><small><b>18%</b> of total</small></div></article>
      </section>

      <div className="dashboard-grid">
        <section className="panel production-panel">
          <div className="panel-head"><div><span className="eyebrow">PRODUCTION PULSE</span><h2>Series progress</h2></div><button className="text-button" onClick={() => openPage("Episodes")}>View episodes <ChevronRight size={15} /></button></div>
          <div className="overall-progress">
            <div><span>Overall completion</span><strong>38%</strong></div><Progress value={38} />
          </div>
          <div className="episode-progress-list">
            {episodes.map(ep => <button key={ep.no} onClick={() => openPage("Episodes")}>
              <span className="ep-number">{ep.no}</span>
              <div className="ep-info"><div><strong>{ep.title}</strong><StatusPill status={ep.status} /></div><Progress value={ep.progress} tone={ep.progress > 50 ? "sage" : ep.progress > 20 ? "gold" : "gray"} /></div>
              <b>{ep.progress}%</b><ChevronRight size={16} />
            </button>)}
          </div>
        </section>

        <aside className="panel activity-panel">
          <div className="panel-head"><div><span className="eyebrow">TEAM</span><h2>Recent activity</h2></div><button className="dots-button"><MoreHorizontal size={19} /></button></div>
          <div className="activity-list">
            {activity.map((a, i) => { const Icon = a.icon; return <div className="activity" key={i}><span className={`activity-icon ${a.tone}`}><Icon size={16} /></span><div><strong>{a.text}</strong><small>{a.meta}</small></div></div>; })}
          </div>
          <button className="full-text-button">View all activity</button>
        </aside>
      </div>

      <section className="panel continue-panel">
        <div className="panel-head"><div><span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>Continue creating</h2></div></div>
        <div className="continue-cards">
          <button onClick={() => openPage("Episodes")}><span className="continue-icon"><Clapperboard size={20} /></span><div><small>SCENE 08 · EPISODE 01</small><strong>The Observatory</strong><p>Mara decodes the first fragment of the signal.</p></div><ChevronRight size={18} /></button>
          <button onClick={() => openPage("Characters")}><span className="continue-icon portrait">MV</span><div><small>CHARACTER</small><strong>Mara Vey</strong><p>Visual profile · 3 fields need attention.</p></div><ChevronRight size={18} /></button>
          <button onClick={() => openPage("Story Bible")}><span className="continue-icon"><Sparkles size={20} /></span><div><small>LORE ENTRY</small><strong>The Fracture</strong><p>Origins, consequences, and canon rules.</p></div><ChevronRight size={18} /></button>
        </div>
      </section>
    </>
  );
}

function StoryBible() {
  const [tab, setTab] = useState("Premise");
  const tabs = ["Premise", "Themes", "Canon rules", "Lore", "Timeline"];
  return (
    <>
      <section className="page-intro compact"><div><span className="eyebrow">FOUNDATION</span><h1>Story Bible</h1><p>The canonical source of truth for the Children of Glass universe.</p></div><button className="primary-button"><Plus size={17} />New entry</button></section>
      <div className="tabs">{tabs.map(t => <button className={tab === t ? "active" : ""} onClick={() => setTab(t)} key={t}>{t}</button>)}</div>
      <section className="bible-layout">
        <article className="panel document">
          <div className="document-meta"><span>LAST EDITED 2 DAYS AGO</span><button><MoreHorizontal size={18} /></button></div>
          <h2>{tab === "Premise" ? "A city built on borrowed light" : tab}</h2>
          {tab === "Premise" ? <>
            <p className="lead">In the vertical city of Veyra, memory is both currency and law. Every citizen’s past is held inside the great Archive—safe, ordered, and owned by the Council.</p>
            <p>When signal runner Mara Vey intercepts a transmission from beyond the city’s sealed horizon, she discovers that their world is neither alone nor what its rulers claim. The message carries a memory that belongs to her: a childhood she never lived, a brother no record remembers, and a sky full of stars.</p>
            <blockquote>“What if the things we forget are the only things that make us free?”</blockquote>
            <h3>The central conflict</h3>
            <p>Mara must choose between exposing a truth that could collapse the last functioning society, or preserving the beautiful lie that keeps millions alive.</p>
          </> : <><p className="lead">This section gathers the essential {tab.toLowerCase()} that govern the series and its universe.</p><div className="empty-writing"><Sparkles size={26} /><strong>Continue building your world</strong><span>Add a rich text entry, connect an entity, or link an episode.</span><button className="outline-button"><Plus size={16} />Add entry</button></div></>}
        </article>
        <aside className="panel references"><span className="eyebrow">CONNECTED ENTITIES</span><h3>Referenced here</h3><button><span className="mini-avatar">MV</span><div><strong>Mara Vey</strong><small>Character</small></div><ChevronRight size={15} /></button><button><span className="mini-avatar location"><MapPin size={15} /></span><div><strong>Veyra</strong><small>Location</small></div><ChevronRight size={15} /></button><button><span className="mini-avatar artifact"><Boxes size={15} /></span><div><strong>The Archive</strong><small>Artifact</small></div><ChevronRight size={15} /></button></aside>
      </section>
    </>
  );
}

function Characters({ type = "Characters" }: { type?: "Characters" | "Locations" | "Assets" }) {
  const isCharacters = type === "Characters";
  const locationData = [
    { name: "Veyra", role: "Vertical City · Primary Setting", initials: "VY", color: "#6d6a5c", quote: "A city of seven rings, suspended above the veil.", status: "Active", scenes: 31 },
    { name: "The Observatory", role: "Outer Ring · Abandoned", initials: "OB", color: "#4d6570", quote: "A forgotten tower built to look at a missing sky.", status: "Active", scenes: 8 },
    { name: "The Glass Archive", role: "Crown Ring · Restricted", initials: "GA", color: "#756456", quote: "The living memory of every citizen in Veyra.", status: "Active", scenes: 13 },
    { name: "The Lower Warrens", role: "Seventh Ring · Residential", initials: "LW", color: "#5f564d", quote: "Where the city’s foundations begin to fracture.", status: "Active", scenes: 12 },
  ];
  const data = isCharacters ? characters : locationData;
  return (
    <>
      <section className="page-intro compact"><div><span className="eyebrow">{isCharacters ? "CAST & RELATIONSHIPS" : "WORLD & VIRTUAL SETS"}</span><h1>{type}</h1><p>{isCharacters ? "The people who shape your story and the connections between them." : "Reusable environments, architecture, mood, and visual direction."}</p></div><button className="primary-button"><Plus size={17} />New {isCharacters ? "character" : "location"}</button></section>
      <div className="filter-row"><div className="field-search"><Search size={16} /><input placeholder={`Search ${type.toLowerCase()}...`} /></div><button>All statuses <ChevronDown size={14} /></button><button>All roles <ChevronDown size={14} /></button><span>{data.length} of {isCharacters ? 12 : 8}</span></div>
      <section className="character-grid">{data.map(c => <article className="character-card" key={c.name}><div className="character-visual" style={{ "--card-color": c.color } as React.CSSProperties}><span>{c.initials}</span><button><MoreHorizontal size={18} /></button><i>{c.status}</i></div><div className="character-copy"><small>{c.role}</small><h2>{c.name}</h2><p>“{c.quote}”</p><div><span>{c.scenes} scenes</span><button>Open profile <ChevronRight size={14} /></button></div></div></article>)}</section>
    </>
  );
}

function Episodes() {
  const [selected, setSelected] = useState("01");
  const current = episodes.find(e => e.no === selected)!;
  return (
    <>
      <section className="page-intro compact"><div><span className="eyebrow">SEASON ONE</span><h1>Episodes</h1><p>From story arc to generation-ready clips.</p></div><button className="primary-button"><Plus size={17} />New episode</button></section>
      <div className="episode-workspace">
        <section className="panel episode-list">
          <div className="list-head"><span>4 EPISODES</span><button><MoreHorizontal size={18} /></button></div>
          {episodes.map(ep => <button className={selected === ep.no ? "selected" : ""} onClick={() => setSelected(ep.no)} key={ep.no}><span>{ep.no}</span><div><strong>{ep.title}</strong><small>{ep.scenes} scenes · {ep.clips} clips</small></div><StatusPill status={ep.status} /></button>)}
        </section>
        <section className="panel episode-detail">
          <div className="episode-hero"><div><span className="eyebrow">EPISODE {current.no}</span><h2>{current.title}</h2><p>{current.synopsis}</p></div><button className="dots-button"><MoreHorizontal size={19} /></button></div>
          <div className="episode-facts"><div><span>Status</span><StatusPill status={current.status} /></div><div><span>Est. runtime</span><strong>{current.runtime}</strong></div><div><span>Scenes</span><strong>{current.scenes}</strong></div><div><span>Clips</span><strong>{current.clips}</strong></div></div>
          <div className="episode-completion"><div><span>Episode completion</span><b>{current.progress}%</b></div><Progress value={current.progress} tone="sage" /></div>
          <div className="acts-head"><div><span className="eyebrow">STRUCTURE</span><h3>Acts & scenes</h3></div><button className="outline-button"><Plus size={15} />Add scene</button></div>
          {["Act I · The ordinary lie", "Act II · The signal", "Act III · Beyond the veil"].map((act, i) => <div className="act-row" key={act}><ChevronDown size={16} /><span className="act-index">0{i + 1}</span><div><strong>{act}</strong><small>{i === 0 ? "6 scenes · 24 clips" : i === 1 ? "8 scenes · 33 clips" : "4 scenes · 17 clips"}</small></div><span className="act-time">{i === 0 ? "12:30" : i === 1 ? "18:45" : "10:20"}</span><MoreHorizontal size={17} /></div>)}
        </section>
      </div>
    </>
  );
}

function Assets() {
  return <><section className="page-intro compact"><div><span className="eyebrow">PRODUCTION LIBRARY</span><h1>Assets</h1><p>Reference images, storyboards, video, audio, and production documents.</p></div><button className="primary-button"><Plus size={17} />Upload asset</button></section><section className="panel asset-empty"><div className="asset-stack"><FolderOpen size={31} /></div><h2>Your creative library</h2><p>Upload and organize references, generated media, audio, and documents. Link every asset back to the story.</p><button className="primary-button"><Plus size={16} />Upload first asset</button></section></>;
}

function CreateModal({ close, notify }: { close: () => void; notify: () => void }) {
  const [type, setType] = useState("Clip");
  return <div className="modal-backdrop" onMouseDown={close}><div className="modal" onMouseDown={e => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">ADD TO YOUR UNIVERSE</span><h2>Create new {type.toLowerCase()}</h2></div><button onClick={close}><X size={19} /></button></div><label>Entity type</label><div className="type-picker">{["Clip", "Scene", "Character", "Location"].map(t => <button className={type === t ? "active" : ""} onClick={() => setType(t)} key={t}>{t}</button>)}</div><label>Title</label><input autoFocus placeholder={`Untitled ${type.toLowerCase()}`} /><label>Connect to episode</label><select><option>Episode 01 · The Signal Beneath</option><option>Episode 02 · Glass Memory</option><option>Episode 03 · The Hollow Crown</option></select><div className="modal-actions"><button className="outline-button" onClick={close}>Cancel</button><button className="primary-button" onClick={notify}>Create {type.toLowerCase()}</button></div></div></div>;
}

function SearchModal({ close, navigate }: { close: () => void; navigate: (p: Page) => void }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => [
    { title: "Mara Vey", meta: "Character · Protagonist", page: "Characters" as Page, icon: CircleUserRound },
    { title: "The Signal Beneath", meta: "Episode 01 · Production", page: "Episodes" as Page, icon: GalleryVerticalEnd },
    { title: "The Observatory", meta: "Location · Outer Ring", page: "Locations" as Page, icon: MapPin },
    { title: "A city built on borrowed light", meta: "Story Bible · Premise", page: "Story Bible" as Page, icon: BookOpen },
  ].filter(r => (r.title + r.meta).toLowerCase().includes(query.toLowerCase())), [query]);
  return <div className="modal-backdrop search-backdrop" onMouseDown={close}><div className="search-modal" onMouseDown={e => e.stopPropagation()}><div className="command-input"><Search size={20} /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search characters, scenes, clips, lore..." /><kbd>ESC</kbd></div><p>QUICK RESULTS</p>{results.map(r => { const Icon = r.icon; return <button key={r.title} onClick={() => { navigate(r.page); close(); }}><span><Icon size={17} /></span><div><strong>{r.title}</strong><small>{r.meta}</small></div><ChevronRight size={16} /></button>; })}<footer><span>↑↓ Navigate</span><span>↵ Open</span><span>esc Close</span></footer></div></div>;
}

export default function App() {
  const [page, setPage] = useState<Page>("Overview");
  const [sidebar, setSidebar] = useState(false);
  const [search, setSearch] = useState(false);
  const [create, setCreate] = useState(false);
  const [toast, setToast] = useState(false);
  const navigate = (p: Page) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const created = () => { setCreate(false); setToast(true); setTimeout(() => setToast(false), 2800); };
  return (
    <div className="app-shell">
      <Sidebar active={page} setActive={navigate} open={sidebar} close={() => setSidebar(false)} />
      <div className="main-shell">
        <Header page={page} onSearch={() => setSearch(true)} onMenu={() => setSidebar(true)} onCreate={() => setCreate(true)} />
        <main>
          {page === "Overview" && <Overview openPage={navigate} />}
          {page === "Story Bible" && <StoryBible />}
          {page === "Characters" && <Characters />}
          {page === "Locations" && <Characters type="Locations" />}
          {page === "Episodes" && <Episodes />}
          {page === "Assets" && <Assets />}
        </main>
      </div>
      {search && <SearchModal close={() => setSearch(false)} navigate={navigate} />}
      {create && <CreateModal close={() => setCreate(false)} notify={created} />}
      {toast && <div className="toast"><span>✓</span>Entity created successfully</div>}
    </div>
  );
}
