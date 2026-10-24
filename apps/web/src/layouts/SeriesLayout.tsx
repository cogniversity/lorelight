import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from "react";
import {
  Outlet,
  NavLink,
  useParams,
  useNavigate,
  Link,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Aperture,
  Bell,
  BookOpen,
  Boxes,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Clock3,
  Compass,
  FileText,
  Film,
  FolderOpen,
  GalleryVerticalEnd,
  LayoutDashboard,
  MapPin,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  UsersRound,
  X,
  CircleUserRound,
} from "lucide-react";
import { seriesApi, searchApi, Series, SearchResult } from "../api/client";
import { useAuth } from "../auth/AuthContext";

// ─── Series context ────────────────────────────────────────────────────────────
interface SeriesContextValue {
  series: Series | null;
  seriesId: string;
  allSeries: Series[];
}
const SeriesContext = createContext<SeriesContextValue>({
  series: null,
  seriesId: "",
  allSeries: [],
});
export const useSeriesContext = () => useContext(SeriesContext);

// ─── Nav structure ────────────────────────────────────────────────────────────
const NAV = [
  {
    section: "Workspace",
    items: [
      { label: "Overview", path: "overview", icon: LayoutDashboard },
      { label: "Story Bible", path: "bible", icon: BookOpen },
      { label: "Characters", path: "characters", icon: UsersRound },
      { label: "Locations", path: "locations", icon: MapPin },
    ],
  },
  {
    section: "Production",
    items: [
      { label: "Episodes", path: "episodes", icon: GalleryVerticalEnd },
      { label: "Reader", path: "reader", icon: FileText },
      { label: "Assets", path: "assets", icon: FolderOpen },
    ],
  },
  {
    section: "World",
    items: [
      { label: "Timeline", path: "timeline", icon: Clock3 },
      { label: "Artifacts", path: "artifacts", icon: Boxes },
      { label: "Organizations", path: "organizations", icon: Compass },
    ],
  },
  {
    section: "Team",
    items: [
      { label: "Members", path: "members", icon: CircleUserRound },
      { label: "Settings", path: "settings", icon: Settings },
    ],
  },
];

