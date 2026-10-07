# Setup Guide

## Option A — Docker Compose (recommended, one command)

**Prerequisites:** Docker Desktop (or Docker Engine + Compose plugin) installed and running.

```bash
git clone <your-repo-url> smart-inventory
cd smart-inventory

# Copy environment templates (defaults work out of the box for local use)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp ai-service/.env.example ai-service/.env

docker compose up --build
```

What happens:
1. Postgres and Redis start and pass health checks.
2. The AI service image builds, generating sample training data and training the XGBoost + Isolation Forest models at build time.
3. `backend-migrate` runs once: applies the Prisma migration, then seeds demo data (3 warehouses, 5 users across every role, 8 products, sample orders/purchase orders/expiry batch).
4. The backend API starts on port 4000 (internal), the frontend static build is served by its own Nginx on port 80 (internal).
5. The top-level Nginx reverse proxy comes up last and exposes everything on **http://localhost**.

Once it's up:
- App: **http://localhost**
- API docs (Swagger): **http://localhost/api-docs**
- AI service docs: **http://localhost:8000/docs** (also reachable via `http://localhost/ai-service/docs` through the proxy)

**Demo logins** (password for all: `Password@123`):

| Email | Role |
|---|---|
| admin@inventory.io | Admin |
| manager@inventory.io | Warehouse Manager |
| sales@inventory.io | Sales Executive |
| supplier@inventory.io | Supplier |
| viewer@inventory.io | Viewer |

### Stopping / resetting

```bash
docker compose down            # stop containers, keep data
docker compose down -v         # stop and wipe Postgres/Redis volumes (fresh start)
```

### Rebuilding after code changes

```bash
docker compose up --build backend     # just the backend
docker compose up --build frontend    # just the frontend
docker compose up --build ai-service  # retrains models too, since training runs at build time
```

---

## Option B — Local development without Docker

Useful for active development with hot-reload.

### Prerequisites
- Node.js 20+
- Python 3.11+
- A running PostgreSQL 16 instance (local install or `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16-alpine`)
- (Optional) Redis, if you want to exercise caching/rate-limit state beyond in-memory defaults

### 1. Database
```bash
createdb inventory_db   # or via psql: CREATE DATABASE inventory_db;
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# edit .env: set DATABASE_URL to your local Postgres, e.g.
# postgresql://postgres:postgres@localhost:5432/inventory_db?schema=public

npm install
npx prisma generate
npx prisma migrate deploy   # applies the hand-authored initial migration
npx prisma db seed          # loads demo data

npm run dev                 # starts on http://localhost:4000 with ts-node + nodemon
```

Run tests any time with `npm test` (uses a mocked Prisma client for fast route/unit tests — see `tests/__mocks__/@prisma/client.ts`).

### 3. AI service
```bash
cd ai-service
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

python data/generate_sample_data.py
python app/train_model.py

uvicorn app.main:app --reload --port 8000
```

### 4. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                     # http://localhost:5173, proxies /api and /socket.io to :4000
```

Open **http://localhost:5173** and log in with any of the demo accounts above.

---

## Modifying the database schema

1. Edit `backend/prisma/schema.prisma`.
2. Run `npx prisma migrate dev --name describe_your_change` — this generates a new SQL migration file under `prisma/migrations/` and applies it.
3. Commit the new migration folder.

> Note: the very first migration in this repo (`20250101000000_init`) was hand-written and verified by applying it directly to a real PostgreSQL 16 instance, because the environment it was authored in had no network access to Prisma's engine-binary CDN. From this point forward, always let the Prisma CLI generate migrations — don't hand-edit SQL.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `docker compose up` fails pulling images | Check your network/firewall allows Docker Hub |
| Backend can't reach Postgres | Confirm `DATABASE_URL` host is `postgres` (Docker) or `localhost` (local dev) — these are different! |
| AI forecast endpoint returns fallback model even with data | Ensure `ai-service/models/demand_model.joblib` exists — rebuild the AI image or re-run `python app/train_model.py` |
| Socket.io shows "Authentication required" in logs | The frontend must be logged in first — the access token is read from cookies/handshake auth |
| Prisma `generate`/`migrate` fails with a 403 on `binaries.prisma.sh` | Your network is blocking Prisma's engine CDN — this is an environment/firewall issue, not a code issue; allow that domain or use a network with normal internet access |
