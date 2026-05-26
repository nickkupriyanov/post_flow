from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import ContentPillar, Idea, Post, Project, User
from .schemas import (
    DashboardRead,
    IdeaCreate,
    IdeaRead,
    PillarCreate,
    PillarRead,
    PostCreate,
    PostRead,
    ProjectCreate,
    ProjectRead,
    Token,
    UserCreate,
    UserRead,
)
from .security import create_access_token, get_current_user, hash_password, verify_password

app = FastAPI(title="PostFlow API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def healthcheck():
    return {"status": "ok"}


def project_or_404(project_id: int, user: User, db: Session) -> Project:
    project = db.scalar(select(Project).where(Project.id == project_id, Project.owner_id == user.id))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def save(db: Session, entity):
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


@app.post("/auth/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Email is already registered")
    return save(db, User(email=email, password_hash=hash_password(payload.password)))


@app.post("/auth/login", response_model=Token)
def login(payload: UserCreate, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.strip().lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return Token(access_token=create_access_token(user.id))


@app.get("/auth/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)):
    return user


@app.get("/projects", response_model=list[ProjectRead])
def list_projects(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = db.scalars(select(Project).where(Project.owner_id == user.id).order_by(Project.created_at.desc())).all()
    return [project_to_schema(project) for project in projects]


@app.post("/projects", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = save(db, Project(owner_id=user.id, **payload.model_dump(mode="json", exclude={"platforms"}), platforms=",".join(payload.platforms)))
    return project_to_schema(project)


def project_to_schema(project: Project) -> ProjectRead:
    data = {column.name: getattr(project, column.name) for column in Project.__table__.columns}
    data["platforms"] = project.platforms.split(",") if project.platforms else []
    return ProjectRead.model_validate(data)


@app.get("/projects/{project_id}", response_model=ProjectRead)
def get_project(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return project_to_schema(project_or_404(project_id, user, db))


@app.put("/projects/{project_id}", response_model=ProjectRead)
def update_project(payload: ProjectCreate, project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = project_or_404(project_id, user, db)
    for name, value in payload.model_dump(exclude={"platforms"}).items():
        setattr(project, name, value)
    project.platforms = ",".join(payload.platforms)
    save(db, project)
    return project_to_schema(project)


@app.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = project_or_404(project_id, user, db)
    db.delete(project)
    db.commit()


@app.get("/projects/{project_id}/pillars", response_model=list[PillarRead])
def list_pillars(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project_or_404(project_id, user, db)
    return db.scalars(select(ContentPillar).where(ContentPillar.project_id == project_id)).all()


@app.post("/projects/{project_id}/pillars", response_model=PillarRead, status_code=status.HTTP_201_CREATED)
def create_pillar(payload: PillarCreate, project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project_or_404(project_id, user, db)
    return save(db, ContentPillar(project_id=project_id, **payload.model_dump()))


@app.get("/projects/{project_id}/pillars/{pillar_id}", response_model=PillarRead)
def get_pillar(project_id: int, pillar_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project_or_404(project_id, user, db)
    pillar = db.scalar(select(ContentPillar).where(ContentPillar.id == pillar_id, ContentPillar.project_id == project_id))
    if not pillar:
        raise HTTPException(status_code=404, detail="Pillar not found")
    return pillar


@app.put("/projects/{project_id}/pillars/{pillar_id}", response_model=PillarRead)
def update_pillar(payload: PillarCreate, project_id: int, pillar_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project_or_404(project_id, user, db)
    pillar = db.scalar(select(ContentPillar).where(ContentPillar.id == pillar_id, ContentPillar.project_id == project_id))
    if not pillar:
        raise HTTPException(status_code=404, detail="Pillar not found")
    for name, value in payload.model_dump().items():
        setattr(pillar, name, value)
    return save(db, pillar)


@app.delete("/projects/{project_id}/pillars/{pillar_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pillar(project_id: int, pillar_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project_or_404(project_id, user, db)
    pillar = db.scalar(select(ContentPillar).where(ContentPillar.id == pillar_id, ContentPillar.project_id == project_id))
    if not pillar:
        raise HTTPException(status_code=404, detail="Pillar not found")
    db.delete(pillar)
    db.commit()


@app.get("/projects/{project_id}/ideas", response_model=list[IdeaRead])
def list_ideas(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project_or_404(project_id, user, db)
    return db.scalars(select(Idea).where(Idea.project_id == project_id).order_by(Idea.created_at.desc())).all()


def validate_pillar(project_id: int, pillar_id: int | None, db: Session):
    if pillar_id and not db.scalar(select(ContentPillar).where(ContentPillar.id == pillar_id, ContentPillar.project_id == project_id)):
        raise HTTPException(status_code=422, detail="Pillar must belong to this project")


@app.post("/projects/{project_id}/ideas", response_model=IdeaRead, status_code=status.HTTP_201_CREATED)
def create_idea(payload: IdeaCreate, project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project_or_404(project_id, user, db)
    validate_pillar(project_id, payload.pillar_id, db)
    return save(db, Idea(project_id=project_id, **payload.model_dump()))


@app.get("/projects/{project_id}/ideas/{idea_id}", response_model=IdeaRead)
def get_idea(project_id: int, idea_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project_or_404(project_id, user, db)
    idea = db.scalar(select(Idea).where(Idea.id == idea_id, Idea.project_id == project_id))
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    return idea


@app.put("/projects/{project_id}/ideas/{idea_id}", response_model=IdeaRead)
def update_idea(payload: IdeaCreate, project_id: int, idea_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project_or_404(project_id, user, db)
    idea = db.scalar(select(Idea).where(Idea.id == idea_id, Idea.project_id == project_id))
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    validate_pillar(project_id, payload.pillar_id, db)
    for name, value in payload.model_dump().items():
        setattr(idea, name, value)
    return save(db, idea)


@app.delete("/projects/{project_id}/ideas/{idea_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_idea(project_id: int, idea_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project_or_404(project_id, user, db)
    idea = db.scalar(select(Idea).where(Idea.id == idea_id, Idea.project_id == project_id))
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    db.delete(idea)
    db.commit()


@app.get("/projects/{project_id}/posts", response_model=list[PostRead])
def list_posts(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project_or_404(project_id, user, db)
    return db.scalars(select(Post).where(Post.project_id == project_id).order_by(Post.created_at.desc())).all()


def validate_idea(project_id: int, idea_id: int, db: Session):
    if not db.scalar(select(Idea).where(Idea.id == idea_id, Idea.project_id == project_id)):
        raise HTTPException(status_code=422, detail="Idea must belong to this project")


@app.post("/projects/{project_id}/posts", response_model=PostRead, status_code=status.HTTP_201_CREATED)
def create_post(payload: PostCreate, project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project_or_404(project_id, user, db)
    validate_idea(project_id, payload.idea_id, db)
    return save(db, Post(project_id=project_id, **payload.model_dump()))


@app.get("/projects/{project_id}/posts/{post_id}", response_model=PostRead)
def get_post(project_id: int, post_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project_or_404(project_id, user, db)
    post = db.scalar(select(Post).where(Post.id == post_id, Post.project_id == project_id))
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@app.put("/projects/{project_id}/posts/{post_id}", response_model=PostRead)
def update_post(payload: PostCreate, project_id: int, post_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project_or_404(project_id, user, db)
    post = db.scalar(select(Post).where(Post.id == post_id, Post.project_id == project_id))
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    validate_idea(project_id, payload.idea_id, db)
    for name, value in payload.model_dump().items():
        setattr(post, name, value)
    return save(db, post)


@app.delete("/projects/{project_id}/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(project_id: int, post_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project_or_404(project_id, user, db)
    post = db.scalar(select(Post).where(Post.id == post_id, Post.project_id == project_id))
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(post)
    db.commit()


@app.get("/projects/{project_id}/dashboard", response_model=DashboardRead)
def get_dashboard(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project_or_404(project_id, user, db)
    posts = db.scalars(select(Post).where(Post.project_id == project_id)).all()
    ideas = db.scalars(select(Idea).where(Idea.project_id == project_id)).all()
    post_idea_ids = {post.idea_id for post in posts}
    return DashboardRead(
        scheduled_posts=[post for post in posts if post.status in ("scheduled", "published")],
        draft_posts=[post for post in posts if post.status == "draft"],
        ideas_without_posts=[idea for idea in ideas if idea.id not in post_idea_ids],
    )
