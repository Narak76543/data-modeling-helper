"""Add api_keys table

Revision ID: 0960caf2d44d
Revises: bbbc79fd30b4
Create Date: 2026-09-21 15:23:42.964085

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0960caf2d44d'
down_revision: Union[str, None] = 'bbbc79fd30b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'api_keys',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('label', sa.String(length=100), nullable=False),
        sa.Column('encrypted_key', sa.Text(), nullable=False),
        sa.Column('masked_key', sa.String(length=50), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('api_keys')
