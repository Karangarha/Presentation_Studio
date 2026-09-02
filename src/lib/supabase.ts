export type Slide =
  | { type: 'title'; eyebrow: string; heading: string; subheading: string }
  | { type: 'content'; heading: string; bullets: string[] }

export type Logos = { left: string | null; right: string | null }

export type Settings = { autoplayIntervalMs: number }

type SlideRow = {
  type: 'title' | 'content'
  eyebrow: string | null
  heading: string
  subheading: string | null
  bullets: string[] | null
}

type LogoRow = { slot: 'left' | 'right'; url: string | null }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const headers = {
  apikey: SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
}

export async function fetchSlides(): Promise<Slide[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/slides?select=*&order=position`, { headers })
  if (!res.ok) throw new Error(`Failed to load slides: ${res.status}`)
  const rows: SlideRow[] = await res.json()
  return rows.map((row): Slide =>
    row.type === 'title'
      ? { type: 'title', eyebrow: row.eyebrow ?? '', heading: row.heading, subheading: row.subheading ?? '' }
      : { type: 'content', heading: row.heading, bullets: row.bullets ?? [] },
  )
}

export async function fetchLogos(): Promise<Logos> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/logos?select=slot,url`, { headers })
  if (!res.ok) throw new Error(`Failed to load logos: ${res.status}`)
  const rows: LogoRow[] = await res.json()
  const logos: Logos = { left: null, right: null }
  for (const row of rows) logos[row.slot] = row.url
  return logos
}

export async function fetchSettings(): Promise<Settings> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=autoplay_interval_ms&limit=1`, {
    headers,
  })
  if (!res.ok) throw new Error(`Failed to load settings: ${res.status}`)
  const rows: { autoplay_interval_ms: number }[] = await res.json()
  return { autoplayIntervalMs: rows[0]?.autoplay_interval_ms ?? 5000 }
}

export async function updateLogoUrl(slot: 'left' | 'right', url: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/logos?slot=eq.${slot}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) throw new Error(`Failed to update ${slot} logo: ${res.status}`)
}
