import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { api } from "../api";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { Dashboard } from "../types";

function readableDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("ru", { day: "numeric", month: "long" }).format(new Date(value)) : "Без даты";
}

export function DashboardPage() {
  const { projectId } = useParams();
  const query = useQuery({ queryKey: ["dashboard", projectId], queryFn: () => api<Dashboard>(`/projects/${projectId}/dashboard`) });
  if (query.isPending) return <LoadingState label="Собираем ваш обзор..." />;
  if (query.isError) return <ErrorState message="Не удалось получить обзор проекта." />;
  const { scheduled_posts, draft_posts, ideas_without_posts } = query.data;
  return (
    <>
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Сегодня в студии</p>
          <h1>Создайте следующую историю</h1>
          <p>
            {ideas_without_posts.length
              ? `${ideas_without_posts.length} идей ждут превращения в публикации.`
              : "План собран. Добавьте новую идею, когда появится вдохновение."}
          </p>
        </div>
        <Link className="light-button" to="ideas">+ Новая идея</Link>
      </section>
      <SectionHeading title="Ближайшие публикации" link="posts" />
      {scheduled_posts.length ? (
        <div className="card-grid">
          {scheduled_posts.map((post) => (
            <article className="publication-card" key={post.id}>
              <p>{readableDate(post.scheduled_at)} · {post.platform}</p>
              <h3>{post.title}</h3>
              <span className={`badge ${post.status}`}>{post.status}</span>
            </article>
          ))}
        </div>
      ) : <EmptyState title="Публикаций пока нет" text="Назначьте дату готовому черновику, и он появится здесь." />}
      <div className="dashboard-columns">
        <section>
          <SectionHeading title="Черновики" link="posts" />
          {draft_posts.length ? draft_posts.map((post) => <article className="line-card" key={post.id}>{post.title}<span>{post.platform}</span></article>) : <p className="muted">Нет активных черновиков.</p>}
        </section>
        <section>
          <SectionHeading title="Идеи без постов" link="ideas" />
          {ideas_without_posts.length ? ideas_without_posts.map((idea) => <article className="line-card" key={idea.id}>{idea.title}<Link to={`posts/new?ideaId=${idea.id}`}>Создать пост</Link></article>) : <p className="muted">Каждая идея уже получила пост.</p>}
        </section>
      </div>
    </>
  );
}

function SectionHeading({ title, link }: { title: string; link: string }) {
  return <div className="section-heading"><h2>{title}</h2><Link to={link}>Все →</Link></div>;
}
