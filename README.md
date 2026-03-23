Perfect — now that I have your exact `docker-compose.yml` and the way your Supabase container works (via `supabase-entrypoint.sh` with `pnpm dlx supabase start` + `pnpm db:seed_old`), I can write a **full, polished README** for your project that’s fully accurate, zero-config, and ready to publish. Here’s the complete version:

---

# Next.js + Supabase Image Upload App (Docker Compose)

This repository contains a **Next.js** application connected to **Supabase**, fully containerized using **Docker Compose**. You can run the entire app locally with **one command** — no Node.js or PostgreSQL installation required.

GitHub repository: [https://github.com/Pascal-1113929/next-image-upload-supabase](https://github.com/Pascal-1113929/next-image-upload-supabase)

---

## Features

* ✅ Next.js frontend with hot reload
* ✅ Supabase backend (Postgres, Auth, Realtime, Storage)
* ✅ Image upload and storage via Supabase Storage
* ✅ Fully containerized with Docker Compose
* ✅ Automatic database seeding (`pnpm db:seed_old`)

---

## Prerequisites

* [Docker](https://www.docker.com/get-started)
* [Docker Compose](https://docs.docker.com/compose/install/)

---

## Setup

1. **Clone the repository**:

```bash
git clone https://github.com/Pascal-1113929/next-image-upload-supabase.git
cd next-image-upload-supabase
```

2. **Copy environment variables**:

```bash
cp env.example .env.local
```

3. **Edit `.env.local`** with your Supabase keys

---

## Running the App

Start all services with Docker Compose:

```bash
docker-compose up
```

Services started:

* `nextjs` – Next.js frontend at [http://localhost:3000](http://localhost:3000)
* `supabase_local` – Supabase backend:

  * API: [http://localhost:8000](http://localhost:8000)
  * Postgres: `54321`
  * Realtime: `54322`

Stop the app with:

```bash
docker-compose down
```

---

## Zero-Config Supabase Initialization

Your Supabase container automatically handles database initialization and seeding:

1. Starts Supabase locally: `pnpm dlx supabase start`
2. Seeds the database: `pnpm db:seed_old`

No manual setup is required — your database and storage bucket are ready after the first run.

### Example `supabase-entrypoint.sh`

```bash
#!/bin/sh
set -e

echo "Starting Supabase local container..."

# Start Supabase services
pnpm dlx supabase start

# Seed database with custom script
pnpm db:seed_old
```

> Make sure the script is executable:
>
> ```bash
> chmod +x supabase/supabase-entrypoint.sh
> ```

---

## Development

* Hot reload works automatically inside the `nextjs` container.
* The Supabase database persists in `supabase/`.
* Run Supabase CLI commands inside the container:

```bash
docker-compose exec supabase_local sh
```

---

## Useful Docker Commands

* **Start containers**: `docker-compose up`
* **Stop containers**: `docker-compose down`
* **Rebuild containers**: `docker-compose up --build`

