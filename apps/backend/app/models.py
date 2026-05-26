from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    projects: Mapped[list["Project"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class Project(TimestampMixin, Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    niche: Mapped[str] = mapped_column(String(160))
    business_description: Mapped[str] = mapped_column(Text)
    target_audience: Mapped[str] = mapped_column(Text)
    content_goal: Mapped[str] = mapped_column(Text)
    platforms: Mapped[str] = mapped_column(String(120))
    tone_of_voice: Mapped[str] = mapped_column(Text)
    forbidden_topics: Mapped[str] = mapped_column(Text, default="")

    owner: Mapped[User] = relationship(back_populates="projects")
    pillars: Mapped[list["ContentPillar"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    ideas: Mapped[list["Idea"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    posts: Mapped[list["Post"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class ContentPillar(TimestampMixin, Base):
    __tablename__ = "content_pillars"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")

    project: Mapped[Project] = relationship(back_populates="pillars")
    ideas: Mapped[list["Idea"]] = relationship(back_populates="pillar")


class Idea(TimestampMixin, Base):
    __tablename__ = "ideas"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    pillar_id: Mapped[int | None] = mapped_column(ForeignKey("content_pillars.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(240))
    notes: Mapped[str] = mapped_column(Text, default="")

    project: Mapped[Project] = relationship(back_populates="ideas")
    pillar: Mapped[ContentPillar | None] = relationship(back_populates="ideas")
    posts: Mapped[list["Post"]] = relationship(back_populates="idea", cascade="all, delete-orphan")


class Post(TimestampMixin, Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    idea_id: Mapped[int] = mapped_column(ForeignKey("ideas.id"), index=True)
    platform: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(240))
    body: Mapped[str] = mapped_column(Text)
    cta: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="draft")
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    project: Mapped[Project] = relationship(back_populates="posts")
    idea: Mapped[Idea] = relationship(back_populates="posts")

