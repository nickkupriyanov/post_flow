import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { api } from "../api";
import { ProjectForm, ProjectValues } from "../components/ProjectForm";
import { Project } from "../types";

export function OnboardingPage() {
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: (values: ProjectValues) => api<Project>("/projects", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: (project) => navigate(`/projects/${project.id}`)
  });
  return (
    <div className="onboarding-page">
      <header className="standalone-header"><div className="brand">PostFlow<span>.</span></div></header>
      <div className="onboarding-grid">
        <div className="onboarding-copy">
          <p className="eyebrow">Новый проект</p>
          <h1>Расскажите о своем голосе.</h1>
          <p>Профиль станет основой вашего контентного пространства и будущих AI-инструментов.</p>
        </div>
        <div className="paper-card">
          <ProjectForm onSubmit={(values) => mutation.mutate(values)} pending={mutation.isPending} />
          {mutation.isError && <p className="form-error">Не удалось создать проект.</p>}
        </div>
      </div>
    </div>
  );
}

