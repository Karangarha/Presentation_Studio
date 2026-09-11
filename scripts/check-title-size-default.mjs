// Guards against the four title_size_px defaults (3 JS fallbacks + the
// migration) drifting out of sync with each other.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const EXPECTED = 64

const supabaseTs = readFileSync(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8')
assert.match(supabaseTs, new RegExp(`titleSizePx: data\\?\\.title_size_px \\?\\? ${EXPECTED},`),
  `supabase.ts fetchSettings fallback should be ${EXPECTED}`)

const hookTs = readFileSync(new URL('../src/lib/usePresentationData.ts', import.meta.url), 'utf8')
assert.match(hookTs, new RegExp(`titleSizePx: ${EXPECTED},`),
  `usePresentationData.ts defaultSettings should be ${EXPECTED}`)

const adminTsx = readFileSync(new URL('../src/components/AdminDashboard.tsx', import.meta.url), 'utf8')
assert.match(adminTsx, new RegExp(`titleSizePx: ${EXPECTED}, titleBold`),
  `AdminDashboard.tsx initial settings state should be ${EXPECTED}`)

const migrationSql = readFileSync(new URL('../supabase/migrations/20260911140000_increase_title_size_default.sql', import.meta.url), 'utf8')
assert.match(migrationSql, new RegExp(`set default ${EXPECTED}`, 'g'),
  'migration should set default to the same value')
assert.equal((migrationSql.match(new RegExp(`set default ${EXPECTED}`, 'g')) ?? []).length, 2,
  'migration should update both presentation_settings and settings')

console.log('title size default OK')
