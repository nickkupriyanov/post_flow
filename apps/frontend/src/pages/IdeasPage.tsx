import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { Idea, Pillar } from "../types";

export function IdeasPage() {
  const { projectId } = useParams();
  const client = useQueryClient();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [pillarId, setPillarId] = useState("");
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [deletingIdea, setDeletingIdea] = useState<Idea | null>(null);
  const ideas = useQuery({ queryKey: ["ideas", projectId], queryFn: () => api<Idea[]>(`/projects/${projectId}/ideas`) });
  const pillars = useQuery({ queryKey: ["pillars", projectId], queryFn: () => api<Pillar[]>(`/projects/${projectId}/pillars`) });
  const save = useMutation({
    mutationFn: ({ ideaId, payload }: { ideaId?: number; payload: { title: string; notes: string; pillar_id: number | null } }) => api<Idea>(
      `/projects/${projectId}/ideas${ideaId ? `/${ideaId}` : ""}`,
      { method: ideaId ? "PUT" : "POST", body: JSON.stringify(payload) }
    ),
    onSuccess: () => {
      resetForm();
      client.invalidateQueries({ queryKey: ["ideas", projectId] });
      client.invalidateQueries({ queryKey: ["dashboard", projectId] });
    }
  });
  const remove = useMutation({
    mutationFn: (id: number) => api<void>(`/projects/${projectId}/ideas/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      if (editingIdea?.id === id) resetForm();
      setDeletingIdea(null);
      client.invalidateQueries({ queryKey: ["ideas", projectId] });
      client.invalidateQueries({ queryKey: ["posts", projectId] });
      client.invalidateQueries({ queryKey: ["dashboard", projectId] });
    }
  });
  function resetForm() {
    setTitle("");
    setNotes("");
    setPillarId("");
    setEditingIdea(null);
    save.reset();
  }
  function edit(idea: Idea) {
    setEditingIdea(idea);
    setTitle(idea.title);
    setNotes(idea.notes);
    setPillarId(idea.pillar_id ? String(idea.pillar_id) : "");
    save.reset();
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (title.trim()) save.mutate({
      ideaId: editingIdea?.id,
      payload: { title, notes, pillar_id: pillarId ? Number(pillarId) : null }
    });
  }
  return (
    <>
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
                  <div className="card-actions">
                    <Link className="text-action" to={`../posts/new?ideaId=${idea.id}`}>Создать пост →</Link>
                    <button className="quiet-button" type="button" aria-label={`Редактировать идею ${idea.title}`} onClick={() => edit(idea)}>Редактировать</button>
                    <button className="quiet-button danger-text" type="button" aria-label={`Удалить идею ${idea.title}`} onClick={() => { remove.reset(); setDeletingIdea(idea); }}>Удалить</button>
                  </div>
                </article>
              ))}
            </div>
          ) : <EmptyState title="Backlog пуст" text="Сохраните первую тему, к которой захотите вернуться." />}
        </section>
        <form className="side-form paper-card" onSubmit={submit}>
          <h2>{editingIdea ? "Редактировать идею" : "Новая идея"}</h2>
          <label className="field"><span>Название идеи</span><input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
          <label className="field"><span>Заметки</span><textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          <label className="field"><span>Рубрика</span><select value={pillarId} onChange={(e) => setPillarId(e.target.value)}><option value="">Без рубрики</option>{pillars.data?.map((pillar) => <option key={pillar.id} value={pillar.id}>{pillar.name}</option>)}</select></label>
          {save.isError && <p className="form-error">Идею не удалось сохранить.</p>}
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={save.isPending}>{editingIdea ? "Сохранить изменения" : "Сохранить идею"}</button>
            {editingIdea ? <button className="secondary-button" type="button" disabled={save.isPending} onClick={resetForm}>Отмена</button> : null}
          </div>
        </form>
      </div>
      <ConfirmDialog
        open={Boolean(deletingIdea)}
        title="Удалить идею?"
        description="Идея будет удалена без возможности восстановления. Все связанные посты также будут удалены."
        pending={remove.isPending}
        error={remove.isError ? "Не удалось удалить идею." : undefined}
        onCancel={() => { if (!remove.isPending) setDeletingIdea(null); }}
        onConfirm={() => deletingIdea && remove.mutate(deletingIdea.id)}
      />
    </>
  );
}
