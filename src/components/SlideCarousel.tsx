import { AnimatePresence, motion } from 'motion/react'
import type { Slide } from '../lib/supabase'

type SlideCarouselProps = {
  slides: Slide[]
  index: number
}

const VISIBLE_RANGE = 3

function getOffset(slideIndex: number, activeIndex: number, total: number) {
  let raw = slideIndex - activeIndex
  if (raw > total / 2) raw -= total
  if (raw < -total / 2) raw += total
  return raw
}

function cardStyle(offset: number) {
  const abs = Math.abs(offset)
  return {
    scale: 1 - abs * 0.15,
    opacity: 1 - abs * 0.28,
    x: offset * 190,
  }
}

function SlideCarousel({ slides, index }: SlideCarouselProps) {
  const visible = slides
    .map((slide, i) => ({ slide, i, offset: getOffset(i, index, slides.length) }))
    .filter((item) => Math.abs(item.offset) <= VISIBLE_RANGE)

  return (
    <div className="relative flex flex-grow items-center justify-center overflow-hidden px-4">
      <AnimatePresence initial={false}>
        {visible.map(({ slide, i, offset }) => {
          const { scale, opacity, x } = cardStyle(offset)
          const isActive = offset === 0
          const edgeX = x + (offset >= 0 ? 190 : -190)

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.4, x: edgeX }}
              animate={{ opacity, scale, x }}
              exit={{ opacity: 0, scale: 0.4, x: edgeX }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              style={{ zIndex: 10 - Math.abs(offset) }}
              className={
                isActive
                  ? 'absolute flex w-[420px] max-w-[80vw] flex-col items-center gap-3 rounded-2xl bg-accent-bg p-8 text-center'
                  : 'absolute flex w-40 flex-col items-center gap-1 rounded-xl bg-accent-bg p-4 text-center'
              }
            >
              {isActive ? (
                slide.type === 'title' ? (
                  <>
                    <p className="text-sm uppercase tracking-wide text-accent">{slide.eyebrow}</p>
                    <h1 className="text-3xl font-medium text-text-h">{slide.heading}</h1>
                    <p className="text-base text-text">{slide.subheading}</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-medium text-text-h">{slide.heading}</h2>
                    <ul className="flex flex-col gap-1 text-left text-sm leading-relaxed text-text">
                      {slide.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </>
                )
              ) : (
                <p className="text-xs font-medium text-text-h">{slide.heading}</p>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export default SlideCarousel
