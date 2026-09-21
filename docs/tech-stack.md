# Tech Stack & Architecture — Data Modeling Helper

## Frontend

- Framework: **Next.js**
- Styling: **Tailwind CSS**
- Canvas/diagramming: **React Flow** — standard pairing with Next.js for node/edge editors, handles the entity/relationship canvas
## Backend

- Language/framework: **FastAPI**, standard structure (routers/models/schemas/services/db/core)
- ORM: **SQLAlchemy + Alembic** for migrations

## Decisions log

| Date | Decision | Reasoning |
|---|---|---|
| | Frontend: Next.js + Tailwind | Team choice |
| | Backend: FastAPI, standard structure | Team choice |
| | Database: PostgreSQL | Team choice |
| | Canvas library: React Flow | Standard node/edge editor pairing with Next.js |
| | ORM: SQLAlchemy + Alembic | Standard FastAPI/Postgres pairing |

## Data storage

- Database: **PostgreSQL**
- ORM: _TBD (e.g. SQLAlchemy + Alembic for migrations is the standard FastAPI pairing — recommended default)_

## Suggested project layout (standard FastAPI structure)

```
app/
├── main.py
├── api/
│   └── routers/        # entity, relationship, validation, export endpoints
├── models/              # SQLAlchemy models
├── schemas/             # Pydantic schemas
├── services/            # business logic (validation engine, doc generation)
├── db/                  # session, migrations (alembic)
└── core/                # config, settings
```

Paired with a standard Next.js `app/` directory on the frontend side.

## Export formats

- ERD image/PDF: _TBD (e.g. render canvas to SVG → export as PDF)_
- Documentation: _TBD (e.g. generate Markdown data dictionary server-side from the model, offer PDF conversion)_
- (Stretch) SQL DDL: target dialect **PostgreSQL** (matches the chosen DB, simplest to start with)

## Hosting / deployment

- _TBD (e.g. Vercel for Next.js frontend, a container host for FastAPI + Postgres — decide once Phase 2 build starts)_

## Decisions log

| Date | Decision | Reasoning |
|---|---|---|
| | Frontend: Next.js + Tailwind | Team choice |
| | Backend: FastAPI, standard structure | Team choice |
| | Database: PostgreSQL | Team choice |
| | | |
