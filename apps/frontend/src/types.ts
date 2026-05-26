export type Platform = "telegram" | "instagram";
export type PostStatus = "draft" | "scheduled" | "published";

export interface User {
  id: number;
  email: string;
}

export interface Project {
  id: number;
  name: string;
  niche: string;
  business_description: string;
  target_audience: string;
  content_goal: string;
  platforms: Platform[];
  tone_of_voice: string;
  forbidden_topics: string;
}

export interface Pillar {
  id: number;
  project_id: number;
  name: string;
  description: string;
}

export interface Idea {
  id: number;
  project_id?: number;
  title: string;
  notes: string;
  pillar_id?: number | null;
}

export interface Post {
  id: number;
  project_id?: number;
  idea_id?: number;
  platform: Platform;
  title: string;
  body?: string;
  cta?: string;
  status: PostStatus;
  scheduled_at: string | null;
}

export interface Dashboard {
  scheduled_posts: Post[];
  draft_posts: Post[];
  ideas_without_posts: Idea[];
}

