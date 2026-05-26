import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { Idea, Pillar } from "../types";

export function IdeasPage() {
  const { projectId } = useParams();
  const client = useQueryClient();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [pillarId, setPillarId] = useState("");
  const ideas = useQuery({ queryKey: ["ideas", projectId], queryFn: () => api<Idea[]>(`/projects/${projectId}/ideas`) });
  const pillars = useQuery({ queryKey: ["pillars", projectId], queryFn: () => api<Pillar[]>(`/projects/${projectId}/pillars`) });
  const create = useMutation({
    mutationFn: () => api<Idea>(`/projects/${projectId}/ideas`, { method: "POST", body: JSON.stringify({ title, notes, pillar_id: pillarId ? Number(pillarId) : null }) }),
    onSuccess: () => {
      setTitle(""); setNotes(""); setPillarId("");
      client.invalidateQueries({ queryKey: ["ideas", projectId] });
      client.invalidateQueries({ queryKey: ["dashboard", projectId] });
    }
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (title.trim()) create.mutate();
  }
  return (
    <div className="split-page">
      <section>
        <p className="eyebrow">Backlog</p>
        <h1 className="page-title">Идеи</h1>
        {ideas.isPending ? <LoadingState /> : ideas.isError ? <ErrorState /> : ideas.data.length ? (
          <div className="idea-stack">
            {ideas.data.map((idea) => (
              <article className="idea-card" key={idea.id}>
                <h3>{idea.title}</h3>
                <p>{idea.notes || "Без заметок"}</p>
                <Link className="text-action" to={`../posts/new?ideaId=${idea.id}`}>Создать пост →</Link>
              </article>
            ))}
          </div>
        ) : <EmptyState title="Backlog пуст" text="Сохраните первую тему, к которой захотите вернуться." />}
      </section>
      <form className="side-form paper-card" onSubmit={submit}>
        <h2>Новая идея</h2>
        <label className="field"><span>Название идеи</span><input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
        <label className="field"><span>Заметки</span><textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <label className="field"><span>Рубрика</span><select value={pillarId} onChange={(e) => setPillarId(e.target.value)}><option value="">Без рубрики</option>{pillars.data?.map((pillar) => <option key={pillar.id} value={pillar.id}>{pillar.name}</option>)}</select></label>
        {create.isError && <p className="form-error">Идею не удалось сохранить.</p>}
        <button className="primary-button">Сохранить идею</button>
      </form>
    </div>
  );
}

