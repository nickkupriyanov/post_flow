import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

import { AppRoutes } from "../App";

const project = {
  id: 1,
  name: "Editorial Practice",
  niche: "Wellness",
  business_description: "Calm studio",
  target_audience: "Busy professionals",
  content_goal: "Build trust",
  platforms: ["telegram", "instagram"],
  tone_of_voice: "Warm",
  forbidden_topics: "Promises"
};

function renderRoute(route: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } }));
}

test("protected workspace redirects a signed-out visitor to login", async () => {
  renderRoute("/projects/1");
  expect(await screen.findByRole("heading", { name: /войти в postflow/i })).toBeInTheDocument();
});

test("onboarding creates the full project and opens its dashboard", async () => {
  localStorage.setItem("postflow_token", "valid-token");
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const path = String(input);
    if (path.endsWith("/auth/me")) return jsonResponse({ id: 1, email: "me@example.com" });
    if (path.endsWith("/projects") && init?.method === "POST") return jsonResponse(project, 201);
    if (path.endsWith("/projects/1")) return jsonResponse(project);
    if (path.endsWith("/projects/1/dashboard")) return jsonResponse({ scheduled_posts: [], draft_posts: [], ideas_without_posts: [] });
    return jsonResponse([]);
  });
  renderRoute("/projects/new");

  await userEvent.type(await screen.findByLabelText(/название проекта/i), "Editorial Practice");
  await userEvent.type(screen.getByLabelText(/ниша/i), "Wellness");
  await userEvent.type(screen.getByLabelText(/описание бизнеса/i), "Calm studio");
  await userEvent.type(screen.getByLabelText(/целевая аудитория/i), "Busy professionals");
  await userEvent.type(screen.getByLabelText(/цель контента/i), "Build trust");
  await userEvent.type(screen.getByLabelText(/tone of voice/i), "Warm");
  await userEvent.type(screen.getByLabelText(/запрещенные темы/i), "Promises");
  await userEvent.click(screen.getByRole("button", { name: /создать пространство/i }));

  expect(await screen.findByText(/ближайшие публикации/i)).toBeInTheDocument();
  expect(screen.getByText(/контент в работе/i)).toBeInTheDocument();
});

test("dashboard renders scheduled posts, drafts and unused ideas", async () => {
  localStorage.setItem("postflow_token", "valid-token");
  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const path = String(input);
    if (path.endsWith("/auth/me")) return jsonResponse({ id: 1, email: "me@example.com" });
    if (path.endsWith("/projects/1")) return jsonResponse(project);
    if (path.endsWith("/projects/1/dashboard")) {
      return jsonResponse({
        scheduled_posts: [{ id: 3, title: "Quiet evening", platform: "telegram", status: "scheduled", scheduled_at: "2026-05-30T10:00:00Z" }],
        draft_posts: [{ id: 4, title: "Carousel", platform: "instagram", status: "draft", scheduled_at: null }],
        ideas_without_posts: [{ id: 7, title: "Behind the scenes", notes: "" }]
      });
    }
    return jsonResponse([]);
  });
  renderRoute("/projects/1");

  expect(await screen.findByText("Quiet evening")).toBeInTheDocument();
  expect(screen.getByText("Carousel")).toBeInTheDocument();
  expect(screen.getByText("Behind the scenes")).toBeInTheDocument();
  expect(screen.getByText(/запланировано 1 публикация/i)).toBeInTheDocument();
  expect(screen.getByText(/1 черновик готовится, 1 идея ждет воплощения/i)).toBeInTheDocument();
  const createIdeas = screen.getAllByRole("link", { name: /создать идею/i });
  expect(createIdeas.length).toBeGreaterThan(0);
  createIdeas.forEach((link) => expect(link).toHaveAttribute("href", "/projects/1/ideas"));
  expect(screen.getByText("Quiet evening").closest(".upcoming-panel")).not.toBeNull();
  expect(screen.getByText(/контент в работе/i).closest(".featured-card")).not.toBeNull();
});

