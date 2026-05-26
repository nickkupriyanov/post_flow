from conftest import register_and_login


def test_user_can_register_login_and_load_profile(client):
    headers = register_and_login(client)

    response = client.get("/auth/me", headers=headers)

    assert response.status_code == 200
    assert response.json()["email"] == "author@example.com"


def test_registration_rejects_duplicate_email(client):
    payload = {"email": "same@example.com", "password": "securepass123"}
    assert client.post("/auth/register", json=payload).status_code == 201

    response = client.post("/auth/register", json=payload)

    assert response.status_code == 409


def test_auth_me_requires_access_token(client):
    assert client.get("/auth/me").status_code == 401


def test_local_frontend_origins_can_call_api(client):
    response = client.options(
        "/auth/register",
        headers={"Origin": "http://127.0.0.1:5173", "Access-Control-Request-Method": "POST"},
    )

    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5173"
