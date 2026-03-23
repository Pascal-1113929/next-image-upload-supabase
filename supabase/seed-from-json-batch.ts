import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read seed data from JSON
const seedDataPath = join(__dirname, 'seed-data.json');
const seedData = JSON.parse(readFileSync(seedDataPath, 'utf-8'));

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'YOUR_SERVICE_ROLE_KEY_HERE';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TrainType { name: string; class_name: string; description: string; }
interface TrainOperator { name: string; slug: string; countryCode: string; }
interface Station { name: string; countryCode: string; stationCode: string | null; longitude: number; latitude: number; }
interface Train { number: string; altNumber: string; trainType: string; operator: string; }

interface SeedData {
  trainTypes: TrainType[];
  trainoperators: TrainOperator[];
  stations: Station[];
  trains: Train[];
}

// Utility for batching
async function batchInsert<T>(table: string, data: T[], batchSize = 500) {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch).select();
    if (error) console.error(`❌ Error inserting batch into ${table}:`, error);
    else console.log(`✅ Inserted batch ${i}-${i + batch.length - 1} into ${table}`);
  }
}

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  const data = seedData as SeedData;

  // 1. Seed train types
  console.log('📦 Seeding train types...');
  await batchInsert('train_types', data.trainTypes.map(tt => ({
    name: tt.name,
    class_name: tt.class_name,
    description: tt.description,
  })));

  // 2. Seed train operators
  console.log('🏢 Seeding train operators...');
  await batchInsert('train_operators', data.trainoperators.map(op => ({
    name: op.name,
    slug: op.slug,
    country_code: op.countryCode,
  })));

  // 3. Seed stations using RPC or direct insert
  console.log('🚉 Seeding stations...');
  for (let i = 0; i < data.stations.length; i += 500) {
    const batch = data.stations.slice(i, i + 500);
    const insertData = batch.map(st => ({
      name: st.name,
      country_code: st.countryCode,
      station_code: st.stationCode,
      longitude: st.longitude,
      latitude: st.latitude,
      location: `POINT(${st.longitude} ${st.latitude})`,
    }));
    const { error } = await supabase.from('train_stations').insert(insertData);
    if (error) console.error(`❌ Error inserting stations ${i}-${i + batch.length - 1}:`, error);
    else console.log(`✅ Inserted stations ${i}-${i + batch.length - 1}`);
  }

// 4. Map train types and operators to IDs (fixed normalization)
const { data: trainTypes } = await supabase.from('train_types').select('id, class_name');
const trainTypeMap = new Map(
  trainTypes?.map(tt => [tt.class_name.trim().toLowerCase(), tt.id]) || []
);

const { data: trainOperators } = await supabase.from('train_operators').select('id, name');
const operatorMap = new Map(
  trainOperators?.map(op => [op.name.trim().toLowerCase(), op.id]) || []
);

// 5. Seed trains in batches (normalized lookup)
console.log('🚂 Seeding trains...');
const trainRows = data.trains
  .map(train => {
    const trainTypeId = trainTypeMap.get(train.trainType.trim().toLowerCase());
    const operatorId = operatorMap.get(train.operator.trim().toLowerCase());
    if (!trainTypeId || !operatorId) {
      console.warn(`⚠️  Skipping train ${train.number}: missing type/operator`);
      return null;
    }
    return {
      train_number: train.number,
      alt_number: train.altNumber,
      train_type_id: trainTypeId,
      operator_id: operatorId,
    };
  })
  .filter(Boolean) as any[];

await batchInsert('trains', trainRows, 500);

  console.log('🎉 Database seeding completed!');
}

seedDatabase().catch(err => {
  console.error('💥 Seeding failed:', err);
  process.exit(1);
});