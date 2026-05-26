from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Platform = Literal["telegram", "instagram"]
PostStatus = Literal["draft", "scheduled", "published"]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class UserRead(ORMModel):
    id: int
    email: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ProjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    niche: str = Field(min_length=1, max_length=160)
    business_description: str = Field(min_length=1)
    target_audience: str = Field(min_length=1)
    content_goal: str = Field(min_length=1)
    platforms: list[Platform] = Field(min_length=1)
    tone_of_voice: str = Field(min_length=1)
    forbidden_topics: str = ""


class ProjectCreate(ProjectBase):
    pass


class ProjectRead(ProjectBase, ORMModel):
    id: int


class PillarBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""


class PillarCreate(PillarBase):
    pass


class PillarRead(PillarBase, ORMModel):
    id: int
    project_id: int


class IdeaBase(BaseModel):
    title: str = Field(min_length=1, max_length=240)
    notes: str = ""
    pillar_id: int | None = None


class IdeaCreate(IdeaBase):
    pass


class IdeaRead(IdeaBase, ORMModel):
    id: int
    project_id: int


class PostBase(BaseModel):
    idea_id: int
    platform: Platform
    title: str = Field(min_length=1, max_length=240)
    body: str = Field(min_length=1)
    cta: str = ""
    status: PostStatus = "draft"
    scheduled_at: datetime | None = None

    @model_validator(mode="after")
    def require_date_for_planned_posts(self):
        if self.status in ("scheduled", "published") and not self.scheduled_at:
            raise ValueError("scheduled_at is required when status is scheduled or published")
        return self


class PostCreate(PostBase):
    pass


class PostRead(PostBase, ORMModel):
    id: int
    project_id: int


class DashboardRead(BaseModel):
    scheduled_posts: list[PostRead]
    draft_posts: list[PostRead]
    ideas_without_posts: list[IdeaRead]

