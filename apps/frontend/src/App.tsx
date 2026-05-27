import { useQuery } from "@tanstack/react-query";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { api, TOKEN_KEY } from "./api";
import { LoadingState } from "./components/States";
import { WorkspaceLayout } from "./components/WorkspaceLayout";
import { User } from "./types";
import { AuthPage } from "./pages/AuthPages";
import { CalendarPage } from "./pages/CalendarPage";
import { DashboardPage } from "./pages/DashboardPage";
import { IdeasPage } from "./pages/IdeasPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { PillarsPage } from "./pages/PillarsPage";
import { PostEditorPage, PostsPage } from "./pages/PostsPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { SettingsPage } from "./pages/SettingsPage";

function Protected({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = localStorage.getItem(TOKEN_KEY);
  const user = useQuery({
    queryKey: ["me", token],
    queryFn: () => api<User>("/auth/me"),
    enabled: Boolean(token),
    retry: false
  });
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.isPending) return <LoadingState />;
  if (user.isError) {
    localStorage.removeItem(TOKEN_KEY);
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/projects" element={<Protected><ProjectsPage /></Protected>} />
      <Route path="/projects/new" element={<Protected><OnboardingPage /></Protected>} />
      <Route path="/projects/:projectId" element={<Protected><WorkspaceLayout /></Protected>}>
        <Route index element={<DashboardPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="ideas" element={<IdeasPage />} />
        <Route path="posts" element={<PostsPage />} />
        <Route path="posts/new" element={<PostEditorPage />} />
        <Route path="posts/:postId" element={<PostEditorPage />} />
        <Route path="pillars" element={<PillarsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to={localStorage.getItem(TOKEN_KEY) ? "/projects" : "/login"} replace />} />
    </Routes>
  );
}
