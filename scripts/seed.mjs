process.loadEnvFile('.env')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env')
}

const headers = {
  apikey: SUPABASE_SECRET_KEY,
  Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
  'Content-Type': 'application/json',
}

const slides = [
  { position: 1, type: 'title', eyebrow: 'ABET Accreditation Review', heading: '[Program Name]', subheading: '[Department] • [University Name] • [Presenter Name], [Date]', bullets: null },
  { position: 2, type: 'content', eyebrow: null, heading: 'Agenda', subheading: null, bullets: ['Program overview & mission', 'Program educational objectives', 'Student outcomes', 'Curriculum', 'Faculty', 'Facilities', 'Continuous improvement process'] },
  { position: 3, type: 'content', eyebrow: null, heading: 'Program Overview & Mission', subheading: null, bullets: ['[Program mission statement placeholder]', '[Degree(s) offered and enrollment size]', '[Accreditation history / review cycle]'] },
  { position: 4, type: 'content', eyebrow: null, heading: 'Program Educational Objectives (Criterion 2)', subheading: null, bullets: ['[Objective 1 placeholder]', '[Objective 2 placeholder]', '[Objective 3 placeholder]', '[How objectives align with program mission]'] },
  { position: 5, type: 'content', eyebrow: null, heading: 'Student Outcomes (Criterion 3)', subheading: null, bullets: ['[Outcome 1: e.g., engineering problem-solving]', '[Outcome 2: e.g., design under constraints]', '[Outcome 3: e.g., communication]', '[Mapping of outcomes to curriculum]'] },
  { position: 6, type: 'content', eyebrow: null, heading: 'Curriculum (Criterion 5)', subheading: null, bullets: ['[Degree plan / course sequence placeholder]', '[Math & science, engineering topics, general education breakdown]', '[Capstone / culminating design experience]'] },
  { position: 7, type: 'content', eyebrow: null, heading: 'Faculty (Criterion 6)', subheading: null, bullets: ['[Faculty size and qualifications placeholder]', '[Areas of expertise coverage]', '[Professional development & scholarly activity]'] },
  { position: 8, type: 'content', eyebrow: null, heading: 'Facilities (Criterion 7)', subheading: null, bullets: ['[Labs, equipment, and computing resources placeholder]', '[Safety and maintenance practices]', '[Library and learning resources]'] },
  { position: 9, type: 'content', eyebrow: null, heading: 'Continuous Improvement (Criterion 4)', subheading: null, bullets: ['[Assessment process placeholder]', '[Data collected and review cadence]', '[Examples of improvements made from past cycles]'] },
  { position: 10, type: 'title', eyebrow: 'Thank You', heading: 'Questions?', subheading: '[Contact information placeholder]', bullets: null },
]

const logos = [
  { slot: 'left', url: null },
  { slot: 'right', url: null },
]

const settings = [{ id: true, autoplay_interval_ms: 5000 }]

async function upsert(table, rows, onConflict) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    throw new Error(`Failed to seed ${table}: ${res.status} ${await res.text()}`)
  }
}

await upsert('slides', slides, 'position')
await upsert('logos', logos, 'slot')
await upsert('settings', settings, 'id')

console.log('Seeded slides, logos, and settings.')
