from datetime import datetime, timezone

import httpx
import pytest

from conftest import register_and_login


def project_payload(name: str = "Editorial Practice") -> dict:
    return {
        "name": name,
        "niche": "Wellness",
        "business_description": "Calm bodywork studio",
        "target_audience": "Busy professionals",
        "content_goal": "Build trust",
        "platforms": ["telegram", "instagram"],
        "tone_of_voice": "Warm and grounded",
        "forbidden_topics": "Medical guarantees",
    }


def create_project(client, headers, name: str = "Editorial Practice") -> dict:
    response = client.post("/projects", json=project_payload(name), headers=headers)
    assert response.status_code == 201
    return response.json()


def test_project_pillar_idea_and_multiple_platform_posts_flow(client, auth_headers):
    project = create_project(client, auth_headers)
    pillar = client.post(
        f"/projects/{project['id']}/pillars",
        json={"name": "Practice", "description": "Expert routines"},
        headers=auth_headers,
    ).json()
    idea_response = client.post(
        f"/projects/{project['id']}/ideas",
        json={"title": "Evening reset", "notes": "A simple routine", "pillar_id": pillar["id"]},
        headers=auth_headers,
    )
    assert idea_response.status_code == 201
    idea = idea_response.json()

    telegram = client.post(
        f"/projects/{project['id']}/posts",
        json={
            "idea_id": idea["id"],
            "platform": "telegram",
            "title": "An evening reset",
            "body": "Slow down with these three steps.",
            "cta": "Save for tonight.",
            "status": "draft",
        },
        headers=auth_headers,
    )
    instagram = client.post(
        f"/projects/{project['id']}/posts",
        json={
            "idea_id": idea["id"],
            "platform": "instagram",
            "title": "An evening reset carousel",
            "body": "Three frames for a quieter evening.",
            "cta": "Share with a friend.",
            "status": "draft",
        },
        headers=auth_headers,
    )

    assert telegram.status_code == 201
    assert instagram.status_code == 201
    assert len(client.get(f"/projects/{project['id']}/posts", headers=auth_headers).json()) == 2


