# FinSight API

**FinSight API** is a **backend-only** REST service for a finance dashboard: teams record **income** and **expense** ledger lines, query them with filters and pagination, and consume **role-aware analytics** (totals, rollups, trends, insights, health score, recommendations, and spending anomaly flags). Access is enforced with **JWT** authentication and **role-based access control** (Viewer, Analyst, Admin). The API ships with **OpenAPI 3** (Swagger UI), optional **Postman** assets, and **Vitest** smoke tests.

---

## Features

- **Auth** — Self-service **register** (new accounts are always **VIEWER**; no privilege escalation via request body), **login** with bcrypt, **me** profile; inactive users cannot log in.
- **Users (Admin)** — List, get, patch, and soft-deactivate users; **ADMIN** only.
- **Financial records** — Typed **INCOME** / **EXPENSE** with amount, category, date, optional description; **ADMIN** creates, updates, and soft-deletes; all authenticated roles can list and read.
- **Dashboard** — Aggregates for the UI:
  - **All authenticated roles:** `summary`, `recent-activity`, **finance health score** (0–100 + status and insights), **rule-based recommendations**, **spending anomaly** detection (explainable rules, not ML).
  - **ANALYST** and **ADMIN:** `category-breakdown`, `monthly-trends`, `insights`.
- **Admin / compliance** — **Audit log** listing (**ADMIN** only): append-only log of user and record lifecycle actions for review.
- **Documentation** — Static OpenAPI document served by **Swagger UI**; Postman collection and environment for scripted flows.

---

## Tech stack

| Layer | Choice |
|--------|--------|
| Runtime | Node.js |
| Language | TypeScript |
| HTTP | Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (`jsonwebtoken`), `Authorization: Bearer` |
| Validation | Zod |
| Security | Helmet, CORS |
| API docs | `swagger-ui-express` + `src/docs/openapi.ts` |
| Tests | Vitest, Supertest |

---

## Repository layout

```text
src/
  app.ts                 # Express app, routes, /health, Swagger
  server.ts              # load env, listen
  config/                # env loader, Prisma client
  docs/                  # openapi.ts, Swagger wiring
  middlewares/           # auth, roles, validate, errors
  modules/
    auth/                # register, login, me
    users/               # admin user API
    records/             # financial ledger
    dashboard/           # aggregates, health score, recommendations, anomalies
    admin/                 # audit log API
  utils/                 # JWT, errors, responses, finance helpers (health score, recommendations, anomalies)
prisma/
  schema.prisma          # User, FinancialRecord, AuditLog, enums
  migrations/              # SQL migrations (commit these)
  seed.ts                  # demo users + sample ledger
tests/
  auth.test.ts             # smoke tests (e.g. /health)
postman/                   # collection + environment (optional)
```

---

## Getting started (step by step)

### Step 1 — Prerequisites

- **Node.js** — LTS (v20 or newer recommended).
- **PostgreSQL** — v15+ compatible with Prisma; database created and reachable from your machine.

### Step 2 — Clone and install dependencies

```bash
git clone <your-repo-url>
cd finsight-api
npm install
```

### Step 3 — Environment variables

Create a **`.env`** file in the project root (do not commit it; it is listed in `.gitignore`). See [Environment variables](#environment-variables) for the full table.

At minimum you need `DATABASE_URL` and `JWT_SECRET`.

### Step 4 — Generate Prisma Client and apply the schema

```bash
npm run db:generate
npm run db:migrate
```

`db:migrate` runs `prisma migrate dev`, which creates or updates tables from `prisma/migrations`. For a throwaway local DB you can use `npm run db:push` instead of migrate, but migrations are preferred for anything you will share or deploy.

### Step 5 — Seed demo data (optional but recommended)

```bash
npm run db:seed
```

The seed **upserts** the three demo users and **appends** sample financial records on each run. For a clean ledger, reset first (`npx prisma migrate reset`) then seed again.

### Step 6 — Run the API in development

```bash
npm run dev
```

Default URL: **`http://localhost:5000`** unless you set `PORT` in `.env`.

### Step 7 — Verify

1. **`GET /health`** → `{ "status": "ok" }`.
2. Open **Swagger UI**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs) (legacy `/docs` redirects to `/api-docs`).
3. **Authorize** with a JWT from **`POST /api/auth/login`** (`data.token`).

### Step 8 — Run tests

```bash
npm test
```

Smoke tests live under `tests/` (for example `/health`). Expand coverage as you add routes.

---

## NPM scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | `tsx watch src/server.ts` — hot reload |
| `npm run build` | `tsc` — compile to `dist/` |
| `npm start` | `node dist/src/server.js` — production entry |
| `npm run db:generate` | `prisma generate` |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:push` | `prisma db push` (schema sync without migration files) |
| `npm run db:seed` | `tsx prisma/seed.ts` |
| `npm test` | `vitest run` |
| `npm run test:watch` | `vitest` watch mode |

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL URL for Prisma |
| `JWT_SECRET` | Yes | Secret for signing access tokens |
| `JWT_EXPIRES_IN` | No | Token lifetime (default `7d`) |
| `PORT` | No | HTTP port (default `5000`) |
| `NODE_ENV` | No | `development` \| `production` \| `test` |

Example **`.env`** (replace with your own secrets):

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/finsight?schema=public"
JWT_SECRET="change-me-to-a-long-random-string"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
```

---

## Role-based access control

