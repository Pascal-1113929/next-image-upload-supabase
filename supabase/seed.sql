-- Seed data for local development
-- This script provides helper functions for seeding from external JSON data
-- 
-- To seed the database, you have two options:
-- 1. Run: pnpm tsx supabase/seed-from-json.ts (recommended)
-- 2. Use the helper function below with your JSON data

-- Helper function to insert stations with geographic data
create or replace function insert_station(
  p_name text,
  p_country_code char(2),
  p_station_code text,
  p_longitude numeric,
  p_latitude numeric
)
returns void
language plpgsql
as $$
begin
  insert into public.train_stations (name, country_code, station_code, longitude, latitude, location)
  values (
    p_name,
    p_country_code,
    p_station_code,
    p_longitude,
    p_latitude,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
  )
  on conflict do nothing;
end;
$$;

-- Optional: promote a specific user to admin after they sign up
-- Replace the UUID below with your user's auth ID
-- update public.profiles set is_admin = true where id = '00000000-0000-0000-0000-000000000000';
