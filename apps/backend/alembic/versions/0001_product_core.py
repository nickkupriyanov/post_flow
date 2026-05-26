"""product core schema"""

from alembic import op
import sqlalchemy as sa

revision = "0001_product_core"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("users", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("email", sa.String(255), nullable=False), sa.Column("password_hash", sa.String(255), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_table("projects", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False), sa.Column("name", sa.String(160), nullable=False), sa.Column("niche", sa.String(160), nullable=False), sa.Column("business_description", sa.Text(), nullable=False), sa.Column("target_audience", sa.Text(), nullable=False), sa.Column("content_goal", sa.Text(), nullable=False), sa.Column("platforms", sa.String(120), nullable=False), sa.Column("tone_of_voice", sa.Text(), nullable=False), sa.Column("forbidden_topics", sa.Text(), nullable=False, server_default=""), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_index("ix_projects_owner_id", "projects", ["owner_id"])
    op.create_table("content_pillars", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False), sa.Column("name", sa.String(120), nullable=False), sa.Column("description", sa.Text(), nullable=False, server_default=""), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_table("ideas", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False), sa.Column("pillar_id", sa.Integer(), sa.ForeignKey("content_pillars.id"), nullable=True), sa.Column("title", sa.String(240), nullable=False), sa.Column("notes", sa.Text(), nullable=False, server_default=""), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_table("posts", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False), sa.Column("idea_id", sa.Integer(), sa.ForeignKey("ideas.id"), nullable=False), sa.Column("platform", sa.String(20), nullable=False), sa.Column("title", sa.String(240), nullable=False), sa.Column("body", sa.Text(), nullable=False), sa.Column("cta", sa.Text(), nullable=False, server_default=""), sa.Column("status", sa.String(20), nullable=False, server_default="draft"), sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))


def downgrade():
    op.drop_table("posts")
    op.drop_table("ideas")
    op.drop_table("content_pillars")
    op.drop_index("ix_projects_owner_id", table_name="projects")
    op.drop_table("projects")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
