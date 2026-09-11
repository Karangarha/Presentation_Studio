import SlideCarousel from './SlideCarousel'
import LogoSlot from './LogoSlot'
import type { Logos, Settings, Slide } from '../lib/supabase'

type PresentationFrameProps = {
  slides: Slide[]
  index: number
  logos: Logos
  settings: Settings
  backgroundUrl: string | null
  embedded?: boolean
  onCanvasClick?: () => void
}

function PresentationFrame({
  slides,
  index,
  logos,
  settings,
  backgroundUrl,
  embedded = false,
  onCanvasClick,
}: PresentationFrameProps) {
  return (
    <div
      className={`presentation-frame relative flex h-full w-full overflow-hidden bg-bg bg-cover bg-center text-text font-sans ${
        embedded ? 'presentation-frame-embedded' : ''
      }`}
      style={{
        containerType: 'inline-size',
        ...(backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : {}),
      } as React.CSSProperties}
      onClick={onCanvasClick}
    >
      {backgroundUrl && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,rgb(2_6_23_/_0.42)_100%),linear-gradient(rgb(2_6_23_/_0.55),rgb(2_6_23_/_0.68))]" />
      )}
      <LogoSlot slot="left" url={logos.left} onUploaded={() => undefined} readOnly scale={settings.logoScale} embedded={embedded} contained />
      <LogoSlot slot="right" url={logos.right} onUploaded={() => undefined} readOnly scale={settings.logoScale} embedded={embedded} contained />
      {settings.titleText && (
        <div
          className={`pointer-events-none ${embedded ? 'absolute' : 'fixed'} inset-x-0 top-4 z-20 mx-auto flex items-center justify-center text-center leading-[0.92] tracking-tight drop-shadow-md ${
            settings.titleBold ? 'font-bold' : 'font-normal'
          }`}
          style={{
            color: settings.titleColor,
            fontSize: embedded ? `clamp(12px, 3.2cqw, ${settings.titleSizePx}px)` : `${settings.titleSizePx}px`,
            height: embedded ? `${Math.min(128 * settings.logoScale, 9)}cqw` : `${128 * settings.logoScale}px`,
          }}
          aria-label="Presentation title"
        >
          {settings.titleText}
        </div>
      )}
      <SlideCarousel slides={slides} index={index} compact={embedded} fixed={embedded} />
    </div>
  )
}

export default PresentationFrame
