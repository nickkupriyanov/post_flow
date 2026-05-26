import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ProjectForm, ProjectValues } from "../components/ProjectForm";
import { LoadingState } from "../components/States";
import { Project } from "../types";

export function SettingsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const query = useQuery({ queryKey: ["project", projectId], queryFn: () => api<Project>(`/projects/${projectId}`) });
  const update = useMutation({
    mutationFn: (values: ProjectValues) => api<Project>(`/projects/${projectId}`, { method: "PUT", body: JSON.stringify(values) }),
    onSuccess: (project) => client.setQueryData(["project", projectId], project)
  });
  const remove = useMutation({
    mutationFn: () => api(`/projects/${projectId}`, { method: "DELETE" }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["projects"] });
      navigate("/projects");
    }
  });
  if (query.isPending) return <LoadingState />;
  return (
    <section className="settings-page">
      <p className="eyebrow">Профиль бизнеса</p><h1 className="page-title">Настройки проекта</h1>
      <div className="paper-card">
        <ProjectForm initial={query.data} onSubmit={(values) => update.mutate(values)} pending={update.isPending} submitLabel="Сохранить изменения" />
        {update.isError && <p className="form-error">Изменения не удалось сохранить.</p>}
      </div>
      <button className="danger-button" type="button" onClick={() => { remove.reset(); setDeleteOpen(true); }}>Удалить проект</button>
      <ConfirmDialog
        open={deleteOpen}
        title="Удалить проект?"
        description="Проект и весь его контент будут удалены без возможности восстановления."
        pending={remove.isPending}
        error={remove.isError ? "Не удалось удалить проект." : undefined}
        onCancel={() => { if (!remove.isPending) setDeleteOpen(false); }}
        onConfirm={() => remove.mutate()}
      />
    </section>
  );
}
