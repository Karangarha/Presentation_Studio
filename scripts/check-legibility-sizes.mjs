// Guards the active-card TV-mode text and image sizes from
// SlideCarousel.tsx against silent regression.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/components/SlideCarousel.tsx', import.meta.url), 'utf8')

assert.ok(src.includes("compact ? 'text-base' : 'text-[clamp(1rem,1.3vw,1.25rem)]'"),
  'degree/year active TV size should be clamp(1rem,1.3vw,1.25rem)')

assert.ok(src.includes("compact ? 'text-xl leading-tight' : 'text-[clamp(1.75rem,2.75vw,2.5rem)] leading-tight'"),
  'name active TV size should be clamp(1.75rem,2.75vw,2.5rem)')

assert.ok(src.includes("compact ? 'text-sm' : 'text-[clamp(1.125rem,1.45vw,1.3125rem)]'"),
  'job-title active TV size should be clamp(1.125rem,1.45vw,1.3125rem)')

assert.ok(src.includes("compact ? 'text-sm' : 'text-[clamp(0.9375rem,1.2vw,1.125rem)]'"),
  'company active TV size should be clamp(0.9375rem,1.2vw,1.125rem)')

assert.ok(src.includes("compact ? 'size-[clamp(4.5rem,9vw,6rem)]' : 'size-[clamp(7.2rem,12.8vw,10.4rem)]'"),
  'near-tier TV image size should be clamp(7.2rem,12.8vw,10.4rem), scaled to the card\'s own 0.8 scale factor')

assert.ok(src.includes("compact ? 'size-[clamp(3.5rem,6vw,4.5rem)]' : 'size-[clamp(5.6rem,9.9vw,8.1rem)]'"),
  'outer-tier TV image size should be clamp(5.6rem,9.9vw,8.1rem), scaled to the card\'s own 0.62 scale factor')

console.log('legibility sizes OK')
