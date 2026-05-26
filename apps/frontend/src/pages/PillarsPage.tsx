import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { useParams } from "react-router-dom";

import { api } from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { Pillar } from "../types";

export function PillarsPage() {
  const { projectId } = useParams();
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingPillar, setEditingPillar] = useState<Pillar | null>(null);
  const [deletingPillar, setDeletingPillar] = useState<Pillar | null>(null);
  const query = useQuery({ queryKey: ["pillars", projectId], queryFn: () => api<Pillar[]>(`/projects/${projectId}/pillars`) });
  const save = useMutation({
    mutationFn: ({ pillarId, payload }: { pillarId?: number; payload: { name: string; description: string } }) => api(
      `/projects/${projectId}/pillars${pillarId ? `/${pillarId}` : ""}`,
      { method: pillarId ? "PUT" : "POST", body: JSON.stringify(payload) }
    ),
    onSuccess: () => {
      resetForm();
      client.invalidateQueries({ queryKey: ["pillars", projectId] });
    }
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/projects/${projectId}/pillars/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      if (editingPillar?.id === id) resetForm();
      setDeletingPillar(null);
      client.invalidateQueries({ queryKey: ["pillars", projectId] });
      client.invalidateQueries({ queryKey: ["ideas", projectId] });
      client.invalidateQueries({ queryKey: ["dashboard", projectId] });
    }
  });
  function resetForm() {
    setName("");
    setDescription("");
    setEditingPillar(null);
    save.reset();
  }
  function edit(pillar: Pillar) {
    setEditingPillar(pillar);
    setName(pillar.name);
    setDescription(pillar.description);
    save.reset();
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (name.trim()) save.mutate({ pillarId: editingPillar?.id, payload: { name, description } });
  }
  return (
    <>
      <div className="split-page">
        <section>
          <p className="eyebrow">Темы</p><h1 className="page-title">Рубрики</h1>
          {query.isPending ? <LoadingState /> : query.isError ? <ErrorState /> : query.data.length ? query.data.map((pillar) => (
            <article className="pillar-card" key={pillar.id}>
              <div><h3>{pillar.name}</h3><p>{pillar.description}</p></div>
              <div className="card-actions">
                <button className="quiet-button" type="button" aria-label={`Редактировать рубрику ${pillar.name}`} onClick={() => edit(pillar)}>Редактировать</button>
                <button className="quiet-button danger-text" type="button" aria-label={`Удалить рубрику ${pillar.name}`} onClick={() => { remove.reset(); setDeletingPillar(pillar); }}>Удалить</button>
              </div>
            </article>
          )) : <EmptyState title="Рубрик пока нет" text="Определите направления, которые хочется развивать регулярно." />}
        </section>
        <form className="side-form paper-card" onSubmit={submit}>
          <h2>{editingPillar ? "Редактировать рубрику" : "Новая рубрика"}</h2>
          <label className="field"><span>Название</span><input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <label className="field"><span>Описание</span><textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
          {save.isError && <p className="form-error">Рубрику не удалось сохранить.</p>}
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={save.isPending}>{editingPillar ? "Сохранить изменения" : "Сохранить рубрику"}</button>
            {editingPillar ? <button className="secondary-button" type="button" disabled={save.isPending} onClick={resetForm}>Отмена</button> : null}
          </div>
        </form>
      </div>
      <ConfirmDialog
        open={Boolean(deletingPillar)}
        title="Удалить рубрику?"
        description="Рубрика будет удалена, но существующие идеи сохранятся без привязки к рубрике."
        pending={remove.isPending}
        error={remove.isError ? "Не удалось удалить рубрику." : undefined}
        onCancel={() => { if (!remove.isPending) setDeletingPillar(null); }}
        onConfirm={() => deletingPillar && remove.mutate(deletingPillar.id)}
      />
    </>
  );
}
