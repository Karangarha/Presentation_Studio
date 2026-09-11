import { createClient, type RealtimeChannel } from '@supabase/supabase-js'

export type Slide = {
  id: number
  position: number
  type: 'title' | 'content'
  eyebrow: string
  heading: string
  subheading: string
  bullets: string[]
  imageUrl: string | null
  degreeYear: string
  name: string
  jobTitle: string
  company: string
  companyLogoUrl: string | null
}

export type Logos = { left: string | null; right: string | null }
export type Settings = {
  autoplayIntervalMs: number
  logoScale: number
  titleText: string
  titleColor: string
  titleSizePx: number
  titleBold: boolean
}
export type Background = { url: string | null }
export type Profile = { id: string; username: string; displayName: string | null }
export type Presentation = {
  id: string
  ownerId: string
  title: string
  slug: string
  isPublic: boolean
  updatedAt: string
}
export type SlideInput = Omit<Slide, 'id' | 'position'> & { position?: number }

type SlideRow = {
  id: number
  position: number
  type: 'title' | 'content'
  eyebrow: string | null
  heading: string
  subheading: string | null
  bullets: string[] | null
  image_url: string | null
  degree_year: string | null
  name: string | null
  job_title: string | null
  company: string | null
  company_logo_url: string | null
}

type LogoRow = { slot: 'left' | 'right'; url: string | null }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(`Failed to load session: ${error.message}`)
  return data.session
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Sign in failed: ${error.message}`)
}

export async function signUp(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) throw new Error(`Sign up failed: ${error.message}`)
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(`Sign out failed: ${error.message}`)
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('id,username,display_name').eq('id', userId).maybeSingle()
  if (error) throw new Error(`Failed to load profile: ${error.message}`)
  return data
    ? { id: data.id, username: data.username, displayName: data.display_name }
    : null
}

export async function createProfile(userId: string, username: string, displayName: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, username, display_name: displayName || null })
    .select('id,username,display_name')
    .single()
  if (error) throw new Error(`Failed to create profile: ${error.message}`)
  return { id: data.id, username: data.username, displayName: data.display_name }
}

export async function fetchPresentations(ownerId: string): Promise<Presentation[]> {
  const { data, error } = await supabase
    .from('presentations')
    .select('id,owner_id,title,slug,is_public,updated_at')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(`Failed to load presentations: ${error.message}`)
  return data.map((row) => ({
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    slug: row.slug,
    isPublic: row.is_public,
    updatedAt: row.updated_at,
  }))
}

export async function fetchPresentation(id: string): Promise<Presentation | null> {
  const { data, error } = await supabase
    .from('presentations')
    .select('id,owner_id,title,slug,is_public,updated_at')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Failed to load presentation: ${error.message}`)
  return data
    ? {
        id: data.id,
        ownerId: data.owner_id,
        title: data.title,
        slug: data.slug,
        isPublic: data.is_public,
        updatedAt: data.updated_at,
      }
    : null
}

export async function createPresentation(ownerId: string, title: string, slug: string): Promise<Presentation> {
  const { data, error } = await supabase
    .from('presentations')
    .insert({ owner_id: ownerId, title, slug })
    .select('id,owner_id,title,slug,is_public,updated_at')
    .single()
  if (error) throw new Error(`Failed to create presentation: ${error.message}`)
  const { error: settingsError } = await supabase.from('presentation_settings').insert({ presentation_id: data.id })
  if (settingsError) {
    await supabase.from('presentations').delete().eq('id', data.id)
    throw new Error(`Failed to initialize presentation settings: ${settingsError.message}`)
  }
  const { error: claimError } = await supabase.rpc('claim_legacy_presentation', { p_presentation_id: data.id })
  if (claimError) {
    await supabase.from('presentations').delete().eq('id', data.id)
    throw new Error(`Failed to migrate the existing presentation: ${claimError.message}`)
  }
  return {
    id: data.id,
    ownerId: data.owner_id,
    title: data.title,
    slug: data.slug,
    isPublic: data.is_public,
    updatedAt: data.updated_at,
  }
}

