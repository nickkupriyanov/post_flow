import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, useParams } from "react-router-dom";

import { api } from "../api";
import { ErrorState, LoadingState } from "./States";
import { Project } from "../types";

export function WorkspaceLayout() {
  const { projectId = "" } = useParams();
  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api<Project>(`/projects/${projectId}`)
  });
  if (projectQuery.isPending) return <LoadingState />;
  if (projectQuery.isError) return <ErrorState message="Не удалось открыть проект." />;
  const navigation = [
    ["", "Обзор"],
    ["ideas", "Идеи"],
    ["posts", "Посты"],
    ["pillars", "Рубрики"],
    ["settings", "Настройки"]
  ];
  return (
    <div className="workspace">
      <header className="workspace-header">
        <div className="brand">PostFlow<span>.</span></div>
        <div className="project-pill">
          <span className="caption">Текущий проект</span>
          <strong>{projectQuery.data.name}</strong>
        </div>
      </header>
      <div className="workspace-body">
        <aside className="sidebar">
          <div className="niche">{projectQuery.data.niche}</div>
          <nav>
            {navigation.map(([route, title]) => (
              <NavLink key={title} end={!route} to={route}>{title}</NavLink>
            ))}
          </nav>
          <a className="signature" target="_blank" rel="noreferrer" href="https://deerflow.tech">Created By Deerflow</a>
        </aside>
        <main className="workspace-main">
          <Outlet context={{ project: projectQuery.data }} />
        </main>
      </div>
    </div>
  );
}

