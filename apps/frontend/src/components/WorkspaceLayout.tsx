import { useQuery } from "@tanstack/react-query";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";

import { api } from "../api";
import { ErrorState, LoadingState } from "./States";
import { Project } from "../types";

const NAV_ITEMS = [
  ["", "Обзор", "overview"],
  ["calendar", "Календарь", "calendar"],
  ["ideas", "Идеи", "ideas"],
  ["posts", "Посты", "posts"],
  ["pillars", "Рубрики", "pillars"],
  ["settings", "Настройки", "settings"]
] as const;
type NavIconName = (typeof NAV_ITEMS)[number][2];

export function WorkspaceLayout() {
  const { projectId = "" } = useParams();
  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api<Project>(`/projects/${projectId}`)
  });
  if (projectQuery.isPending) return <LoadingState />;
  if (projectQuery.isError) return <ErrorState message="Не удалось открыть проект." />;
  return (
    <div className="workspace">
      <div className="workspace-shell">
        <aside className="sidebar">
          <Link className="brand workspace-brand" to="/projects">PostFlow<span>.</span></Link>
          <p className="sidebar-label">Меню</p>
          <nav aria-label="Разделы проекта">
            {NAV_ITEMS.map(([route, title, icon]) => (
              <NavLink key={title} end={!route} to={route}><NavIcon name={icon} />{title}</NavLink>
            ))}
          </nav>
          <div className="niche"><span>Ниша проекта</span><strong>{projectQuery.data.niche}</strong></div>
          <a className="signature" target="_blank" rel="noreferrer" href="https://deerflow.tech">Created By Deerflow</a>
        </aside>
        <header className="workspace-header">
          <div className="project-pill">
            <span className="caption">Текущий проект</span>
            <strong>{projectQuery.data.name}</strong>
          </div>
          <Link className="back-to-projects" to="/projects">Все проекты</Link>
        </header>
        <main className="workspace-main">
          <Outlet context={{ project: projectQuery.data }} />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Мобильная навигация">
      {NAV_ITEMS.map(([route, title, icon]) => (
        <NavLink key={title} end={!route} to={route}>
          <NavIcon name={icon} />
          {title}
        </NavLink>
      ))}
    </nav>
  );
}

function NavIcon({ name }: { name: NavIconName }) {
  switch (name) {
    case "overview":
      return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></svg>;
    case "calendar":
      return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14v13H5zM8 4v6M16 4v6M5 11h14" /></svg>;
    case "ideas":
      return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 22h4M9 14.5c-1.8-1.1-3-3-3-5.2a6 6 0 1 1 12 0c0 2.2-1.2 4.1-3 5.2-.6.4-1 1-1 1.7h-4c0-.7-.4-1.3-1-1.7Z" /></svg>;
    case "posts":
      return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM8 9h8M8 13h6" /></svg>;
    case "pillars":
      return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M6 20V9h3v11M10.5 20V4h3v16M15 20V11h3v9" /></svg>;
    case "settings":
      return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM19 12l2-1-2-3-2 1a7 7 0 0 0-2-1l-.2-2h-3.6L11 8a7 7 0 0 0-2 1L7 8l-2 3 2 1a7 7 0 0 0 0 2l-2 1 2 3 2-1a7 7 0 0 0 2 1l.2 2h3.6l.2-2a7 7 0 0 0 2-1l2 1 2-3-2-1a7 7 0 0 0 0-2Z" /></svg>;
  }
}
