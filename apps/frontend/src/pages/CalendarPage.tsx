import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { api } from "../api";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { Post } from "../types";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const monthFormatter = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });

function firstDayOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function sameDay(left: Date, right: Date) {
  return dateKey(left) === dateKey(right);
}

function calendarDays(month: Date) {
  const offset = (month.getDay() + 6) % 7;
  const firstCell = new Date(month.getFullYear(), month.getMonth(), 1 - offset);
  return Array.from({ length: 42 }, (_, index) => (
    new Date(firstCell.getFullYear(), firstCell.getMonth(), firstCell.getDate() + index)
  ));
}

export function CalendarPage() {
  const { projectId } = useParams();
  const [visibleMonth, setVisibleMonth] = useState(() => firstDayOfMonth(new Date()));
  const posts = useQuery({ queryKey: ["posts", projectId], queryFn: () => api<Post[]>(`/projects/${projectId}/posts`) });
  const days = useMemo(() => calendarDays(visibleMonth), [visibleMonth]);
  const datedPosts = useMemo(() => {
    const byDate = new Map<string, Post[]>();
    for (const post of posts.data ?? []) {
      if (!post.scheduled_at || (post.status !== "scheduled" && post.status !== "published")) continue;
      const key = dateKey(new Date(post.scheduled_at));
      const items = byDate.get(key) ?? [];
      items.push(post);
      byDate.set(key, items);
    }
    for (const items of byDate.values()) {
      items.sort((left, right) => new Date(left.scheduled_at!).getTime() - new Date(right.scheduled_at!).getTime());
    }
    return byDate;
  }, [posts.data]);
  const drafts = (posts.data ?? []).filter((post) => post.status === "draft" && !post.scheduled_at);
  const today = new Date();

  return (
    <section className="calendar-page">
      <header className="calendar-header">
        <div>
          <p className="dashboard-kicker">Редакционный ритм</p>
          <h1 className="page-title">Календарь</h1>
          <p className="calendar-description">План и история публикаций в одной спокойной ленте месяца.</p>
        </div>
        <div className="calendar-controls" aria-label="Выбор месяца">
          <button type="button" className="calendar-nav" aria-label="Предыдущий месяц" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}>&larr;</button>
          <button type="button" className="secondary-button" onClick={() => setVisibleMonth(firstDayOfMonth(new Date()))}>Сегодня</button>
          <button type="button" className="calendar-nav" aria-label="Следующий месяц" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}>&rarr;</button>
        </div>
      </header>
      {posts.isPending ? <LoadingState label="Открываем календарь..." /> : posts.isError ? <ErrorState message="Не удалось загрузить календарь." /> : (
        <div className="calendar-layout">
          <section className="calendar-board" aria-label={monthFormatter.format(visibleMonth)}>
            <div className="calendar-board-header">
              <h2>{monthFormatter.format(visibleMonth)}</h2>
              <div className="calendar-legend">
                <span className="scheduled">В плане</span>
                <span className="published">Опубликовано</span>
              </div>
            </div>
            <div className="calendar-scroll">
              <div className="calendar-weekdays">
                {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="calendar-grid">
                {days.map((day) => {
                  const dayPosts = datedPosts.get(dateKey(day)) ?? [];
                  return (
                    <article className={`calendar-day ${day.getMonth() !== visibleMonth.getMonth() ? "outside" : ""} ${sameDay(day, today) ? "today" : ""}`} key={dateKey(day)}>
                      <span className="calendar-date">{day.getDate()}</span>
                      <div className="calendar-events">
                        {dayPosts.map((post) => (
                          <Link className={`calendar-event ${post.status}`} to={`../posts/${post.id}`} key={post.id}>
                            <time>{timeFormatter.format(new Date(post.scheduled_at!))}</time>
                            <strong>{post.title}</strong>
                            <span>{post.platform}</span>
                          </Link>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
          <section className="calendar-drafts">
            <div className="calendar-drafts-header">
              <div>
                <p className="dashboard-kicker">Без даты</p>
                <h2>Черновики</h2>
              </div>
              <span>{drafts.length}</span>
            </div>
            {drafts.length ? drafts.map((draft) => (
              <Link className="calendar-draft" to={`../posts/${draft.id}`} key={draft.id}>
                <strong>{draft.title}</strong>
                <span>{draft.platform} · Назначить дату</span>
              </Link>
            )) : <EmptyState title="Все распределено" text="Новых черновиков без даты пока нет." />}
          </section>
        </div>
      )}
    </section>
  );
}
