#!/bin/sh
set -e

echo "Starting Supabase local container..."

# Start Supabase services
pnpm dlx supabase start

# Seed database with custom script
pnpm db:seed_old