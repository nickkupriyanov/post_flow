import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { useParams } from "react-router-dom";

import { api } from "../api";
import { EmptyState, LoadingState } from "../components/States";
import { Pillar } from "../types";

export function PillarsPage() {
  const { projectId } = useParams();
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const query = useQuery({ queryKey: ["pillars", projectId], queryFn: () => api<Pillar[]>(`/projects/${projectId}/pillars`) });
  const create = useMutation({
    mutationFn: () => api(`/projects/${projectId}/pillars`, { method: "POST", body: JSON.stringify({ name, description }) }),
    onSuccess: () => { setName(""); setDescription(""); client.invalidateQueries({ queryKey: ["pillars", projectId] }); }
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/projects/${projectId}/pillars/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["pillars", projectId] })
  });
  function submit(event: FormEvent) { event.preventDefault(); if (name) create.mutate(); }
  return (
    <div className="split-page">
      <section>
        <p className="eyebrow">Темы</p><h1 className="page-title">Рубрики</h1>
        {query.isPending ? <LoadingState /> : query.data?.length ? query.data.map((pillar) => (
          <article className="pillar-card" key={pillar.id}><div><h3>{pillar.name}</h3><p>{pillar.description}</p></div><button className="quiet-button" onClick={() => remove.mutate(pillar.id)}>Удалить</button></article>
        )) : <EmptyState title="Рубрик пока нет" text="Определите направления, которые хочется развивать регулярно." />}
      </section>
      <form className="side-form paper-card" onSubmit={submit}>
        <h2>Новая рубрика</h2>
        <label className="field"><span>Название</span><input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label className="field"><span>Описание</span><textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <button className="primary-button">Сохранить рубрику</button>
      </form>
    </div>
  );
}

