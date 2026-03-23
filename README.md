# Next.js + Supabase — Docker Setup (Full Command Guide)

This guide will get your **Next.js app** running with a **local Supabase instance** using Docker Compose, including **automatic TypeScript seeding**.

---

## 1️⃣ Prerequisites

Make sure the following are installed:

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js >= 20](https://nodejs.org/en/download/)
- [pnpm](https://pnpm.io/installation)

Optional (for TypeScript seed scripts):  
- `tsx` (`pnpm add -D tsx` if not global)

---

## 2️⃣ Setup Environment Variables

Create a file `.env.local` in the project root:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://192.168.50.14:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
NEXT_PUBLIC_STORAGE_ACCESS_KEY=625729a08b95bf1b7ff351a663f3a23c
STORAGE_SECRET_KEY=850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907
````

