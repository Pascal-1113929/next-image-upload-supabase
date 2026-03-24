import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// Read seed data from JSON file
const seedDataPath = join(__dirname, 'seed-data.json')
const seedData = JSON.parse(readFileSync(seedDataPath, 'utf-8'))

// Initialize Supabase client for local development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('SUPABASE_URL:', supabaseUrl)
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey)

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface TrainType {
    name: string
    class_name: string
    description: string
}

interface TrainOperator {
    name: string
    slug: string
    countryCode: string
}

interface Station {
    name: string
    countryCode: string
    stationCode: string
    longitude: number
    latitude: number
}

interface Train {
    number: string
    altNumber: string
    trainType: string
    operator: string
}

interface SeedData {
    trainTypes: TrainType[]
    trainoperators: TrainOperator[]
    stations: Station[]
    trains: Train[]
}

async function seedDatabase() {
    console.log('🌱 Starting database seeding from JSON...')

    try {
        const data = seedData as SeedData

        // 1. Seed train types
        console.log('📦 Seeding train types...')
        for (const type of data.trainTypes) {
            const { error: typeError } = await supabase
                .from('train_types')
                .insert({
                    name: type.name,
                    class_name: type.class_name,
                    description: type.description,
                })
                .select()
                .single()

            // Ignore duplicate errors
            if (typeError && !typeError.message.includes('duplicate')) {
                console.error(`❌ Error seeding train type ${type.name}:`, typeError)
            }
        }
        console.log(`✅ Seeded ${data.trainTypes.length} train types`)

        // 2. Seed train operators
        console.log('🏢 Seeding train operators...')
        for (const operator of data.trainoperators) {
            const { error: operatorError } = await supabase
                .from('train_operators')
                .insert({
                    name: operator.name,
                    slug: operator.slug,
                    country_code: operator.countryCode,
                })
                .select()
                .single()

            // Ignore duplicate errors
            if (operatorError && !operatorError.message.includes('duplicate')) {
                console.error(`❌ Error seeding train operator ${operator.name}:`, operatorError)
            }
        }
        console.log(`✅ Seeded ${data.trainoperators.length} train operators`)

        // 3. Seed stations with PostGIS geography
        console.log('🚉 Seeding stations...')
        for (const station of data.stations) {
            const { error: stationError } = await supabase.rpc('insert_station', {
                p_name: station.name,
                p_country_code: station.countryCode,
                p_station_code: station.stationCode,
                p_longitude: station.longitude,
                p_latitude: station.latitude,
            })

            if (stationError) {
                console.error(`❌ Error seeding station ${station.name}:`, stationError)
            }
        }
        console.log(`✅ Seeded ${data.stations.length} stations`)

        // 4. Get train type and operator IDs for reference
        const { data: trainTypes } = await supabase
            .from('train_types')
            .select('id, class_name')

        const trainTypeMap = new Map(
            trainTypes?.map(tt => [tt.class_name, tt.id]) || []
        )

        const { data: trainOperators } = await supabase
            .from('train_operators')
            .select('id, name')

        const operatorMap = new Map(
            trainOperators?.map(op => [op.name, op.id]) || []
        )

        // 5. Seed individual trains
        console.log('🚂 Seeding trains...')
        for (const train of data.trains) {
            const trainTypeId = trainTypeMap.get(train.trainType)
            const operatorId = operatorMap.get(train.operator)

            if (!trainTypeId) {
                console.warn(`⚠️  Skipping train ${train.number}: type ${train.trainType} not found`)
                continue
            }

            if (!operatorId) {
                console.warn(`⚠️  Skipping train ${train.number}: operator ${train.operator} not found`)
                continue
            }

            const { error: trainError } = await supabase
                .from('trains')
                .insert({
                    train_number: train.number,
                    alt_number: train.altNumber,
                    train_type_id: trainTypeId,
                    operator_id: operatorId,
                })

            // Ignore duplicate errors
            if (trainError && !trainError.message.includes('duplicate')) {
                console.error(`❌ Error seeding train ${train.number}:`, trainError)
            }
        }
        console.log(`✅ Seeded ${data.trains.length} trains`)

        console.log('🎉 Database seeding completed successfully!')
    } catch (error) {
        console.error('💥 Seeding failed:', error)
        process.exit(1)
    }
}

// Run the seeding function
seedDatabase()