def test_ai_generation_returns_editable_draft_without_saving_post(client, auth_headers, monkeypatch):
    project = create_project(client, auth_headers)
    pillar = client.post(
        f"/projects/{project['id']}/pillars",
        json={"name": "Practice", "description": "Expert routines"},
        headers=auth_headers,
    ).json()
    idea = client.post(
        f"/projects/{project['id']}/ideas",
        json={"title": "Evening reset", "notes": "Three slow steps", "pillar_id": pillar["id"]},
        headers=auth_headers,
    ).json()
    monkeypatch.setattr("app.main.settings.timeweb_ai_token", "secret-token")
    monkeypatch.setattr("app.main.settings.timeweb_ai_agent_id", "content-agent")
    request = {}

    class AgentResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {
                "choices": [{
                    "message": {"content": '{"title":"Slow evening","body":"Take a pause.","cta":"Save it."}'},
                    "finish_reason": "stop",
                }]
            }

    def fake_post(url, **kwargs):
        request["url"] = url
        request.update(kwargs)
        return AgentResponse()

    monkeypatch.setattr("app.main.httpx.post", fake_post)
    response = client.post(
        f"/projects/{project['id']}/posts/generate",
        json={"idea_id": idea["id"], "platform": "instagram"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json() == {"title": "Slow evening", "body": "Take a pause.", "cta": "Save it."}
    assert client.get(f"/projects/{project['id']}/posts", headers=auth_headers).json() == []
    assert request["url"].endswith("/agents/content-agent/v1/chat/completions")
    assert request["headers"]["Authorization"] == "Bearer secret-token"
    prompt = request["json"]["messages"][0]["content"]
    assert "Calm bodywork studio" in prompt
    assert "Evening reset" in prompt
    assert "Practice: Expert routines" in prompt
    assert "Площадка: instagram" in prompt
    assert request["json"]["messages"][0]["role"] == "user"
    assert request["json"]["stream"] is False


def test_ai_generation_requires_configuration_and_owned_idea(client, auth_headers):
    project = create_project(client, auth_headers)
    idea = client.post(
        f"/projects/{project['id']}/ideas",
        json={"title": "Known idea", "notes": ""},
        headers=auth_headers,
    ).json()
    assert client.post(
        f"/projects/{project['id']}/posts/generate",
        json={"idea_id": idea["id"], "platform": "telegram"},
        headers=auth_headers,
    ).status_code == 503

    other_project = create_project(client, auth_headers, "Other project")
    other_idea = client.post(
        f"/projects/{other_project['id']}/ideas",
        json={"title": "Wrong project idea", "notes": ""},
        headers=auth_headers,
    ).json()
    assert client.post(
        f"/projects/{project['id']}/posts/generate",
        json={"idea_id": other_idea["id"], "platform": "telegram"},
        headers=auth_headers,
    ).status_code == 422

    stranger_headers = register_and_login(client, "generator-stranger@example.com")
    assert client.post(
        f"/projects/{project['id']}/posts/generate",
        json={"idea_id": idea["id"], "platform": "telegram"},
        headers=stranger_headers,
    ).status_code == 404


@pytest.mark.parametrize("agent_result", [
    {"choices": [{"message": {"content": "not-json"}, "finish_reason": "stop"}]},
    {"choices": [{"message": {"content": '{"title":"Partial"}'}, "finish_reason": "stop"}]},
    {"choices": [{"message": {"content": '{"title":"Title","body":"Body","cta":""}'}, "finish_reason": "length"}]},
])
def test_ai_generation_rejects_invalid_or_incomplete_agent_results(client, auth_headers, monkeypatch, agent_result):
    project = create_project(client, auth_headers)
    idea = client.post(
        f"/projects/{project['id']}/ideas",
        json={"title": "Prompt", "notes": ""},
        headers=auth_headers,
    ).json()
    monkeypatch.setattr("app.main.settings.timeweb_ai_token", "secret-token")
    monkeypatch.setattr("app.main.settings.timeweb_ai_agent_id", "content-agent")

    class AgentResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return agent_result

    monkeypatch.setattr("app.main.httpx.post", lambda *args, **kwargs: AgentResponse())
    response = client.post(
        f"/projects/{project['id']}/posts/generate",
        json={"idea_id": idea["id"], "platform": "telegram"},
        headers=auth_headers,
    )
    assert response.status_code == 502


def test_ai_generation_maps_provider_http_error_to_bad_gateway(client, auth_headers, monkeypatch):
    project = create_project(client, auth_headers)
    idea = client.post(
        f"/projects/{project['id']}/ideas",
        json={"title": "Prompt", "notes": ""},
        headers=auth_headers,
    ).json()
    monkeypatch.setattr("app.main.settings.timeweb_ai_token", "secret-token")
    monkeypatch.setattr("app.main.settings.timeweb_ai_agent_id", "content-agent")

    def failed_call(*args, **kwargs):
        raise httpx.ConnectError("Provider unavailable")

    monkeypatch.setattr("app.main.httpx.post", failed_call)
    assert client.post(
        f"/projects/{project['id']}/posts/generate",
        json={"idea_id": idea["id"], "platform": "telegram"},
        headers=auth_headers,
    ).status_code == 502


def test_scheduled_and_published_posts_require_scheduled_date(client, auth_headers):
    project = create_project(client, auth_headers)
    idea = client.post(
        f"/projects/{project['id']}/ideas",
        json={"title": "Weekly prompt", "notes": ""},
        headers=auth_headers,
    ).json()
    base_post = {
        "idea_id": idea["id"],
        "platform": "telegram",
        "title": "Weekly prompt",
        "body": "Body",
        "cta": "",
    }

    assert client.post(
        f"/projects/{project['id']}/posts",
        json={**base_post, "status": "draft"},
        headers=auth_headers,
    ).status_code == 201
    assert client.post(
        f"/projects/{project['id']}/posts",
        json={**base_post, "status": "scheduled"},
        headers=auth_headers,
    ).status_code == 422
    scheduled_at = datetime.now(timezone.utc).isoformat()
    response = client.post(
        f"/projects/{project['id']}/posts",
        json={**base_post, "status": "published", "scheduled_at": scheduled_at},
        headers=auth_headers,
    )
    assert response.status_code == 201


def test_dashboard_collects_scheduled_drafts_and_ideas_without_posts(client, auth_headers):
    project = create_project(client, auth_headers)
    used_idea = client.post(
        f"/projects/{project['id']}/ideas",
        json={"title": "Scheduled content", "notes": ""},
        headers=auth_headers,
    ).json()
    client.post(
        f"/projects/{project['id']}/ideas",
        json={"title": "Still an idea", "notes": ""},
        headers=auth_headers,
    )
    client.post(
        f"/projects/{project['id']}/posts",
        json={
            "idea_id": used_idea["id"],
            "platform": "telegram",
            "title": "Scheduled content",
            "body": "A planned post",
            "cta": "",
            "status": "scheduled",
            "scheduled_at": "2026-05-28T09:00:00Z",
        },
        headers=auth_headers,
    )

    dashboard = client.get(f"/projects/{project['id']}/dashboard", headers=auth_headers).json()

    assert [post["title"] for post in dashboard["scheduled_posts"]] == ["Scheduled content"]
    assert dashboard["draft_posts"] == []
    assert [idea["title"] for idea in dashboard["ideas_without_posts"]] == ["Still an idea"]


def test_dashboard_excludes_published_posts_from_upcoming_schedule(client, auth_headers):
    project = create_project(client, auth_headers)
    idea = client.post(
        f"/projects/{project['id']}/ideas",
        json={"title": "Published recap", "notes": ""},
        headers=auth_headers,
    ).json()
    client.post(
        f"/projects/{project['id']}/posts",
        json={
            "idea_id": idea["id"],
            "platform": "instagram",
            "title": "Already live",
            "body": "Published history",
            "cta": "",
            "status": "published",
            "scheduled_at": "2026-05-20T09:00:00Z",
        },
        headers=auth_headers,
    )

    dashboard = client.get(f"/projects/{project['id']}/dashboard", headers=auth_headers).json()

    assert dashboard["scheduled_posts"] == []


def test_nested_content_is_inaccessible_to_another_user(client, auth_headers):
    project = create_project(client, auth_headers)
    stranger_headers = register_and_login(client, "stranger@example.com")

    assert client.get(f"/projects/{project['id']}", headers=stranger_headers).status_code == 404
    assert client.get(f"/projects/{project['id']}/ideas", headers=stranger_headers).status_code == 404
    assert client.get(f"/projects/{project['id']}/posts", headers=stranger_headers).status_code == 404


def test_content_resources_support_read_update_and_delete(client, auth_headers):
    project = create_project(client, auth_headers)
    pillar = client.post(
        f"/projects/{project['id']}/pillars",
        json={"name": "Old pillar", "description": ""},
        headers=auth_headers,
    ).json()
    updated_pillar = client.put(
        f"/projects/{project['id']}/pillars/{pillar['id']}",
        json={"name": "Signature rituals", "description": "Our distinctive work"},
        headers=auth_headers,
    )
    assert updated_pillar.json()["name"] == "Signature rituals"
    assert client.get(
        f"/projects/{project['id']}/pillars/{pillar['id']}", headers=auth_headers
    ).json()["name"] == "Signature rituals"

    idea = client.post(
        f"/projects/{project['id']}/ideas",
        json={"title": "Original", "notes": "", "pillar_id": pillar["id"]},
        headers=auth_headers,
    ).json()
    assert client.put(
        f"/projects/{project['id']}/ideas/{idea['id']}",
        json={"title": "Refined idea", "notes": "ready", "pillar_id": pillar["id"]},
        headers=auth_headers,
    ).json()["title"] == "Refined idea"
    assert client.get(
        f"/projects/{project['id']}/ideas/{idea['id']}", headers=auth_headers
    ).json()["title"] == "Refined idea"

    post = client.post(
        f"/projects/{project['id']}/posts",
        json={"idea_id": idea["id"], "platform": "telegram", "title": "Post", "body": "Text", "cta": "", "status": "draft"},
        headers=auth_headers,
    ).json()
    assert client.put(
        f"/projects/{project['id']}/posts/{post['id']}",
        json={
            "idea_id": idea["id"],
            "platform": "telegram",
            "title": "Post ready",
            "body": "Text",
            "cta": "",
            "status": "scheduled",
            "scheduled_at": "2026-05-30T11:00:00Z",
        },
        headers=auth_headers,
    ).json()["status"] == "scheduled"
    assert client.get(
        f"/projects/{project['id']}/posts/{post['id']}", headers=auth_headers
    ).json()["title"] == "Post ready"

    assert client.delete(
        f"/projects/{project['id']}/posts/{post['id']}", headers=auth_headers
    ).status_code == 204
    assert client.delete(
        f"/projects/{project['id']}/ideas/{idea['id']}", headers=auth_headers
    ).status_code == 204
    assert client.delete(
        f"/projects/{project['id']}/pillars/{pillar['id']}", headers=auth_headers
    ).status_code == 204


def test_project_can_be_updated_listed_and_deleted(client, auth_headers):
    project = create_project(client, auth_headers)
    changed = client.put(
        f"/projects/{project['id']}",
        json=project_payload("Updated project"),
        headers=auth_headers,
    )
    assert changed.json()["name"] == "Updated project"
    assert client.get("/projects", headers=auth_headers).json()[0]["name"] == "Updated project"
    assert client.delete(f"/projects/{project['id']}", headers=auth_headers).status_code == 204
    assert client.get(f"/projects/{project['id']}", headers=auth_headers).status_code == 404


def test_deleting_pillar_keeps_its_existing_idea(client, auth_headers):
    project = create_project(client, auth_headers)
    pillar = client.post(
        f"/projects/{project['id']}/pillars",
        json={"name": "Temporary category", "description": ""},
        headers=auth_headers,
    ).json()
    idea = client.post(
        f"/projects/{project['id']}/ideas",
        json={"title": "Keep this idea", "notes": "", "pillar_id": pillar["id"]},
        headers=auth_headers,
    ).json()

    assert client.delete(
        f"/projects/{project['id']}/pillars/{pillar['id']}", headers=auth_headers
    ).status_code == 204
    remaining = client.get(
        f"/projects/{project['id']}/ideas/{idea['id']}", headers=auth_headers
    ).json()
    assert remaining["title"] == "Keep this idea"
    assert remaining["pillar_id"] is None


def test_deleting_idea_removes_its_existing_posts(client, auth_headers):
    project = create_project(client, auth_headers)
    idea = client.post(
        f"/projects/{project['id']}/ideas",
        json={"title": "Disposable idea", "notes": ""},
        headers=auth_headers,
    ).json()
    client.post(
        f"/projects/{project['id']}/posts",
        json={"idea_id": idea["id"], "platform": "telegram", "title": "Attached post", "body": "Text", "cta": "", "status": "draft"},
        headers=auth_headers,
    )

    assert client.delete(
        f"/projects/{project['id']}/ideas/{idea['id']}", headers=auth_headers
    ).status_code == 204
    assert client.get(
        f"/projects/{project['id']}/posts", headers=auth_headers
    ).json() == []
