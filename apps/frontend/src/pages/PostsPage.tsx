import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";

import { api } from "../api";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Field } from "../components/ProjectForm";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { Idea, Platform, Post, PostStatus } from "../types";

export function PostsPage() {
  const { projectId } = useParams();
  const [params, setParams] = useSearchParams();
  const posts = useQuery({ queryKey: ["posts", projectId], queryFn: () => api<Post[]>(`/projects/${projectId}/posts`) });
  const status = params.get("status") ?? "";
  const platform = params.get("platform") ?? "";
  const filtered = posts.data?.filter((post) => (!status || post.status === status) && (!platform || post.platform === platform)) ?? [];
  return (
    <>
      <div className="page-header">
        <div><p className="eyebrow">Публикации</p><h1 className="page-title">Посты</h1></div>
        <Link className="primary-button link-button" to="new">+ Новый пост</Link>
      </div>
      <div className="filters">
        <select aria-label="Фильтр по статусу" value={status} onChange={(e) => { params.set("status", e.target.value); if (!e.target.value) params.delete("status"); setParams(params); }}>
          <option value="">Все статусы</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option>
        </select>
        <select aria-label="Фильтр по платформе" value={platform} onChange={(e) => { params.set("platform", e.target.value); if (!e.target.value) params.delete("platform"); setParams(params); }}>
          <option value="">Все площадки</option><option value="telegram">Telegram</option><option value="instagram">Instagram</option>
        </select>
      </div>
      {posts.isPending ? <LoadingState /> : posts.isError ? <ErrorState /> : filtered.length ? (
        <div className="post-list">
          {filtered.map((post) => (
            <Link to={`${post.id}`} className="post-row" key={post.id}>
              <div><h3>{post.title}</h3><p>{post.platform}{post.scheduled_at ? ` · ${new Date(post.scheduled_at).toLocaleDateString("ru")}` : ""}</p></div>
              <span className={`badge ${post.status}`}>{post.status}</span>
            </Link>
          ))}
        </div>
      ) : <EmptyState title="Постов не найдено" text="Создайте пост из идеи или измените фильтры." />}
    </>
  );
}

const postSchema = z.object({
  idea_id: z.coerce.number().min(1, "Выберите идею"),
  platform: z.enum(["telegram", "instagram"]),
  title: z.string().min(1, "Добавьте заголовок"),
  body: z.string().min(1, "Добавьте текст"),
  cta: z.string(),
  status: z.enum(["draft", "scheduled", "published"]),
  scheduled_at: z.string()
}).superRefine((values, context) => {
  if (values.status !== "draft" && !values.scheduled_at) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduled_at"], message: "Укажите дату публикации" });
  }
});
type PostValues = z.infer<typeof postSchema>;

export function PostEditorPage() {
  const { projectId, postId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ideas = useQuery({ queryKey: ["ideas", projectId], queryFn: () => api<Idea[]>(`/projects/${projectId}/ideas`) });
  const existing = useQuery({
    queryKey: ["post", projectId, postId],
    queryFn: () => api<Post & { body: string; cta: string; idea_id: number }>(`/projects/${projectId}/posts/${postId}`),
    enabled: Boolean(postId)
  });
  if (postId && existing.isPending) return <LoadingState />;
  return <PostEditorForm projectId={projectId!} postId={postId} ideas={ideas.data ?? []} existing={existing.data} suggestedIdea={search.get("ideaId")} navigateBack={() => navigate(`/projects/${projectId}/posts`)} queryClient={queryClient} />;
}

function PostEditorForm({
  projectId, postId, ideas, existing, suggestedIdea, navigateBack, queryClient
}: {
  projectId: string; postId?: string; ideas: Idea[]; existing?: Post & { body: string; cta: string; idea_id: number };
  suggestedIdea: string | null; navigateBack: () => void; queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<PostValues>({
    resolver: zodResolver(postSchema),
    values: existing ? {
      idea_id: existing.idea_id,
      platform: existing.platform,
      title: existing.title,
      body: existing.body,
      cta: existing.cta,
      status: existing.status,
      scheduled_at: existing.scheduled_at?.slice(0, 16) ?? ""
    } : undefined,
    defaultValues: {
      idea_id: Number(suggestedIdea ?? 0),
      platform: "telegram" as Platform,
      title: "",
      body: "",
      cta: "",
      status: "draft" as PostStatus,
      scheduled_at: ""
    }
  });
  const mutation = useMutation({
    mutationFn: (values: PostValues) => api(`/projects/${projectId}/posts${postId ? `/${postId}` : ""}`, {
      method: postId ? "PUT" : "POST",
      body: JSON.stringify({ ...values, scheduled_at: values.scheduled_at ? new Date(values.scheduled_at).toISOString() : null })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", projectId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", projectId] });
      navigateBack();
    }
  });
  const remove = useMutation({
    mutationFn: () => api<void>(`/projects/${projectId}/posts/${postId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts", projectId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", projectId] });
      navigateBack();
    }
  });
  return (
    <section className="editor-page">
      <div><p className="eyebrow">Редактор</p><h1 className="page-title">{postId ? "Редактировать пост" : "Новый пост"}</h1></div>
      <form className="editor-card" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <div className="editor-meta">
          <Field label="Идея" error={errors.idea_id?.message}>
            <select {...register("idea_id")}><option value={0}>Выберите идею</option>{ideas.map((idea) => <option key={idea.id} value={idea.id}>{idea.title}</option>)}</select>
          </Field>
          <Field label="Площадка" error={errors.platform?.message}>
            <select {...register("platform")}><option value="telegram">Telegram</option><option value="instagram">Instagram</option></select>
          </Field>
          <Field label="Статус" error={errors.status?.message}>
            <select {...register("status")}><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="published">Published</option></select>
          </Field>
          <Field label="Дата публикации" error={errors.scheduled_at?.message}>
            <input type="datetime-local" {...register("scheduled_at")} />
          </Field>
        </div>
        <Field label="Заголовок поста" error={errors.title?.message}><input className="title-input" {...register("title")} /></Field>
        <Field label="Текст" error={errors.body?.message}><textarea className="body-input" rows={10} {...register("body")} /></Field>
        <Field label="CTA" error={errors.cta?.message}><input {...register("cta")} /></Field>
        {mutation.isError && <p className="form-error">Пост не удалось сохранить.</p>}
        <div className="editor-actions">
          <button className="primary-button" type="submit" disabled={mutation.isPending}>Сохранить пост</button>
          <button className="secondary-button" onClick={navigateBack} type="button" disabled={mutation.isPending}>Отмена</button>
          {postId ? <button className="danger-button inline-danger" onClick={() => { remove.reset(); setDeleteOpen(true); }} type="button">Удалить пост</button> : null}
        </div>
      </form>
      <ConfirmDialog
        open={deleteOpen}
        title="Удалить пост?"
        description="Пост будет удален без возможности восстановления."
        pending={remove.isPending}
        error={remove.isError ? "Не удалось удалить пост." : undefined}
        onCancel={() => { if (!remove.isPending) setDeleteOpen(false); }}
        onConfirm={() => remove.mutate()}
      />
    </section>
  );
}
