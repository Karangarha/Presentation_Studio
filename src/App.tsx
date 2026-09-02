import { useEffect, useState } from 'react'
import { fetchLogos, fetchSettings, fetchSlides, type Slide } from './lib/supabase'
import LogoSlot from './components/LogoSlot'
import SlideCarousel from './components/SlideCarousel'

function App() {
  const [slides, setSlides] = useState<Slide[] | null>(null)
  const [logos, setLogos] = useState<{ left: string | null; right: string | null }>({
    left: null,
    right: null,
  })
  const [autoplayIntervalMs, setAutoplayIntervalMs] = useState(5000)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    Promise.all([fetchSlides(), fetchLogos(), fetchSettings()])
      .then(([loadedSlides, loadedLogos, settings]) => {
        setSlides(loadedSlides)
        setLogos(loadedLogos)
        setAutoplayIntervalMs(settings.autoplayIntervalMs)
      })
      .catch((err: Error) => setLoadError(err.message))
  }, [])

  useEffect(() => {
    if (!slides || slides.length === 0) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, autoplayIntervalMs)
    return () => clearInterval(id)
  }, [slides, autoplayIntervalMs])

  function handleLogoUploaded(slot: 'left' | 'right', url: string) {
    setLogos((prev) => ({ ...prev, [slot]: url }))
  }

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

  return (
    <div className="relative flex min-h-svh w-full flex-col bg-bg text-text font-sans">
      <LogoSlot slot="left" url={logos.left} onUploaded={handleLogoUploaded} />
      <LogoSlot slot="right" url={logos.right} onUploaded={handleLogoUploaded} />
      <SlideCarousel slides={slides} index={index} />
    </div>
  )
}

export default App
