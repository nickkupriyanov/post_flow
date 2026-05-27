import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, ApiError } from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { GeneratedIdeaDraft, GeneratedIdeas, Idea, Pillar } from "../types";

export function IdeasPage() {
  const { projectId } = useParams();
  const client = useQueryClient();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [pillarId, setPillarId] = useState("");
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [deletingIdea, setDeletingIdea] = useState<Idea | null>(null);
  const [generationPillarId, setGenerationPillarId] = useState("");
  const [generatedIdeas, setGeneratedIdeas] = useState<GeneratedIdeaDraft[]>([]);
  const [selectedGenerated, setSelectedGenerated] = useState<number[]>([]);
  const [previewPillarId, setPreviewPillarId] = useState<number | null>(null);
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
  const generate = useMutation({
    mutationFn: (requestedPillarId: number | null) => api<GeneratedIdeas>(`/projects/${projectId}/ideas/generate`, {
      method: "POST",
      body: JSON.stringify({ pillar_id: requestedPillarId })
    }),
    onSuccess: (response, requestedPillarId) => {
      setGeneratedIdeas(response.ideas);
      setSelectedGenerated(response.ideas.map((_, index) => index));
      setPreviewPillarId(requestedPillarId);
    }
  });
  const saveGenerated = useMutation({
    mutationFn: () => api<Idea[]>(`/projects/${projectId}/ideas/bulk`, {
      method: "POST",
      body: JSON.stringify({
        ideas: selectedGenerated.map((index) => ({
          ...generatedIdeas[index],
          pillar_id: previewPillarId
        }))
      })
    }),
    onSuccess: () => {
      setGeneratedIdeas([]);
      setSelectedGenerated([]);
      setPreviewPillarId(null);
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
  function requestIdeas() {
    generate.reset();
    saveGenerated.reset();
    generate.mutate(generationPillarId ? Number(generationPillarId) : null);
  }
  function toggleGenerated(index: number) {
    setSelectedGenerated((selected) => (
      selected.includes(index) ? selected.filter((candidate) => candidate !== index) : [...selected, index]
    ));
  }
  const generationError = generate.error instanceof ApiError && generate.error.status === 503
    ? "AI не настроен для этого проекта."
    : "Не удалось получить AI-идеи. Попробуйте снова.";
  return (
    <>
      <div className="split-page">
        <section>
          <p className="eyebrow">Backlog</p>
          <h1 className="page-title">Идеи</h1>
          <section className="ai-ideas-panel" aria-label="AI-предложения идей">
            <div className="ai-ideas-header">
              <div>
                <p className="dashboard-kicker">AI-помощник</p>
                <h2>Найти новые темы</h2>
              </div>
              <button className="secondary-button" type="button" disabled={generate.isPending} onClick={requestIdeas}>
                {generate.isPending ? "Ищем идеи..." : "Предложить идеи с AI"}
              </button>
            </div>
            <label className="field ai-context">
              <span>Контекст генерации</span>
              <select value={generationPillarId} onChange={(event) => setGenerationPillarId(event.target.value)}>
                <option value="">Весь проект</option>
                {pillars.data?.map((pillar) => <option key={pillar.id} value={pillar.id}>{pillar.name}</option>)}
              </select>
            </label>
            {generate.isError && <p className="form-error">{generationError}</p>}
            {generatedIdeas.length ? (
              <>
                <div className="ai-suggestions">
                  {generatedIdeas.map((idea, index) => (
                    <label className="ai-suggestion" key={`${idea.title}-${index}`}>
                      <input
                        type="checkbox"
                        checked={selectedGenerated.includes(index)}
                        aria-label={`Выбрать идею ${idea.title}`}
                        onChange={() => toggleGenerated(index)}
                      />
                      <span>
                        <strong>{idea.title}</strong>
                        <small>{idea.notes || "Без заметок"}</small>
                      </span>
                    </label>
                  ))}
                </div>
                {saveGenerated.isError && <p className="form-error">Не удалось сохранить выбранные идеи.</p>}
                <button
                  className="primary-button"
                  type="button"
                  disabled={!selectedGenerated.length || saveGenerated.isPending}
                  onClick={() => saveGenerated.mutate()}
                >
                  {saveGenerated.isPending ? "Сохраняем..." : "Сохранить выбранные"}
                </button>
              </>
            ) : null}
          </section>
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
