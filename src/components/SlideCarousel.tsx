import { AnimatePresence, motion } from 'motion/react'
import type { Slide } from '../lib/supabase'

type SlideCarouselProps = {
  slides: Slide[]
  index: number
  compact?: boolean
  fixed?: boolean
  focusOnly?: boolean
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

function SlideCarousel({ slides, index, compact = false, fixed = false, focusOnly = false }: SlideCarouselProps) {
  const visible = slides
    .map((slide, i) => ({ slide, i, offset: getOffset(i, index, slides.length) }))
    .filter((item) => Math.abs(item.offset) <= VISIBLE_RANGE)

  return (
    <div
      className={`relative flex h-full min-h-0 flex-grow items-center justify-center overflow-hidden px-2 py-8 sm:px-6 ${
        compact ? fixed ? 'carousel-compact carousel-fixed' : 'carousel-compact' : 'carousel-tv'
      }`}
      style={
        {
          containerType: 'inline-size',
          '--carousel-card-width': compact
            ? fixed ? '18cqw' : 'clamp(10rem, 20cqw, 13.125rem)'
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
            ? fixed ? 'size-[clamp(2.75rem,8cqw,5rem)]' : compact ? 'size-[clamp(6rem,12vw,8rem)]' : 'size-[clamp(9rem,16vw,13rem)]'
            : absOffset === 1
              ? fixed ? 'size-[clamp(2rem,5.5cqw,3.5rem)]' : compact ? 'size-[clamp(4.5rem,9vw,6rem)]' : 'size-[clamp(7.2rem,12.8vw,10.4rem)]'
              : absOffset === 2
                ? fixed ? 'size-[clamp(1.5rem,4cqw,2.5rem)]' : compact ? 'size-[clamp(3.5rem,6vw,4.5rem)]' : 'size-[clamp(5.6rem,9.9vw,8.1rem)]'
                : fixed ? 'size-[clamp(1.25rem,3cqw,2rem)]' : 'size-[clamp(3rem,5vw,4rem)]'
          const cardTone = isActive
            ? 'bg-slate-900/80 shadow-2xl'
            : 'bg-slate-900/65'
          const cardOpacity = focusOnly && !isActive ? 0.5 : opacity
          const fixedImageSize = isActive ? '8cqw' : absOffset === 1 ? '5.5cqw' : absOffset === 2 ? '4cqw' : '3cqw'
          const fixedTextSize = isActive ? '1.4cqw' : absOffset === 1 ? '0.9cqw' : absOffset === 2 ? '0.7cqw' : '0.55cqw'

          return (
            <motion.div
              key={slide.id ?? i}
              initial={fixed ? { opacity: cardOpacity, scale, x } : { opacity: 0, scale: 0.45, x: edgeX }}
              animate={{ opacity: cardOpacity, scale, x }}
              exit={{ opacity: 0, scale: 0.45, x: edgeX }}
              transition={fixed ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 24, mass: 0.8 }}
              style={{ zIndex: 10 - absOffset }}
              className={`absolute flex ${
                compact
                  ? fixed ? 'h-[64%] w-[var(--carousel-card-width)] px-[1.5%] py-[2%]' : 'h-[clamp(18rem,62vh,22.5rem)] w-[var(--carousel-card-width)] px-4 py-5'
                  : 'h-[clamp(22rem,70vh,38.75rem)] w-[var(--carousel-card-width)] px-[clamp(1rem,2vw,2rem)] py-[clamp(1.25rem,3vh,2rem)]'
              } flex-col items-center overflow-hidden rounded-[22px] border border-white/15 text-center text-text-h backdrop-blur-lg ${cardTone}`}
            >
              <p style={fixed ? { fontSize: fixedTextSize } : undefined} className={`shrink-0 font-medium uppercase tracking-wide text-text ${focusOnly && !isActive ? 'invisible' : ''} ${
                isActive ? fixed ? 'text-[clamp(0.55rem,1.2cqw,0.9rem)]' : compact ? 'text-base' : 'text-[clamp(1.125rem,1.5vw,1.375rem)]' : absOffset === 1 ? fixed ? 'text-[clamp(0.4rem,0.85cqw,0.65rem)]' : 'text-[clamp(0.8rem,1.1vw,1rem)]' : fixed ? 'text-[clamp(0.35rem,0.7cqw,0.5rem)]' : 'text-[clamp(0.65rem,0.9vw,0.85rem)]'
              }`}>
                {slide.degreeYear || slide.eyebrow || 'Degree & year'}
              </p>

              <div style={fixed ? { width: fixedImageSize, height: fixedImageSize } : undefined} className={`my-auto flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/40 bg-white/85 ${imageSize}`}>
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
                <h2 style={fixed ? { fontSize: fixedTextSize } : undefined}
                  className={`max-w-full font-medium text-text-h ${focusOnly && !isActive ? 'invisible' : ''} ${
                    isActive ? fixed ? 'text-[clamp(0.6rem,1.4cqw,1rem)] leading-tight' : compact ? 'text-xl leading-tight' : 'text-[clamp(2.5rem,4vw,3.75rem)] leading-tight' : absOffset === 1 ? fixed ? 'text-[clamp(0.4rem,0.9cqw,0.7rem)] leading-tight' : 'text-[clamp(0.85rem,1.25vw,1.1rem)] leading-tight' : fixed ? 'text-[clamp(0.35rem,0.7cqw,0.55rem)] leading-tight' : 'text-[clamp(0.7rem,1vw,0.9rem)] leading-tight'
                  }`}
                >
                  {slide.name || slide.heading}
                </h2>
                {(slide.jobTitle || slide.subheading) && (
                  <p style={fixed ? { fontSize: `calc(${fixedTextSize} * 0.65)` } : undefined} className={`max-w-full text-text ${focusOnly && !isActive ? 'invisible' : ''} ${
                    isActive ? fixed ? 'text-[clamp(0.4rem,0.9cqw,0.65rem)]' : compact ? 'text-sm' : 'text-[clamp(1.375rem,1.8vw,1.625rem)]' : absOffset === 1 ? fixed ? 'text-[clamp(0.35rem,0.65cqw,0.5rem)]' : 'text-[clamp(0.75rem,1vw,0.95rem)]' : fixed ? 'text-[clamp(0.3rem,0.55cqw,0.45rem)]' : 'text-[clamp(0.6rem,0.85vw,0.8rem)]'
                  }`}>
                    {slide.jobTitle || slide.subheading}
                  </p>
                )}
                {(slide.company || slide.heading) && (
                  <p style={fixed ? { fontSize: `calc(${fixedTextSize} * 0.65)` } : undefined} className={`max-w-full text-text ${focusOnly && !isActive ? 'invisible' : ''} ${
                    isActive ? fixed ? 'text-[clamp(0.4rem,0.9cqw,0.65rem)]' : compact ? 'text-sm' : 'text-[clamp(1.125rem,1.5vw,1.375rem)]' : absOffset === 1 ? fixed ? 'text-[clamp(0.35rem,0.65cqw,0.5rem)]' : 'text-[clamp(0.75rem,1vw,0.95rem)]' : fixed ? 'text-[clamp(0.3rem,0.55cqw,0.45rem)]' : 'text-[clamp(0.6rem,0.85vw,0.8rem)]'
                  }`}>
                    {slide.company || (slide.name ? slide.heading : '')}
                  </p>
                )}
                {slide.bullets.length > 0 && isActive && (
                  <ul style={fixed ? { fontSize: '0.55cqw' } : undefined} className="max-h-24 w-full overflow-hidden rounded-lg bg-black/25 p-2 text-left text-sm leading-relaxed text-text backdrop-blur-md">
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
                    style={fixed ? { height: `calc(${fixedTextSize} * 5)`, maxWidth: '12cqw' } : undefined}
                    className={`mt-1 object-contain ${
                      isActive ? fixed ? 'h-4 max-w-16' : compact ? 'h-10 max-w-28' : 'h-[clamp(2.5rem,5vw,4rem)] max-w-[clamp(7rem,10vw,10rem)]' : absOffset === 1 ? fixed ? 'h-3 max-w-12' : 'h-10 max-w-24' : fixed ? 'h-2 max-w-10' : 'h-7 max-w-16'
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
