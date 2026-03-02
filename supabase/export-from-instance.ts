import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
// Initialize Supabase client for local development
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Output paths
const OUTPUT_DIR = join(__dirname, 'exported-data')
const TABLES_FILE = join(OUTPUT_DIR, 'train_tables.json')
const USERS_FILE = join(OUTPUT_DIR, 'users.json')
const BUCKET_DIR = join(OUTPUT_DIR, 'train-images')

// Ensure output directories exist
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR)
if (!existsSync(BUCKET_DIR)) mkdirSync(BUCKET_DIR)

async function exportTables() {
  console.log('📦 Exporting tables...')

  const tables = ['train_images', 'train_image_locations']
  const exported: Record<string, any[]> = {}

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*')
    if (error) {
      console.error(`❌ Failed to export table ${table}:`, error)
      continue
    }
    exported[table] = data || []
    console.log(`✅ Exported ${data?.length || 0} rows from ${table}`)
  }

  writeFileSync(TABLES_FILE, JSON.stringify(exported, null, 2))
  console.log(`💾 Tables saved to ${TABLES_FILE}`)
}

async function exportUsers() {
  console.log('👤 Exporting users...')

  // Supabase exposes users via the "auth.users" view
  const { data, error } = await supabase.from('auth.users').select('*')

  if (error) {
    console.error('❌ Failed to export users:', error)
    return
  }

  writeFileSync(USERS_FILE, JSON.stringify(data || [], null, 2))
  console.log(`💾 Exported ${data?.length || 0} users to ${USERS_FILE}`)
}

async function exportBucket() {
  console.log('📁 Exporting bucket "train-images"...')

  const { data: files, error } = await supabase.storage
    .from('train-images')
    .list('', { limit: 1000 })

  if (error) {
    console.error('❌ Failed to list bucket files:', error)
    return
  }

  for (const file of files) {
    const { data, error: downloadError } = await supabase.storage
      .from('train-images')
      .download(file.name)

    if (downloadError) {
      console.error(`❌ Failed to download ${file.name}:`, downloadError)
      continue
    }

    const filePath = join(BUCKET_DIR, file.name)
    writeFileSync(filePath, Buffer.from(await data.arrayBuffer()))
    console.log(`✅ Downloaded ${file.name}`)
  }

  console.log(`💾 Bucket files saved to ${BUCKET_DIR}`)
}

async function main() {
  try {
    await exportTables()
    await exportUsers()
    await exportBucket()
    console.log('🎉 Export completed!')
  } catch (error) {
    console.error('💥 Export failed:', error)
  }
}

main()