test("dashboard sorts scheduled publications and does not list published history as upcoming", async () => {
  localStorage.setItem("postflow_token", "valid-token");
  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const path = String(input);
    if (path.endsWith("/auth/me")) return jsonResponse({ id: 1, email: "me@example.com" });
    if (path.endsWith("/projects/1")) return jsonResponse(project);
    if (path.endsWith("/projects/1/dashboard")) {
      return jsonResponse({
        scheduled_posts: [
          { id: 1, title: "June post", platform: "telegram", status: "scheduled", scheduled_at: "2026-06-05T10:00:00Z" },
          { id: 2, title: "May post", platform: "instagram", status: "scheduled", scheduled_at: "2026-05-20T10:00:00Z" },
          { id: 3, title: "July post", platform: "telegram", status: "published", scheduled_at: "2026-07-01T10:00:00Z" }
        ],
        draft_posts: [],
        ideas_without_posts: []
      });
    }
    return jsonResponse([]);
  });
  renderRoute("/projects/1");

  await screen.findByText("May post");
  expect(screen.getByText(/запланировано 2 публикации/i)).toBeInTheDocument();
  const cards = document.querySelectorAll(".publication-card");
  const titles = Array.from(cards).map((card) => card.querySelector("h3")?.textContent);
  expect(titles).toEqual(["May post", "June post"]);
  expect(screen.queryByText("July post")).not.toBeInTheDocument();
});

test("calendar renders monthly plan, publication history and undated drafts", async () => {
  vi.setSystemTime(new Date(2026, 4, 27, 12));
  localStorage.setItem("postflow_token", "valid-token");
  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const path = String(input);
    if (path.endsWith("/auth/me")) return jsonResponse({ id: 1, email: "me@example.com" });
    if (path.endsWith("/projects/1")) return jsonResponse(project);
    if (path.endsWith("/projects/1/posts")) {
      return jsonResponse([
        { id: 10, title: "Morning practice", platform: "telegram", status: "scheduled", scheduled_at: "2026-05-08T08:00:00Z" },
        { id: 11, title: "Published recap", platform: "instagram", status: "published", scheduled_at: "2026-05-09T08:00:00Z" },
        { id: 12, title: "Undated draft", platform: "telegram", status: "draft", scheduled_at: null },
        { id: 13, title: "June launch", platform: "telegram", status: "scheduled", scheduled_at: "2026-06-18T08:00:00Z" }
      ]);
    }
    return jsonResponse([]);
  });
  renderRoute("/projects/1/calendar");

  expect(await screen.findByRole("heading", { name: /календарь/i })).toBeInTheDocument();
  expect(await screen.findByRole("region", { name: /май 2026/i })).toBeInTheDocument();
  expect(screen.getByText("Morning practice").closest("a")).toHaveAttribute("href", "/projects/1/posts/10");
  expect(screen.getByText("Published recap").closest(".published")).not.toBeNull();
  expect(screen.getByText("Undated draft").closest(".calendar-drafts")).not.toBeNull();
  expect(screen.getAllByRole("link", { name: /календарь/i })).toHaveLength(2);

  fireEvent.click(screen.getByRole("button", { name: /следующий месяц/i }));
  expect(screen.getByRole("region", { name: /июнь 2026/i })).toBeInTheDocument();
  expect(screen.getByText("June launch")).toBeInTheDocument();
});

test("returning user can choose an existing project instead of onboarding again", async () => {
  localStorage.setItem("postflow_token", "valid-token");
  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const path = String(input);
    if (path.endsWith("/auth/me")) return jsonResponse({ id: 1, email: "me@example.com" });
    if (path.endsWith("/projects")) return jsonResponse([project]);
    return jsonResponse([]);
  });
  renderRoute("/projects");

  expect(await screen.findByText("Editorial Practice")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /открыть проект/i })).toHaveAttribute("href", "/projects/1");
});

test("post editor requires a date before scheduling and saves a platform post", async () => {
  localStorage.setItem("postflow_token", "valid-token");
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const path = String(input);
    if (path.endsWith("/auth/me")) return jsonResponse({ id: 1, email: "me@example.com" });
    if (path.endsWith("/projects/1")) return jsonResponse(project);
    if (path.endsWith("/projects/1/ideas")) return jsonResponse([{ id: 2, title: "Evening ritual", notes: "" }]);
    if (path.endsWith("/projects/1/posts") && init?.method === "POST") return jsonResponse({ id: 8 }, 201);
    return jsonResponse([]);
  });
  renderRoute("/projects/1/posts/new?ideaId=2");

  await userEvent.type(await screen.findByLabelText(/заголовок поста/i), "Evening ritual");
  await userEvent.type(screen.getByLabelText(/^текст$/i), "A quieter end to the day.");
  await userEvent.selectOptions(screen.getByLabelText(/статус/i), "scheduled");
  await userEvent.click(screen.getByRole("button", { name: /сохранить пост/i }));
  expect(await screen.findByText(/укажите дату/i)).toBeInTheDocument();

  await userEvent.type(screen.getByLabelText(/дата публикации/i), "2026-05-30T11:00");
  await userEvent.click(screen.getByRole("button", { name: /сохранить пост/i }));

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining("/projects/1/posts"),
    expect.objectContaining({ method: "POST" })
  ));
});

