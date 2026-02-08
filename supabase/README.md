# Database Seeding

This directory contains the database schema, migrations, and seeding scripts for the trainspotting application.

## Files

- **migrations/**: Database migration files
- **seed-data.json**: JSON file containing seed data for train types, stations, and trains
- **seed.sql**: SQL helper functions for seeding
- **seed-from-json.ts**: TypeScript script to seed the database from the JSON file

## Seeding the Database

### Method 1: Using the TypeScript Script (Recommended)

1. Install dependencies (if not already done):

   ```bash
   pnpm install
   ```

2. Make sure your local Supabase instance is running:

   ```bash
   pnpm dlx supabase start
   ```

3. Run the seeding script:
   ```bash
   pnpm db:seed
   ```

### Method 2: Reset and Seed with Supabase

Reset the database (drops all data, runs migrations, and executes seed.sql):

```bash
pnpm dlx supabase db reset
```

Note: The seed.sql file now provides helper functions. To use the JSON data, use Method 1 instead.

## Customizing Seed Data

Edit `seed-data.json` to add or modify:

- **trainTypes**: Different types of trains (e.g., ICE, TGV, Pendolino)
- **stations**: Train stations with geographic coordinates
- **trains**: Individual train units with their numbers and types

Example structure:

```json
{
  "trainTypes": [
    {
      "name": "ICE 3 Neo",
      "description": "Siemens Velaro D high-speed EMU"
    }
  ],
  "stations": [
    {
      "name": "Amsterdam Centraal",
      "countryCode": "NL",
      "stationCode": "AMS",
      "longitude": 4.9003,
      "latitude": 52.378
    }
  ],
  "trains": [
    {
      "trainNumber": "4601",
      "trainTypeName": "ICE 3 Neo"
    }
  ]
}
```

After editing, run `pnpm db:seed` to apply the changes.
