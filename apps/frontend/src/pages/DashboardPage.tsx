import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { api } from "../api";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { Dashboard } from "../types";

function readableDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("ru", { day: "numeric", month: "long" }).format(new Date(value)) : "Без даты";
}

function countLabel(count: number, one: string, few: string, many: string) {
  const remainder100 = count % 100;
  const remainder10 = count % 10;
  if (remainder100 >= 11 && remainder100 <= 14) return many;
  if (remainder10 === 1) return one;
  if (remainder10 >= 2 && remainder10 <= 4) return few;
  return many;
}

export function DashboardPage() {
  const { projectId } = useParams();
  const query = useQuery({ queryKey: ["dashboard", projectId], queryFn: () => api<Dashboard>(`/projects/${projectId}/dashboard`) });
  if (query.isPending) return <LoadingState label="Собираем ваш обзор..." />;
  if (query.isError) return <ErrorState message="Не удалось получить обзор проекта." />;
  const { scheduled_posts, draft_posts, ideas_without_posts } = query.data;
  const upcomingPosts = scheduled_posts.filter((post) => post.status === "scheduled").sort((a, b) => {
    if (!a.scheduled_at) return 1;
    if (!b.scheduled_at) return -1;
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
  });
  return (
    <section className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-kicker">Контент-студия</p>
          <h1>План публикаций</h1>
          <p className="dashboard-description">Собирайте идеи и спокойно ведите материалы к публикации.</p>
        </div>
        <Link className="secondary-button dashboard-settings" to="settings">Настроить проект</Link>
      </header>
      <section className="featured-card">
        <div className="featured-copy">
          <p className="label">Контент в работе</p>
          <h2>{upcomingPosts.length ? `Запланировано ${upcomingPosts.length} ${countLabel(upcomingPosts.length, "публикация", "публикации", "публикаций")}` : "Новых публикаций пока нет"}</h2>
          <p>
            {draft_posts.length} {countLabel(draft_posts.length, "черновик", "черновика", "черновиков")} {draft_posts.length === 1 ? "готовится" : "готовятся"}, {ideas_without_posts.length} {countLabel(ideas_without_posts.length, "идея", "идеи", "идей")} {ideas_without_posts.length === 1 ? "ждет" : "ждут"} воплощения.
          </p>
          <div className="featured-actions">
            <Link className="primary-button" to="ideas">Создать идею</Link>
            <Link className="secondary-button" to="posts/new">Новый пост</Link>
          </div>
        </div>
        <div className="featured-decoration" aria-hidden="true">
          <span className="decor-page" />
          <span className="decor-leaf leaf-one" />
          <span className="decor-leaf leaf-two" />
          <span className="decor-pot" />
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="dashboard-panel upcoming-panel">
          <SectionHeading title="Ближайшие публикации" link="posts" />
          {upcomingPosts.length ? (
            <div className="card-grid">
            {upcomingPosts.map((post) => (
              <Link to={`posts/${post.id}`} className="publication-card" key={post.id}>
                <div className="pub-date">{readableDate(post.scheduled_at)} · {post.platform}</div>
                <h3>{post.title}</h3>
                <span className={`badge ${post.status}`}>{post.status}</span>
              </Link>
            ))}
            </div>
          ) : <EmptyState title="Нет запланированных публикаций" text="Назначьте дату готовому черновику, и он появится здесь." />}
        </section>
        <CompactSection title="Черновики" link="posts" count={draft_posts.length}>
            {draft_posts.length ? draft_posts.map((post) => (
              <CompactItem key={post.id} title={post.title} meta={post.platform} />
            )) : <p className="muted">Нет активных черновиков.</p>}
        </CompactSection>
        <CompactSection title="Идеи без постов" link="ideas" count={ideas_without_posts.length}>
            {ideas_without_posts.length ? ideas_without_posts.map((idea) => (
              <CompactItem key={idea.id} title={idea.title} action={<Link to={`posts/new?ideaId=${idea.id}`}>Создать пост</Link>} />
            )) : <p className="muted">Каждая идея уже получила пост.</p>}
        </CompactSection>
      </div>
    </section>
  );
}

function SectionHeading({ title, link }: { title: string; link: string }) {
  return <div className="section-heading"><h2>{title}</h2><Link to={link}>Все &rarr;</Link></div>;
}

function CompactSection({ title, link, count, children }: { title: string; link: string; count: number; children: React.ReactNode }) {
  return (
    <section className="compact-list-section dashboard-panel">
      <div className="compact-list-header">
        <h3>{title}</h3>
        <Link className="compact-list-counter" to={link}>{count}</Link>
      </div>
      {children}
    </section>
  );
}

function CompactItem({ title, meta, action }: { title: string; meta?: string; action?: React.ReactNode }) {
  return (
    <div className="compact-list-item">
      <span>{title}</span>
      <span className="item-meta">{meta}</span>
      {action}
    </div>
  );
}
