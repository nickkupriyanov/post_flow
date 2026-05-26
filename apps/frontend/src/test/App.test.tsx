import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
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
  expect(screen.getByText(/план собран/i)).toBeInTheDocument();
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