test("new post editor generates an AI draft without saving it", async () => {
  localStorage.setItem("postflow_token", "valid-token");
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const path = String(input);
    if (path.endsWith("/auth/me")) return jsonResponse({ id: 1, email: "me@example.com" });
    if (path.endsWith("/projects/1")) return jsonResponse(project);
    if (path.endsWith("/projects/1/ideas")) return jsonResponse([{ id: 2, title: "Evening ritual", notes: "" }]);
    if (path.endsWith("/projects/1/posts/generate") && init?.method === "POST") {
      return jsonResponse({ title: "Generated title", body: "Generated body", cta: "Save this" });
    }
    return jsonResponse([]);
  });
  renderRoute("/projects/1/posts/new?ideaId=2");

  const generate = await screen.findByRole("button", { name: /создать с ai/i });
  await userEvent.click(generate);

  expect(await screen.findByDisplayValue("Generated title")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Generated body")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Save this")).toBeInTheDocument();
  expect(screen.getByLabelText(/статус/i)).toHaveValue("draft");
  expect(screen.getByLabelText(/дата публикации/i)).toHaveValue("");
  const generationCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith("/projects/1/posts/generate"));
  expect(generationCall?.[1]).toEqual(expect.objectContaining({
    method: "POST",
    body: JSON.stringify({ idea_id: 2, platform: "telegram" })
  }));
  expect(fetchMock).not.toHaveBeenCalledWith(
    expect.stringMatching(/\/projects\/1\/posts$/),
    expect.objectContaining({ method: "POST" })
  );
});

test("AI draft generation confirms replacement and is unavailable when editing a post", async () => {
  localStorage.setItem("postflow_token", "valid-token");
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const path = String(input);
    if (path.endsWith("/auth/me")) return jsonResponse({ id: 1, email: "me@example.com" });
    if (path.endsWith("/projects/1")) return jsonResponse(project);
    if (path.endsWith("/projects/1/ideas")) return jsonResponse([{ id: 2, title: "Evening ritual", notes: "" }]);
    if (path.endsWith("/projects/1/posts/generate") && init?.method === "POST") {
      return jsonResponse({ title: "Replacement", body: "Replaced body", cta: "" });
    }
    return jsonResponse([]);
  });
  renderRoute("/projects/1/posts/new?ideaId=2");

  await userEvent.type(await screen.findByLabelText(/заголовок поста/i), "Written title");
  await userEvent.click(screen.getByRole("button", { name: /создать с ai/i }));
  const dialog = screen.getByRole("alertdialog");
  expect(within(dialog).getByText(/заменит текущие/i)).toBeInTheDocument();
  expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith("/projects/1/posts/generate"))).toBe(false);
  await userEvent.click(within(dialog).getByRole("button", { name: /^заменить$/i }));
  expect(await screen.findByDisplayValue("Replacement")).toBeInTheDocument();
});

test("AI generation is disabled without an idea and displays pending and error states", async () => {
  localStorage.setItem("postflow_token", "valid-token");
  let finishGeneration: ((response: Response) => void) | undefined;
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const path = String(input);
    if (path.endsWith("/auth/me")) return jsonResponse({ id: 1, email: "me@example.com" });
    if (path.endsWith("/projects/1")) return jsonResponse(project);
    if (path.endsWith("/projects/1/ideas")) return jsonResponse([{ id: 2, title: "Evening ritual", notes: "" }]);
    if (path.endsWith("/projects/1/posts/generate") && init?.method === "POST") {
      return new Promise((resolve) => { finishGeneration = resolve; });
    }
    return jsonResponse([]);
  });
  renderRoute("/projects/1/posts/new");

  const generate = await screen.findByRole("button", { name: /создать с ai/i });
  expect(generate).toBeDisabled();
  await screen.findByRole("option", { name: "Evening ritual" });
  await userEvent.selectOptions(screen.getByLabelText(/идея/i), "2");
  expect(generate).toBeEnabled();
  await userEvent.click(generate);
  expect(screen.getByRole("button", { name: /создаём черновик/i })).toBeDisabled();
  finishGeneration?.(new Response(JSON.stringify({ detail: "Provider failed" }), { status: 502, headers: { "Content-Type": "application/json" } }));
  expect(await screen.findByText(/не удалось создать ai-черновик/i)).toBeInTheDocument();
});