// ─── Search modal ─────────────────────────────────────────────────────────────
function SearchModal({
  seriesId,
  onClose,
}: {
  seriesId: string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { data: results = [], isFetching } = useQuery({
    queryKey: ["search", seriesId, query],
    queryFn: () => (query.length >= 2 ? searchApi.query(seriesId, query) : Promise.resolve([])),
    enabled: query.length >= 2,
  });

  function handleSelect(r: SearchResult) {
    onClose();
    const type = r.type?.toLowerCase();
    if (type === "clip") navigate(`/series/${seriesId}/clips/${r.id}`);
    else if (type === "scene") navigate(`/series/${seriesId}/scenes/${r.id}`);
    else if (type === "episode") navigate(`/series/${seriesId}/episodes`);
    else navigate(`/series/${seriesId}/overview`);
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop search-backdrop" onMouseDown={onClose}>
      <div className="search-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="command-input">
          <Search size={20} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search characters, scenes, clips, lore..."
          />
          <kbd>ESC</kbd>
        </div>
        <p>{query.length >= 2 ? `${results.length} RESULTS` : "TYPE TO SEARCH"}</p>
        {results.map((r) => (
          <button key={r.id} onClick={() => handleSelect(r)}>
            <span>
              {r.type === "Character" ? (
                <UsersRound size={17} />
              ) : r.type === "Scene" ? (
                <Clapperboard size={17} />
              ) : r.type === "Clip" ? (
                <Film size={17} />
              ) : (
                <FileText size={17} />
              )}
            </span>
            <div>
              <strong>{r.title}</strong>
              <small>
                {r.type} · {r.subtitle}
              </small>
            </div>
            <ChevronRight size={16} />
          </button>
        ))}
        {isFetching && (
          <div className="search-empty">Searching…</div>
        )}
        {!isFetching && query.length >= 2 && results.length === 0 && (
          <div className="search-empty">No results found</div>
        )}
        <footer>
          <span>Type to search</span>
          <span>↵ Open</span>
          <span>esc Close</span>
        </footer>
      </div>
    </div>
  );
}

// ─── Series switcher popover ──────────────────────────────────────────────────
function SeriesSwitcher({
  current,
  all,
  onClose,
}: {
  current: Series | null;
  all: Series[];
  onClose: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="popover-scrim" onClick={onClose}>
      <div className="series-switcher-popover" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow" style={{ margin: "0 0 10px", padding: "0 4px" }}>
          SWITCH SERIES
        </p>
        {all.map((s) => (
          <button
            key={s.id}
            className={s.id === current?.id ? "active" : ""}
            onClick={() => {
              onClose();
              navigate(`/series/${s.id}/overview`);
            }}
          >
            <span className="project-art">{s.name.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{s.name}</strong>
              <small>{s.premise?.slice(0, 40)}</small>
            </div>
            {s.id === current?.id && <ChevronRight size={14} />}
          </button>
        ))}
        <button
          className="new-series-btn"
          onClick={() => {
            onClose();
            navigate("/series");
          }}
        >
          <Plus size={14} />
          New series
        </button>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  seriesId,
  series,
  allSeries,
  open,
  onClose,
}: {
  seriesId: string;
  series: Series | null;
  allSeries: Series[];
  open: boolean;
  onClose: () => void;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [switcher, setSwitcher] = useState(false);

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      {open && (
        <button className="sidebar-scrim" onClick={onClose} aria-label="Close menu" />
      )}
      {switcher && (
        <SeriesSwitcher
          current={series}
          all={allSeries}
          onClose={() => setSwitcher(false)}
        />
      )}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Aperture size={21} strokeWidth={1.7} />
          </div>
          <div>
            <strong>Lorelight</strong>
            <span>STORY OS</span>
          </div>
          <button className="mobile-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <button className="project-picker" onClick={() => setSwitcher(true)}>
          <span className="project-art">
            {series ? series.name.slice(0, 2).toUpperCase() : "…"}
          </span>
          <div>
            <small>Current series</small>
            <strong>{series?.name ?? "Loading…"}</strong>
          </div>
          <ChevronDown size={15} />
        </button>

        <nav>
          {NAV.map((group) => (
            <div className="nav-group" key={group.section}>
              <p>{group.section}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={`/series/${seriesId}/${item.path}`}
                    className={({ isActive }: { isActive: boolean }) => (isActive ? "active" : "")}
                    onClick={onClose}
                  >
                    <Icon size={17} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button onClick={handleLogout}>
            <Settings size={17} />
            Sign out
          </button>
          <div className="user">
            <div className="avatar">
              {user ? initials(user.name || user.email) : "?"}
            </div>
            <div>
              <strong>{user?.name ?? user?.email ?? "You"}</strong>
              <span>{user?.role ?? "Member"}</span>
            </div>
            <MoreHorizontal size={18} />
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({
  seriesId,
  seriesName,
  pageName,
  onMenu,
  onSearch,
  onNotifications,
}: {
  seriesId: string;
  seriesName: string;
  pageName: string;
  onMenu: () => void;
  onSearch: () => void;
  onNotifications: () => void;
}) {
  return (
    <header>
      <button className="menu-button" onClick={onMenu}>
        <Menu size={20} />
      </button>
      <div className="breadcrumb">
        <Link to={`/series/${seriesId}/overview`} style={{ color: "inherit", textDecoration: "none" }}>
          {seriesName || "…"}
        </Link>
        <ChevronRight size={14} />
        <strong>{pageName}</strong>
      </div>
      <div className="header-actions">
        <button className="search-button" onClick={onSearch}>
          <Search size={16} />
          <span>Search the universe…</span>
          <kbd>⌘ K</kbd>
        </button>
        <button className="icon-button notification-button" onClick={onNotifications}>
          <Bell size={18} />
          <i />
        </button>
        <Link
          to={`/series/${seriesId}/episodes`}
          className="primary-button"
          style={{ textDecoration: "none" }}
        >
          <Plus size={17} />
          Create
        </Link>
      </div>
    </header>
  );
}

// ─── Page name from path ──────────────────────────────────────────────────────
function usePageName(): string {
  const pathMap: Record<string, string> = {
    overview: "Overview",
    bible: "Story Bible",
    characters: "Characters",
    locations: "Locations",
    artifacts: "Artifacts",
    organizations: "Organizations",
    timeline: "Timeline",
    episodes: "Episodes",
    reader: "Manuscript Reader",
    clips: "Clip Detail",
    scenes: "Scene Detail",
    assets: "Assets",
    settings: "Settings",
    members: "Members",
  };
  const segment = window.location.pathname.split("/").find((s, i, arr) => {
    const prev = arr[i - 1];
    return prev && !["series"].includes(prev) && !!s && !/^[a-f0-9-]{8,}$/.test(s);
  });
  return (segment && pathMap[segment]) || "Overview";
}

// ─── SeriesLayout ──────────────────────────────────────────────────────────────
export default function SeriesLayout() {
  const { seriesId = "" } = useParams<{ seriesId: string }>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: allSeries = [] } = useQuery({
    queryKey: ["series"],
    queryFn: seriesApi.list,
  });

  const series = allSeries.find((s) => s.id === seriesId) ?? null;
  const pageName = usePageName();

  // Keyboard shortcut ⌘K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <SeriesContext.Provider value={{ series, seriesId, allSeries }}>
      <div className="app-shell">
        <Sidebar
          seriesId={seriesId}
          series={series}
          allSeries={allSeries}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="main-shell">
          <Header
            seriesId={seriesId}
            seriesName={series?.name ?? ""}
            pageName={pageName}
            onMenu={() => setSidebarOpen(true)}
            onSearch={() => setSearchOpen(true)}
            onNotifications={() => setNotifOpen((v) => !v)}
          />
          <main>
            <Outlet />
          </main>
        </div>

        {searchOpen && (
          <SearchModal seriesId={seriesId} onClose={() => setSearchOpen(false)} />
        )}

        {notifOpen && (
          <div className="popover-scrim" onClick={() => setNotifOpen(false)}>
            <aside
              className="notification-popover"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h3>Notifications</h3>
                <button onClick={() => setNotifOpen(false)}>
                  <X size={17} />
                </button>
              </div>
              <div className="search-empty" style={{ padding: "20px 16px" }}>
                No new notifications
              </div>
            </aside>
          </div>
        )}
      </div>
    </SeriesContext.Provider>
  );
}