export async function updatePresentation(
  id: string,
  input: Partial<Pick<Presentation, 'title' | 'slug' | 'isPublic'>>,
): Promise<void> {
  const { error } = await supabase
    .from('presentations')
    .update({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.isPublic !== undefined ? { is_public: input.isPublic } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw new Error(`Failed to update presentation: ${error.message}`)
}

export async function deletePresentation(id: string): Promise<void> {
  const { error } = await supabase.from('presentations').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete presentation: ${error.message}`)
}

export async function fetchPublicPresentation(username: string, slug: string): Promise<Presentation | null> {
  const { data, error } = await supabase.rpc('get_public_presentation', {
    p_username: username,
    p_slug: slug,
  })
  if (error) throw new Error(`Failed to load public presentation: ${error.message}`)
  const row = data?.[0]
  return row
    ? { id: row.id, ownerId: '', title: row.title, slug: row.slug, isPublic: true, updatedAt: '' }
    : null
}

function toSlide(row: SlideRow): Slide {
  return {
    id: row.id,
    position: row.position,
    type: row.type,
    eyebrow: row.eyebrow ?? '',
    heading: row.heading,
    subheading: row.subheading ?? '',
    bullets: row.bullets ?? [],
    imageUrl: row.image_url,
    degreeYear: row.degree_year ?? row.eyebrow ?? '',
    name: row.name ?? '',
    jobTitle: row.job_title ?? row.heading,
    company: row.company ?? '',
    companyLogoUrl: row.company_logo_url,
  }
}

export async function fetchSlides(presentationId?: string): Promise<Slide[]> {
  let query = supabase.from('slides').select('*').order('position')
  if (presentationId) query = query.eq('presentation_id', presentationId)
  const { data, error } = await query
  if (error) throw new Error(`Failed to load slides: ${error.message}`)
  return (data as SlideRow[]).map(toSlide)
}

export async function createSlide(input: SlideInput, presentationId?: string): Promise<Slide> {
  const { data, error } = await supabase
    .from('slides')
    .insert({
      position: input.position ?? 1,
      type: input.type,
      eyebrow: input.eyebrow || null,
      heading: input.heading,
      subheading: input.subheading || null,
      bullets: input.bullets,
      image_url: input.imageUrl,
      degree_year: input.degreeYear || null,
      name: input.name || null,
      job_title: input.jobTitle || null,
      company: input.company || null,
      company_logo_url: input.companyLogoUrl,
      ...(presentationId ? { presentation_id: presentationId } : {}),
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to create slide: ${error.message}`)
  return toSlide(data as SlideRow)
}

export async function updateSlide(id: number, input: Partial<SlideInput>): Promise<Slide> {
  const { data, error } = await supabase
    .from('slides')
    .update({
      ...(input.position !== undefined ? { position: input.position } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.eyebrow !== undefined ? { eyebrow: input.eyebrow || null } : {}),
      ...(input.heading !== undefined ? { heading: input.heading } : {}),
      ...(input.subheading !== undefined ? { subheading: input.subheading || null } : {}),
      ...(input.bullets !== undefined ? { bullets: input.bullets } : {}),
      ...(input.imageUrl !== undefined ? { image_url: input.imageUrl } : {}),
      ...(input.degreeYear !== undefined ? { degree_year: input.degreeYear || null } : {}),
      ...(input.name !== undefined ? { name: input.name || null } : {}),
      ...(input.jobTitle !== undefined ? { job_title: input.jobTitle || null } : {}),
      ...(input.company !== undefined ? { company: input.company || null } : {}),
      ...(input.companyLogoUrl !== undefined ? { company_logo_url: input.companyLogoUrl } : {}),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`Failed to update slide: ${error.message}`)
  return toSlide(data as SlideRow)
}

export async function deleteSlide(id: number): Promise<void> {
  const { error } = await supabase.from('slides').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete slide: ${error.message}`)
}

export async function reorderSlides(slides: Slide[]): Promise<void> {
  await Promise.all(slides.map((slide, index) => updateSlide(slide.id, { position: -(index + 1) })))
  await Promise.all(slides.map((slide, index) => updateSlide(slide.id, { position: index + 1 })))
}

export async function fetchLogos(presentationId?: string): Promise<Logos> {
  const result = presentationId
    ? await supabase.from('presentation_logos').select('slot,url').eq('presentation_id', presentationId)
    : await supabase.from('logos').select('slot,url')
  const { data, error } = result
  if (error) throw new Error(`Failed to load logos: ${error.message}`)
  const logos: Logos = { left: null, right: null }
  for (const row of (data as LogoRow[])) logos[row.slot] = row.url
  return logos
}

export async function updateLogoUrl(slot: 'left' | 'right', url: string, presentationId?: string): Promise<void> {
  const result = presentationId
    ? await supabase.from('presentation_logos').upsert({ presentation_id: presentationId, slot, url }, { onConflict: 'presentation_id,slot' })
    : await supabase.from('logos').upsert({ slot, url }, { onConflict: 'slot' })
  const { error } = result
  if (error) throw new Error(`Failed to update ${slot} logo: ${error.message}`)
}

export async function fetchSettings(presentationId?: string): Promise<Settings> {
  const result = presentationId
    ? await supabase.from('presentation_settings').select('autoplay_interval_ms,logo_scale,title_text,title_color,title_size_px,title_bold').eq('presentation_id', presentationId).maybeSingle()
    : await supabase.from('settings').select('autoplay_interval_ms,logo_scale,title_text,title_color,title_size_px,title_bold').limit(1).single()
  const { data, error } = result
  if (error && error.code !== 'PGRST116') throw new Error(`Failed to load settings: ${error.message}`)
  return {
    autoplayIntervalMs: data?.autoplay_interval_ms ?? 5000,
    logoScale: data?.logo_scale ?? 1,
    titleText: data?.title_text ?? 'Department of Computer Science and Technology',
    titleColor: data?.title_color ?? '#ffffff',
    titleSizePx: data?.title_size_px ?? 42,
    titleBold: data?.title_bold ?? true,
  }
}

export async function updateSettings(settings: Settings, presentationId?: string): Promise<void> {
  const result = presentationId
    ? await supabase.from('presentation_settings').upsert({ presentation_id: presentationId, autoplay_interval_ms: settings.autoplayIntervalMs, logo_scale: settings.logoScale, title_text: settings.titleText, title_color: settings.titleColor, title_size_px: settings.titleSizePx, title_bold: settings.titleBold }, { onConflict: 'presentation_id' })
    : await supabase.from('settings').upsert({ id: true, autoplay_interval_ms: settings.autoplayIntervalMs, logo_scale: settings.logoScale, title_text: settings.titleText, title_color: settings.titleColor, title_size_px: settings.titleSizePx, title_bold: settings.titleBold }, { onConflict: 'id' })
  const { error } = result
  if (error) throw new Error(`Failed to update settings: ${error.message}`)
}

export async function fetchBackground(presentationId?: string): Promise<Background> {
  const result = presentationId
    ? await supabase.from('presentation_backgrounds').select('url').eq('presentation_id', presentationId).maybeSingle()
    : await supabase.from('backgrounds').select('url').eq('id', true).maybeSingle()
  const { data, error } = result
  if (error) throw new Error(`Failed to load background: ${error.message}`)
  return { url: data?.url ?? null }
}

export async function updateBackground(url: string, presentationId?: string): Promise<void> {
  const result = presentationId
    ? await supabase.from('presentation_backgrounds').upsert({ presentation_id: presentationId, url }, { onConflict: 'presentation_id' })
    : await supabase.from('backgrounds').upsert({ id: true, url }, { onConflict: 'id' })
  const { error } = result
  if (error) throw new Error(`Failed to update background: ${error.message}`)
}

export function subscribeToPresentationChanges(onChange: () => void): () => void {
  const channel: RealtimeChannel = supabase
    .channel('presentation-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'slides' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'logos' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'backgrounds' }, onChange)
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
