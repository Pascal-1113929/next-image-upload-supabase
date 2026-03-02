import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
// Initialize Supabase client for local development
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Paths
const EXPORT_DIR = join(__dirname, 'exported-data')
const TABLES_FILE = join(EXPORT_DIR, 'train_tables.json')
const USERS_FILE = join(EXPORT_DIR, 'users.json')
const BUCKET_DIR = join(EXPORT_DIR, 'train-images')

async function importTables() {
  console.log('📦 Importing tables...')
  const tablesData = JSON.parse(readFileSync(TABLES_FILE, 'utf-8'))

  for (const [table, rows] of Object.entries(tablesData)) {
    for (const row of rows as any[]) {
      const { error } = await supabase.from(table).insert(row)
      if (error) console.error(`❌ Failed to insert row into ${table}:`, error)
    }
    console.log(`✅ Imported ${rows.length} rows into ${table}`)
  }
}

async function importUsers() {
  console.log('👤 Importing users...')
  try {
    const users = JSON.parse(readFileSync(USERS_FILE, 'utf-8'))

    for (const user of users) {
      const { error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password_hash ? undefined : 'TempPassword123!', // cannot restore real password
        email_confirm: user.email_confirmed_at ? true : false,
      })

      if (error) console.error(`❌ Failed to create user ${user.email}:`, error)
    }

    console.log(`✅ Imported ${users.length} users`)
  } catch (err) {
    console.warn('⚠️ Users import skipped (likely local dev without auth schema)')
  }
}

async function importBucket() {
  console.log('📁 Importing bucket files...')
  const files = readdirSync(BUCKET_DIR)

  for (const fileName of files) {
    const filePath = join(BUCKET_DIR, fileName)
    const fileData = readFileSync(filePath)

    const { error } = await supabase.storage
      .from('train-images')
      .upload(fileName, fileData, { upsert: true })

    if (error) console.error(`❌ Failed to upload ${fileName}:`, error)
    else console.log(`✅ Uploaded ${fileName}`)
  }

  console.log(`💾 Bucket import completed`)
}

async function main() {
  try {
    await importTables()
    await importUsers()
    await importBucket()
    console.log('🎉 Re-import completed successfully!')
  } catch (error) {
    console.error('💥 Re-import failed:', error)
  }
}

main()