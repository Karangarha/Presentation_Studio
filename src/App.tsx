import { useEffect, useState } from 'react'
import { fetchProfile, fetchPublicPresentation, getSession, supabase } from './lib/supabase'
import { usePresentationData } from './lib/usePresentationData'
import PresentationFrame from './components/PresentationFrame'
import AdminDashboard from './components/AdminDashboard'
import AuthPage from './components/AuthPage'
import UsernameOnboarding from './components/UsernameOnboarding'
import PresentationDashboard from './components/PresentationDashboard'

function App() {
  if (window.location.pathname === '/admin') {
    const presentationId = new URLSearchParams(window.location.search).get('presentation')
    return presentationId ? <ProtectedEditor presentationId={presentationId} /> : <Workspace />
  }
  if (window.location.pathname === '/dashboard') return <Workspace />
  const parts = window.location.pathname.split('/').filter(Boolean)
  if (parts[0] === 'embed' && parts[1]) return <Presentation presentationId={parts[1]} embedded />
  if (parts.length === 2) return <PublicPresentation username={parts[0]} slug={parts[1]} />
  return <Workspace />
}

function PublicPresentation({ username, slug }: { username: string; slug: string }) {
  const [presentationId, setPresentationId] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    void fetchPublicPresentation(username, slug)
      .then((presentation) => {
        if (presentation) setPresentationId(presentation.id)
        else setMissing(true)
      })
      .catch(() => setMissing(true))
  }, [slug, username])
  if (missing) return <div className="flex min-h-svh items-center justify-center bg-bg p-6 text-center text-text">This presentation is not available.</div>
  if (!presentationId) return <div className="flex min-h-svh items-center justify-center bg-bg text-text">Loading presentation…</div>
  return <Presentation presentationId={presentationId} />
}

function Workspace() {
  const [session, setSession] = useState<Awaited<ReturnType<typeof getSession>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof fetchProfile>>>(null)

  useEffect(() => {
    let active = true
    void getSession()
      .then(async (currentSession) => {
        if (!active) return
        setSession(currentSession)
        if (currentSession) setProfile(await fetchProfile(currentSession.user.id))
      })
      .catch(() => undefined)
      .finally(() => { if (active) setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      if (currentSession) void fetchProfile(currentSession.user.id).then(setProfile)
      else setProfile(null)
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])

  if (loading) return <div className="flex min-h-svh items-center justify-center bg-bg text-text">Loading workspace…</div>
  if (!session) return <AuthPage onAuthenticated={() => undefined} />
  if (!profile) return <UsernameOnboarding userId={session.user.id} onComplete={() => void fetchProfile(session.user.id).then(setProfile)} />
  return <PresentationDashboard profile={profile} onOpen={(presentation) => { window.location.href = `/admin?presentation=${presentation.id}` }} onSignedOut={() => setSession(null)} />
}

function ProtectedEditor({ presentationId }: { presentationId: string }) {
  const [session, setSession] = useState<Awaited<ReturnType<typeof getSession>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof fetchProfile>>>(null)

  useEffect(() => {
    void getSession()
      .then(async (currentSession) => {
        setSession(currentSession)
        if (currentSession) setProfile(await fetchProfile(currentSession.user.id))
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex min-h-svh items-center justify-center bg-bg text-text">Loading editor…</div>
  if (!session) return <AuthPage onAuthenticated={() => window.location.reload()} />
  if (!profile) return <UsernameOnboarding userId={session.user.id} onComplete={() => window.location.reload()} />
  return <AdminDashboard presentationId={presentationId} />
}

function Presentation({ presentationId, embedded = false }: { presentationId?: string; embedded?: boolean } = {}) {
  const { slides, logos, settings, backgroundUrl, index, loadError } = usePresentationData(presentationId)

  if (loadError) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-bg p-6 text-center text-text">
        Couldn't load the presentation: {loadError}
      </div>
    )
  }

  if (!slides) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-bg text-text">
        Loading…
      </div>
    )
  }

  if (slides.length === 0) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-bg text-text">
        No slides found — run `npm run seed`.
      </div>
    )
  }

  return (
    <PresentationFrame slides={slides} index={index} logos={logos} settings={settings} backgroundUrl={backgroundUrl} embedded={embedded} />
  )
}

export default App