test("existing post editor does not offer AI generation", async () => {
  localStorage.setItem("postflow_token", "valid-token");
  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const path = String(input);
    if (path.endsWith("/auth/me")) return jsonResponse({ id: 1, email: "me@example.com" });
    if (path.endsWith("/projects/1")) return jsonResponse(project);
    if (path.endsWith("/projects/1/ideas")) return jsonResponse([{ id: 2, title: "Evening ritual", notes: "" }]);
    if (path.endsWith("/projects/1/posts/8")) return jsonResponse({ id: 8, idea_id: 2, platform: "telegram", title: "Old post", body: "Text", cta: "", status: "draft", scheduled_at: null });
    return jsonResponse([]);
  });
  renderRoute("/projects/1/posts/8");

  expect(await screen.findByDisplayValue("Old post")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /создать с ai/i })).not.toBeInTheDocument();
});

test("ideas can be created and then edited from the side form", async () => {
  localStorage.setItem("postflow_token", "valid-token");
  let ideas: Array<{ id: number; title: string; notes: string; pillar_id: null }> = [];
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const path = String(input);
    if (path.endsWith("/auth/me")) return jsonResponse({ id: 1, email: "me@example.com" });
    if (path.endsWith("/projects/1")) return jsonResponse(project);
    if (path.endsWith("/projects/1/pillars")) return jsonResponse([]);
    if (path.endsWith("/projects/1/ideas") && init?.method === "POST") {
      ideas = [{ id: 2, title: "Evening ritual", notes: "First note", pillar_id: null }];
      return jsonResponse(ideas[0], 201);
    }
    if (path.endsWith("/projects/1/ideas/2") && init?.method === "PUT") {
      ideas = [{ id: 2, title: "Evening reset", notes: "First note", pillar_id: null }];
      return jsonResponse(ideas[0]);
    }
    if (path.endsWith("/projects/1/ideas")) return jsonResponse(ideas);
    return jsonResponse([]);
  });
  renderRoute("/projects/1/ideas");

  await userEvent.type(await screen.findByLabelText(/название идеи/i), "Evening ritual");
  await userEvent.type(screen.getByLabelText(/заметки/i), "First note");
  await userEvent.click(screen.getByRole("button", { name: /сохранить идею/i }));
  expect(await screen.findByText("Evening ritual")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /редактировать идею/i }));
  expect(screen.getByRole("heading", { name: /редактировать идею/i })).toBeInTheDocument();
  await userEvent.clear(screen.getByLabelText(/название идеи/i));
  await userEvent.type(screen.getByLabelText(/название идеи/i), "Evening reset");
  await userEvent.click(screen.getByRole("button", { name: /сохранить изменения/i }));

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining("/projects/1/ideas/2"),
    expect.objectContaining({ method: "PUT" })
  ));
});

test("idea deletion requires confirmation and displays a failed deletion", async () => {
  localStorage.setItem("postflow_token", "valid-token");
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const path = String(input);
    if (path.endsWith("/auth/me")) return jsonResponse({ id: 1, email: "me@example.com" });
    if (path.endsWith("/projects/1")) return jsonResponse(project);
    if (path.endsWith("/projects/1/pillars")) return jsonResponse([]);
    if (path.endsWith("/projects/1/ideas/2") && init?.method === "DELETE") return jsonResponse({ detail: "Delete failed" }, 500);
    if (path.endsWith("/projects/1/ideas")) return jsonResponse([{ id: 2, title: "Evening ritual", notes: "", pillar_id: null }]);
    return jsonResponse([]);
  });
  renderRoute("/projects/1/ideas");

  await userEvent.click(await screen.findByRole("button", { name: /удалить идею/i }));
  let dialog = screen.getByRole("alertdialog");
  expect(within(dialog).getByText(/связанные посты/i)).toBeInTheDocument();
  await userEvent.click(within(dialog).getByRole("button", { name: /отмена/i }));
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/ideas/2"), expect.objectContaining({ method: "DELETE" }));

  await userEvent.click(screen.getByRole("button", { name: /удалить идею/i }));
  dialog = screen.getByRole("alertdialog");
  await userEvent.click(within(dialog).getByRole("button", { name: /^удалить$/i }));
  expect(await within(dialog).findByText(/не удалось удалить идею/i)).toBeInTheDocument();
});

