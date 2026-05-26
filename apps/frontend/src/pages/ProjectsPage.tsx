import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { api } from "../api";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { Project } from "../types";

export function ProjectsPage() {
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => api<Project[]>("/projects") });
  return (
    <div className="library-page">
      <header className="standalone-header library-header">
        <div className="brand">PostFlow<span>.</span></div>
        <Link className="primary-button link-button" to="/projects/new">+ Новый проект</Link>
      </header>
      <section className="library-content">
        <p className="eyebrow">Ваши пространства</p>
        <h1>С чего начнем сегодня?</h1>
        {projects.isPending ? <LoadingState /> : projects.isError ? <ErrorState message="Не удалось загрузить проекты." /> : projects.data.length ? (
          <div className="project-gallery">
            {projects.data.map((project) => (
              <article className="project-card" key={project.id}>
                <p>{project.niche}</p>
                <h2>{project.name}</h2>
                <div className="platform-tags">{project.platforms.map((platform) => <span key={platform}>{platform}</span>)}</div>
                <Link aria-label={`Открыть проект ${project.name}`} to={`/projects/${project.id}`}>Открыть проект →</Link>
              </article>
            ))}
          </div>
        ) : <EmptyState title="Пока нет проектов" text="Создайте первое контентное пространство и зафиксируйте голос бизнеса." />}
      </section>
    </div>
  );
}

