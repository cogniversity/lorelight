# Lorelight — Story Production OS

A full-stack production platform for cinematic series: story bible, world entities with external prompt IDs, a manuscript reader, AI-assisted video prompt generation, real asset storage, and role-based team access.

---

## Architecture

```
CoG/
  apps/
    api/          NestJS + Prisma backend (port 3001)
    web/          React + Vite frontend (port 5173)
  packages/
    contracts/    Shared TypeScript DTOs and enums
  infra/
    compose.yaml  PostgreSQL + MinIO via Docker Compose
  docs/
    VIDEO_PROMPT_GUIDE.md  LLM system prompt for video prompt generation
  .env.example
```

---

## Quick start

### 1. Prerequisites

- Docker Desktop (running)
- Node.js ≥ 18
- npm ≥ 9

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`. Required values:

| Variable | Purpose |
|---|---|
| `JWT_ACCESS_SECRET` | 64-byte random hex |
| `JWT_REFRESH_SECRET` | 64-byte random hex (different) |
| `SECRET_ENCRYPTION_KEY` | 32-byte hex for API key encryption |
| `ADMIN_EMAIL` | First admin user email |
| `ADMIN_PASSWORD` | First admin user password |

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Start infrastructure

```bash
npm run docker:up
```

Wait for PostgreSQL and MinIO to be healthy:
```bash
npm run docker:logs
```

### 4. Install dependencies

```bash
cd apps/api && npm install
cd ../web && npm install
cd ../../packages/contracts && npm install && npm run build
```

Or from root:
```bash
npm install --workspaces
```

### 5. Run database migration and seed

```bash
npm run db:migrate
npm run db:seed
```

This creates the admin user and seeds the demo "Children of Glass" series.

### 6. Start development servers

```bash
# Terminal 1
cd apps/api && npm run dev

# Terminal 2
cd apps/web && npm run dev
```

Open `http://localhost:5173` and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

---

## LLM Provider setup

At least one LLM provider must be configured to use AI video prompt generation.
You can configure providers per-series in **Settings → LLM Providers**.

### OpenAI

Set `OPENAI_API_KEY` in `.env`, then in the app: Provider = OpenAI, Model = `gpt-4o`.

### Ollama (local)

1. Install Ollama: https://ollama.com
2. Pull a model: `ollama pull llama3.2`
3. In the app: Provider = Ollama, Base URL = `http://host.docker.internal:11434`

### llama.cpp

1. Run llama.cpp server with `--port 8080`
2. In the app: Provider = llama.cpp, Base URL = `http://host.docker.internal:8080`

The LLM receives canonical display names; the system compiles external IDs into
the `compiledVideoPrompt` field before returning to the UI. See `docs/VIDEO_PROMPT_GUIDE.md`
for the full prompt authoring specification.

---

## External IDs (prompt aliases)

Each world entity (Character, Location, Artifact, Organization) has an optional **External ID**
field (e.g. `jcerna-01a3`). This field is:

- Unique per series (case-insensitive)
- Never shown in story text, scripture, or manuscript
- Injected into the compiled video prompt only at generation time

The story always uses `displayName`. The video model receives `externalId`.
If an entity has no external ID, its display name is used in the compiled prompt with a warning.

---

## Multi-series

Each user can create and be a member of multiple independent series. The active series is
reflected in the URL (`/series/:seriesId/...`). Switch series from the sidebar picker.

---

## Roles

| Role | Capabilities |
|---|---|
| OWNER | Full access, cannot be removed |
| ADMIN | Manage members, providers, and settings |
| WRITER | Create/edit all story content |
| PRODUCER | Review content, manage assets |
| VIEWER | Read-only access |

---

## Backup and restore

All series data is stored in PostgreSQL. Back up the Docker volume:
```bash
docker compose -f infra/compose.yaml exec postgres pg_dump -U lorelight lorelight > backup.sql
```

Asset files are in MinIO. Access the MinIO console at `http://localhost:9001`.

---

## Import from localStorage

If you have existing data from the old single-page version, use the Import flow in the Settings
page to preview and commit your old `lorelight-project-v2` data into a new series.