test("pillars can be edited from the existing side form", async () => {
  localStorage.setItem("postflow_token", "valid-token");
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const path = String(input);
    if (path.endsWith("/auth/me")) return jsonResponse({ id: 1, email: "me@example.com" });
    if (path.endsWith("/projects/1")) return jsonResponse(project);
    if (path.endsWith("/projects/1/pillars/4") && init?.method === "PUT") return jsonResponse({ id: 4, name: "Rituals", description: "Updated" });
    if (path.endsWith("/projects/1/pillars")) return jsonResponse([{ id: 4, name: "Practice", description: "Original" }]);
    return jsonResponse([]);
  });
  renderRoute("/projects/1/pillars");

  await userEvent.click(await screen.findByRole("button", { name: /редактировать рубрику/i }));
  expect(screen.getByRole("heading", { name: /редактировать рубрику/i })).toBeInTheDocument();
  await userEvent.clear(screen.getByLabelText(/^название$/i));
  await userEvent.type(screen.getByLabelText(/^название$/i), "Rituals");
  await userEvent.click(screen.getByRole("button", { name: /сохранить изменения/i }));

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining("/projects/1/pillars/4"),
    expect.objectContaining({ method: "PUT" })
  ));
});

test("an existing post can be deleted from its editor after confirmation", async () => {
  localStorage.setItem("postflow_token", "valid-token");
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const path = String(input);
    if (path.endsWith("/auth/me")) return jsonResponse({ id: 1, email: "me@example.com" });
    if (path.endsWith("/projects/1")) return jsonResponse(project);
    if (path.endsWith("/projects/1/ideas")) return jsonResponse([{ id: 2, title: "Evening ritual", notes: "" }]);
    if (path.endsWith("/projects/1/posts/8") && init?.method === "DELETE") return Promise.resolve(new Response(null, { status: 204 }));
    if (path.endsWith("/projects/1/posts/8")) return jsonResponse({ id: 8, idea_id: 2, platform: "telegram", title: "Old post", body: "Text", cta: "", status: "draft", scheduled_at: null });
    if (path.endsWith("/projects/1/posts")) return jsonResponse([]);
    return jsonResponse([]);
  });
  renderRoute("/projects/1/posts/8");

  await userEvent.click(await screen.findByRole("button", { name: /удалить пост/i }));
  const dialog = screen.getByRole("alertdialog");
  await userEvent.click(within(dialog).getByRole("button", { name: /^удалить$/i }));

  expect(await screen.findByRole("heading", { name: /^посты$/i })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/projects/1/posts/8"), expect.objectContaining({ method: "DELETE" }));
});

test("project deletion is confirmed and returns to the project library", async () => {
  localStorage.setItem("postflow_token", "valid-token");
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const path = String(input);
    if (path.endsWith("/auth/me")) return jsonResponse({ id: 1, email: "me@example.com" });
    if (path.endsWith("/projects/1") && init?.method === "DELETE") return Promise.resolve(new Response(null, { status: 204 }));
    if (path.endsWith("/projects/1")) return jsonResponse(project);
    if (path.endsWith("/projects")) return jsonResponse([]);
    return jsonResponse([]);
  });
  renderRoute("/projects/1/settings");

  await userEvent.click(await screen.findByRole("button", { name: /удалить проект/i }));
  const dialog = screen.getByRole("alertdialog");
  expect(within(dialog).getByText(/весь его контент/i)).toBeInTheDocument();
  await userEvent.click(within(dialog).getByRole("button", { name: /^удалить$/i }));

  expect(await screen.findByText(/пока нет проектов/i)).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/projects/1"), expect.objectContaining({ method: "DELETE" }));
});