| Capability | VIEWER | ANALYST | ADMIN |
|------------|:------:|:-------:|:-----:|
| `POST /api/auth/register`, `POST /api/auth/login` | Public | Public | Public |
| `GET /api/auth/me` | ✓ | ✓ | ✓ |
| `GET /api/records`, `GET /api/records/:id` | ✓ | ✓ | ✓ |
| `POST` / `PATCH` / `DELETE /api/records` | — | — | ✓ |
| `GET /api/dashboard/summary`, `recent-activity`, `health-score`, `recommendations`, `anomalies` | ✓ | ✓ | ✓ |
| `GET /api/dashboard/category-breakdown`, `monthly-trends`, `insights` | — | ✓ | ✓ |
| `GET` / `PATCH` / `DELETE /api/users` | — | — | ✓ |
| `GET /api/admin/audit-logs` | — | — | ✓ |

---

## Database models (overview)

- **User** — Unique `email`, hashed `password`, optional `name`, `role`, `status` (ACTIVE / INACTIVE), soft-delete `isDeleted`, timestamps.
- **FinancialRecord** — `amount`, `type` (INCOME / EXPENSE), `category`, `date`, optional `description`, `createdById` → User, `isDeleted`, timestamps; indexed for queries.
- **AuditLog** — Immutable events (`action`, actor email/id, target type/id/label, `createdAt`) for compliance-style review; related to **User** as performer.

---

## API surface (by module)

- **Auth** — Register, login, current user.
- **Users** — Admin directory and lifecycle (**ADMIN**).
- **Records** — Ledger CRUD (writes **ADMIN** only).
- **Dashboard** — Summary, recent activity, health score, recommendations, anomalies (**VIEWER+**); category breakdown, monthly trends, insights (**ANALYST+**).
- **Admin** — Paginated **audit log** (**ADMIN**).
- **Health** — `GET /health` (no auth).

Full request/response shapes are in **Swagger** (`/api-docs`) and `src/docs/openapi.ts`.

---

## Prisma migrations and seeding

- **Create a new migration** (development):

  ```bash
  npx prisma migrate dev --name describe_your_change
  ```

- **Seed** (configured in `package.json` → `prisma.seed`):

  ```bash
  npm run db:seed
  ```

- **Production deploy** — build the app, then apply migrations:

  ```bash
  npm run build
  npx prisma migrate deploy
  npm start
  ```

---

## Swagger and Postman

- **Swagger UI:** [http://localhost:5000/api-docs](http://localhost:5000/api-docs). Click **Authorize** → **bearerAuth** → paste the raw JWT from `POST /api/auth/login` (`data.token`).
- **Postman:** Import `postman/FinSight-API.postman_collection.json` and `postman/FinSight-API.postman_environment.json`, select the **FinSight API — Local** environment, and run flows (Admin login saves tokens via Tests scripts).

Suggested order: **Health** → **Login (Admin)** → **Records** / **Dashboard** → role checks (Viewer vs Analyst routes).

---

## Seeded demo credentials

| Role | Email | Password |
|------|-------|----------|
| **ADMIN** | `admin@example.com` | `Admin@123` |
| **ANALYST** | `analyst@example.com` | `Analyst@123` |
| **VIEWER** | `viewer@example.com` | `Viewer@123` |

---

## Example reviewer flow (about 5–10 minutes)

1. Install, configure `.env`, migrate, seed, `npm run dev`.
2. Open `/api-docs`, log in as **admin@example.com**, authorize with the returned token.
3. Call `GET /api/dashboard/summary`, `GET /api/dashboard/health-score`, `POST /api/records`, `GET /api/admin/audit-logs`.
4. Log in as **viewer@example.com** and call `GET /api/dashboard/category-breakdown` — expect **403**; `GET /api/dashboard/health-score` — **200**.

---

## Deployment notes

1. Set `NODE_ENV=production`, a strong `JWT_SECRET`, and a managed PostgreSQL `DATABASE_URL`.
2. `npm run build` then `npm start` (runs `node dist/src/server.js`).
3. Run `npx prisma migrate deploy` against the production database before or right after deploy.
4. Terminate HTTPS at your host (Railway, Render, Fly.io, Azure, etc.) and update OpenAPI `servers` in `src/docs/openapi.ts` if you publish a stable public URL.

---

## Assumptions

- PostgreSQL is available and compatible with Prisma’s SQL (for example `to_char` / `date_trunc` where used for trends).
- Clients send sensible **UTC** ISO datetimes for `date` fields; UI timezone formatting is out of scope.
- Soft-deleted records (`isDeleted`) are excluded from aggregates.

---

## Design decisions (short)

- **JWT in the header** — Stateless API; no refresh-token rotation in this scope.
- **ADMIN-only ledger writes** — Clear separation of “who can change the books.”
- **ANALYST** — Read-side analytics beyond the baseline dashboard metrics.
- **Single OpenAPI module** — Docs live next to code without decorator scanning.
- **Audit log** — Append-only trail for admin review.

---

## Future improvements

- Refresh tokens or revocation list; optional session store.
- Broader automated tests (integration DB, RBAC matrix) beyond current smoke tests.
- Idempotent seed for `FinancialRecord` or documented reset workflow.
- OpenAPI generation from Zod to reduce drift.
- Rate limiting and structured logging (request IDs).

---

## Author / intent

Built as a **portfolio / internship** backend: emphasis on **RBAC**, **documented HTTP contracts**, and **reviewer-friendly** tooling (Swagger + Postman), not a frontend SPA.
