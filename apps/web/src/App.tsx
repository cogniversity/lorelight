import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { ReactNode } from "react";

// Pages
import LoginPage from "./pages/LoginPage";
import SeriesListPage from "./pages/SeriesListPage";
import OverviewPage from "./pages/OverviewPage";
import BiblePage from "./pages/BiblePage";
import WorldPage from "./pages/WorldPage";
import EpisodesPage from "./pages/EpisodesPage";
import ManuscriptReaderPage from "./pages/ManuscriptReaderPage";
import EpisodeReaderPage from "./pages/EpisodeReaderPage";
import SceneReaderPage from "./pages/SceneReaderPage";
import ClipDetailPage from "./pages/ClipDetailPage";
import SceneDetailPage from "./pages/SceneDetailPage";
import AssetsPage from "./pages/AssetsPage";
import SettingsPage from "./pages/SettingsPage";
import MembersPage from "./pages/MembersPage";
import DraftManuscriptPage from "./pages/DraftManuscriptPage";
import SeriesLayout from "./layouts/SeriesLayout";

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="auth-loading"><div className="auth-spinner" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Series list */}
      <Route
        path="/series"
        element={
          <RequireAuth>
            <SeriesListPage />
          </RequireAuth>
        }
      />

      {/* Series workspace */}
      <Route
        path="/series/:seriesId"
        element={
          <RequireAuth>
            <SeriesLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="bible" element={<BiblePage />} />
        <Route path="characters" element={<WorldPage entityType="CHARACTER" />} />
        <Route path="locations" element={<WorldPage entityType="LOCATION" />} />
        <Route path="artifacts" element={<WorldPage entityType="ARTIFACT" />} />
        <Route path="organizations" element={<WorldPage entityType="ORGANIZATION" />} />
        <Route path="timeline" element={<WorldPage entityType="TIMELINE_EVENT" />} />
        <Route path="episodes" element={<EpisodesPage />} />
        <Route path="draft" element={<DraftManuscriptPage />} />
        <Route path="reader" element={<ManuscriptReaderPage />} />
        <Route path="reader/:episodeId" element={<EpisodeReaderPage />} />
        <Route path="reader/:episodeId/scenes/:sceneId" element={<SceneReaderPage />} />
        <Route path="clips/:clipId" element={<ClipDetailPage />} />
        <Route path="scenes/:sceneId" element={<SceneDetailPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="members" element={<MembersPage />} />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/series" replace />} />
      <Route path="*" element={<Navigate to="/series" replace />} />
    </Routes>
  );
}
