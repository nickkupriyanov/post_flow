import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../api";
import { ProjectForm, ProjectValues } from "../components/ProjectForm";
import { LoadingState } from "../components/States";
import { Project } from "../types";

export function SettingsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["project", projectId], queryFn: () => api<Project>(`/projects/${projectId}`) });
  const update = useMutation({
    mutationFn: (values: ProjectValues) => api<Project>(`/projects/${projectId}`, { method: "PUT", body: JSON.stringify(values) }),
    onSuccess: (project) => client.setQueryData(["project", projectId], project)
  });
  const remove = useMutation({ mutationFn: () => api(`/projects/${projectId}`, { method: "DELETE" }), onSuccess: () => navigate("/projects/new") });
  if (query.isPending) return <LoadingState />;
  return (
    <section className="settings-page">
      <p className="eyebrow">Профиль бизнеса</p><h1 className="page-title">Настройки проекта</h1>
      <div className="paper-card">
        <ProjectForm initial={query.data} onSubmit={(values) => update.mutate(values)} pending={update.isPending} submitLabel="Сохранить изменения" />
      </div>
      <button className="danger-button" onClick={() => remove.mutate()}>Удалить проект</button>
    </section>
  );
}

