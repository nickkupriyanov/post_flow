import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Platform, Project } from "../types";

const projectSchema = z.object({
  name: z.string().min(1, "Введите название"),
  niche: z.string().min(1, "Укажите нишу"),
  business_description: z.string().min(1, "Опишите бизнес"),
  target_audience: z.string().min(1, "Опишите аудиторию"),
  content_goal: z.string().min(1, "Укажите цель"),
  tone_of_voice: z.string().min(1, "Опишите голос бренда"),
  forbidden_topics: z.string(),
  platforms: z.array(z.enum(["telegram", "instagram"])).min(1, "Выберите площадку")
});

export type ProjectValues = z.infer<typeof projectSchema>;

export function ProjectForm({
  initial,
  onSubmit,
  pending,
  submitLabel = "Создать пространство"
}: {
  initial?: Project;
  onSubmit: (values: ProjectValues) => void;
  pending?: boolean;
  submitLabel?: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: initial ?? {
      name: "",
      niche: "",
      business_description: "",
      target_audience: "",
      content_goal: "",
      tone_of_voice: "",
      forbidden_topics: "",
      platforms: ["telegram", "instagram"] as Platform[]
    }
  });
  return (
    <form className="project-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="two-column">
        <Field label="Название проекта" error={errors.name?.message}>
          <input {...register("name")} />
        </Field>
        <Field label="Ниша" error={errors.niche?.message}>
          <input {...register("niche")} />
        </Field>
      </div>
      <Field label="Описание бизнеса" error={errors.business_description?.message}>
        <textarea rows={3} {...register("business_description")} />
      </Field>
      <Field label="Целевая аудитория" error={errors.target_audience?.message}>
        <textarea rows={3} {...register("target_audience")} />
      </Field>
      <Field label="Цель контента" error={errors.content_goal?.message}>
        <input {...register("content_goal")} />
      </Field>
      <div className="two-column">
        <Field label="Tone of voice" error={errors.tone_of_voice?.message}>
          <input {...register("tone_of_voice")} />
        </Field>
        <Field label="Запрещенные темы" error={errors.forbidden_topics?.message}>
          <input {...register("forbidden_topics")} />
        </Field>
      </div>
      <fieldset className="platform-field">
        <legend>Площадки</legend>
        <label><input type="checkbox" value="telegram" {...register("platforms")} /> Telegram</label>
        <label><input type="checkbox" value="instagram" {...register("platforms")} /> Instagram</label>
        {errors.platforms && <span className="field-error">{errors.platforms.message}</span>}
      </fieldset>
      <button className="primary-button" disabled={pending} type="submit">
        {pending ? "Сохраняем..." : submitLabel}
      </button>
    </form>
  );
}

export function Field({
  label,
  error,
  children
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

