const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
export const TOKEN_KEY = "postflow_token";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof result.detail === "string" ? result.detail : "Не удалось выполнить действие";
    throw new ApiError(response.status, detail);
  }
  return result as T;
}

export function json(data: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(data) };
}

