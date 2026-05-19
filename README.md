# Topsus Backend (NestJS)

Drop-in replacement for the [FastAPI backend](https://github.com/DewaYoGamer/topsus_backend), refactored to NestJS.

Stack: NestJS + Prisma + MySQL + Redis (ioredis) + JWT (HS256) + bcryptjs

## Features

- **Auth** — Login JWT (3 role: admin, dosen, mahasiswa), logout with blacklist, rate limiting
- **Role-based access** — enforced via global guards
- **Caching** — `GET /dosen` & `GET /mahasiswa` cached in Redis (TTL 60s), auto-invalidated on CUD
- **JWT Blacklist** — `POST /auth/logout` blacklists `jti` until token expiry
- **Rate Limiting** — `POST /auth/login` limited to 5 req/60s per IP
- **Graceful degradation** — Redis down ≠ crash (cache miss / skip)
- **Auto-seed** — demo users created on bootstrap (idempotent)

## Prerequisites

- Node.js 20+
- MySQL server
- Redis server (optional — app works without it)

## Setup

```bash
npm install
cp .env.example .env   # edit as needed
npx prisma generate
npx prisma db push     # or use existing DB
npm run build
npm run start:prod
```

Dev mode: `npm run start:dev`

## Env Variables

See `.env.example`. Key vars for production:

| Var | Description |
|-----|-------------|
| `DATABASE_URL` | MySQL connection (accepts `mysql://` natively) |
| `REDIS_URL` | Redis connection |
| `JWT_SECRET` | **Must change in production** |
| `CORS_ORIGINS` | Comma-separated frontend origins |
| `PORT` | Server port (default 8000) |

## API Endpoints (100% compatible with FastAPI version)

| Method | Path | Role |
|--------|------|------|
| POST | `/auth/login` | public (rate-limited) |
| POST | `/auth/logout` | any (blacklist jti) |
| GET | `/auth/me` | any |
| GET | `/dosen` | admin (cached) |
| POST | `/dosen` | admin |
| GET | `/dosen/me` | dosen |
| GET | `/dosen/:id` | admin |
| PUT | `/dosen/:id` | admin |
| DELETE | `/dosen/:id` | admin |
| GET | `/mahasiswa` | admin, dosen (cached) |
| POST | `/mahasiswa` | admin |
| GET | `/mahasiswa/me` | mahasiswa |
| GET | `/mahasiswa/:id` | admin, dosen |
| PUT | `/mahasiswa/:id` | admin |
| DELETE | `/mahasiswa/:id` | admin |
| PATCH | `/mahasiswa/:id/pembimbing` | admin |

## Demo Accounts (after seed)

| Email | Password | Role |
|-------|----------|------|
| admin@kampus.ac.id | admin123 | admin |
| budi@kampus.ac.id | dosen123 | dosen |
| ani@kampus.ac.id | mhs123 | mahasiswa |
| chandra@kampus.ac.id | mhs123 | mahasiswa |

## Deploy to Railway

1. New Service → GitHub Repo → this repo
2. Railway auto-detects Dockerfile
3. Add MySQL & Redis plugins, set env vars
4. Generate domain → done

## Compatibility Notes

- Same JWT secret = tokens from FastAPI backend still valid
- Same bcrypt hashes = existing passwords work
- Same DB schema = point to same MySQL, no migration needed
- Same response shape (snake_case) = frontend works without changes
