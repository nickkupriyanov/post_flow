# PostFlow

PostFlow is a calm editorial workspace for planning content with optional AI assistance. Create a business profile, generate or keep a backlog of ideas, turn one idea into platform-specific posts, and track publication status and date.

## Product Core

- Email/password registration and JWT authentication.
- Multiple projects with a full business profile.
- Content pillars and an idea backlog.
- AI-assisted idea suggestions with selective backlog saving.
- Telegram and Instagram posts created from an idea.
- AI-assisted editable draft generation from an idea and platform.
- `draft`, `scheduled`, and `published` workflow with required scheduling dates.
- Project dashboard with upcoming posts, drafts, and unused ideas.
- Monthly editorial calendar with planned posts, publication history, and undated drafts.
- Editorial Studio interface with designed loading, error, and empty states.

Exports, autosave, publishing integrations, and extended history are intentionally deferred.

## Structure

```text
apps/
  backend/   FastAPI, SQLAlchemy, Alembic, PostgreSQL
  frontend/  React, TypeScript, Vite, TanStack Query, Tailwind CSS
docker-compose.yml
.env.example
```

## Run With Docker

```bash
cp .env.example .env
docker compose up --build
```

Set `TIMEWEB_AI_TOKEN` and `TIMEWEB_AI_AGENT_ID` in `.env` to enable AI idea suggestions and draft generation through a configured Timeweb Cloud AI agent. The backend uses its OpenAI-compatible `/v1/chat/completions` API; the token is never sent to the frontend.

Open `http://localhost:5173`. The API is available at `http://localhost:8000`, with health status at `GET /health`.

## Run Locally

Start the backend:

```bash
cd apps/backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
DATABASE_URL=sqlite:///./postflow.db JWT_SECRET=local-dev-secret .venv/bin/alembic upgrade head
DATABASE_URL=sqlite:///./postflow.db JWT_SECRET=local-dev-secret .venv/bin/uvicorn app.main:app --reload
```

Start the frontend in another terminal:

```bash
cd apps/frontend
npm install
npm run dev
```

## Verification

```bash
cd apps/backend && pytest -q
cd apps/frontend && npm test
cd apps/frontend && npm run build
```

## API Surface

```text
POST /auth/register
POST /auth/login
GET  /auth/me

CRUD /projects
CRUD /projects/{project_id}/pillars
CRUD /projects/{project_id}/ideas
POST /projects/{project_id}/ideas/generate
POST /projects/{project_id}/ideas/bulk
CRUD /projects/{project_id}/posts
POST /projects/{project_id}/posts/generate
GET  /projects/{project_id}/dashboard
```
