import { useCallback, useEffect, useState } from 'react'
import {
  fetchBackground,
  fetchLogos,
  fetchSettings,
  fetchSlides,
  subscribeToPresentationChanges,
  type Logos,
  type Settings,
  type Slide,
} from './supabase'

const defaultSettings: Settings = {
  autoplayIntervalMs: 5000,
  logoScale: 1,
  titleText: 'Department of Computer Science and Technology',
  titleColor: '#ffffff',
  titleSizePx: 64,
  titleBold: true,
}

export function usePresentationData(presentationId?: string) {
  const [slides, setSlides] = useState<Slide[] | null>(null)
  const [logos, setLogos] = useState<Logos>({ left: null, right: null })
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)

  const load = useCallback(() => {
    return Promise.all([
      fetchSlides(presentationId),
      fetchLogos(presentationId).catch(() => ({ left: null, right: null })),
      fetchSettings(presentationId).catch(() => defaultSettings),
      fetchBackground(presentationId).catch(() => ({ url: null })),
    ])
      .then(([loadedSlides, loadedLogos, loadedSettings, background]) => {
        setSlides(loadedSlides)
        setLogos(loadedLogos)
        setSettings(loadedSettings)
        setBackgroundUrl(background.url)
      })
      .catch((err: Error) => setLoadError(err.message))
  }, [presentationId])

  useEffect(() => {
    void load()
    return subscribeToPresentationChanges(() => void load(), presentationId)
  }, [load, presentationId])

  useEffect(() => {
    if (!slides || slides.length === 0) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, settings.autoplayIntervalMs)
    return () => window.clearInterval(id)
  }, [slides, settings.autoplayIntervalMs])

  return { slides, logos, settings, backgroundUrl, index, loadError }
}
