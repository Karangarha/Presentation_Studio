import { AnimatePresence, motion } from 'motion/react'
import type { Slide } from '../lib/supabase'

type SlideCarouselProps = {
  slides: Slide[]
  index: number
  compact?: boolean
}

const VISIBLE_RANGE = 2

function getOffset(slideIndex: number, activeIndex: number, total: number) {
  let raw = slideIndex - activeIndex
  if (raw > total / 2) raw -= total
  if (raw < -total / 2) raw += total
  return raw
}

function cardStyle(offset: number) {
  const abs = Math.abs(offset)
  const position = abs === 1 ? 'near' : abs === 2 ? 'outer' : 'center'
  return {
    scale: abs === 0 ? 1 : abs === 1 ? 0.8 : 0.62,
    opacity: 1,
    x:
      position === 'center'
        ? '0px'
        : offset > 0
          ? `var(--carousel-${position})`
          : `var(--carousel-${position}-negative)`,
  }
}

function SlideCarousel({ slides, index, compact = false }: SlideCarouselProps) {
  const visible = slides
    .map((slide, i) => ({ slide, i, offset: getOffset(i, index, slides.length) }))
    .filter((item) => Math.abs(item.offset) <= VISIBLE_RANGE)

  return (
    <div
      className={`relative flex h-full min-h-0 flex-grow items-center justify-center overflow-hidden px-2 py-8 sm:px-6 ${
        compact ? 'carousel-compact' : 'carousel-tv'
      }`}
      style={
        {
          containerType: 'inline-size',
          '--carousel-card-width': compact
            ? 'clamp(10rem, 20cqw, 13.125rem)'
            : 'clamp(14rem, 20cqw, 22rem)',
          '--carousel-near': '19.5cqw',
          '--carousel-near-negative': '-19.5cqw',
          '--carousel-outer': '35.2cqw',
          '--carousel-outer-negative': '-35.2cqw',
        } as React.CSSProperties
      }
    >
      <AnimatePresence initial={false}>
        {visible.map(({ slide, i, offset }) => {
          const { scale, opacity, x } = cardStyle(offset)
          const isActive = offset === 0
          const edgeX =
            offset > 0
              ? offset === 1
                ? 'var(--carousel-near)'
                : 'var(--carousel-outer)'
              : offset < 0
                ? offset === -1
                  ? 'var(--carousel-near-negative)'
                  : 'var(--carousel-outer-negative)'
                : '0px'
          const absOffset = Math.abs(offset)
          const imageSize = isActive
            ? compact ? 'size-[clamp(6rem,12vw,8rem)]' : 'size-[clamp(9rem,16vw,13rem)]'
            : absOffset === 1
              ? compact ? 'size-[clamp(4.5rem,9vw,6rem)]' : 'size-[clamp(6rem,11vw,9rem)]'
              : absOffset === 2
                ? compact ? 'size-[clamp(3.5rem,6vw,4.5rem)]' : 'size-[clamp(4.5rem,8vw,7rem)]'
                : 'size-[clamp(3rem,5vw,4rem)]'
          const cardTone = isActive
            ? 'bg-slate-900/75 shadow-2xl'
            : 'bg-slate-900/65'

          return (
            <motion.div
              key={slide.id ?? i}
              initial={{ opacity: 0, scale: 0.45, x: edgeX }}
              animate={{ opacity, scale, x }}
              exit={{ opacity: 0, scale: 0.45, x: edgeX }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              style={{ zIndex: 10 - absOffset }}
              className={`absolute flex ${
                compact
                  ? 'h-[clamp(18rem,62vh,22.5rem)] w-[var(--carousel-card-width)] px-4 py-5'
                  : 'h-[clamp(22rem,70vh,38.75rem)] w-[var(--carousel-card-width)] px-[clamp(1rem,2vw,2rem)] py-[clamp(1.25rem,3vh,2rem)]'
              } flex-col items-center overflow-hidden rounded-[22px] border border-white/15 text-center text-text-h backdrop-blur-lg ${cardTone}`}
            >
              <p className={`shrink-0 font-medium ${
                isActive ? compact ? 'text-base' : 'text-[clamp(1.1rem,1.5vw,1.4rem)]' : absOffset === 1 ? 'text-[clamp(0.8rem,1.1vw,1rem)]' : 'text-[clamp(0.65rem,0.9vw,0.85rem)]'
              }`}>
                {slide.degreeYear || slide.eyebrow || 'Degree & year'}
              </p>

              <div className={`my-auto flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/85 ${imageSize}`}>
                {slide.imageUrl ? (
                  <img
                    src={slide.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="sr-only">No profile image</span>
                )}
              </div>

              <div className="flex min-h-0 w-full shrink-0 flex-col items-center gap-2">
                <h2
                  className={`max-w-full font-medium text-text-h ${
                    isActive ? compact ? 'text-xl leading-tight' : 'text-[clamp(1.5rem,2.5vw,2.25rem)] leading-tight' : absOffset === 1 ? 'text-[clamp(0.85rem,1.25vw,1.1rem)] leading-tight' : 'text-[clamp(0.7rem,1vw,0.9rem)] leading-tight'
                  }`}
                >
                  {slide.name || slide.heading}
                </h2>
                {(slide.jobTitle || slide.subheading) && (
                  <p className={`max-w-full text-text ${
                    isActive ? compact ? 'text-sm' : 'text-[clamp(1rem,1.35vw,1.25rem)]' : absOffset === 1 ? 'text-[clamp(0.75rem,1vw,0.95rem)]' : 'text-[clamp(0.6rem,0.85vw,0.8rem)]'
                  }`}>
                    {slide.jobTitle || slide.subheading}
                  </p>
                )}
                {(slide.company || slide.heading) && (
                  <p className={`max-w-full text-text ${
                    isActive ? compact ? 'text-sm' : 'text-[clamp(1rem,1.35vw,1.25rem)]' : absOffset === 1 ? 'text-[clamp(0.75rem,1vw,0.95rem)]' : 'text-[clamp(0.6rem,0.85vw,0.8rem)]'
                  }`}>
                    {slide.company || (slide.name ? slide.heading : '')}
                  </p>
                )}
                {slide.bullets.length > 0 && isActive && (
                  <ul className="max-h-24 w-full overflow-hidden text-left text-sm leading-relaxed text-text">
                    {slide.bullets.map((bullet) => (
                      <li key={bullet} className="truncate">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
                {slide.companyLogoUrl ? (
                  <img
                    src={slide.companyLogoUrl}
                    alt=""
                    className={`mt-1 object-contain ${
                      isActive ? compact ? 'h-10 max-w-28' : 'h-[clamp(2.5rem,5vw,4rem)] max-w-[clamp(7rem,10vw,10rem)]' : absOffset === 1 ? 'h-10 max-w-24' : 'h-7 max-w-16'
                    }`}
                  />
                ) : null}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export default SlideCarousel
