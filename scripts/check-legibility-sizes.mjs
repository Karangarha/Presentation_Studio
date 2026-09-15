// Guards the active-card TV-mode text and image sizes from
// SlideCarousel.tsx against silent regression.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/components/SlideCarousel.tsx', import.meta.url), 'utf8')

assert.ok(src.includes("compact ? 'text-base' : 'text-[clamp(1.125rem,1.5vw,1.375rem)]'"),
  'degree/year active TV size should be clamp(1.125rem,1.5vw,1.375rem)')

assert.ok(src.includes("compact ? 'text-xl leading-tight' : 'text-[clamp(2.5rem,4vw,3.75rem)] leading-tight'"),
  'name active TV size should be clamp(2.5rem,4vw,3.75rem)')

assert.ok(src.includes("compact ? 'text-sm' : 'text-[clamp(1.375rem,1.8vw,1.625rem)]'"),
  'job-title active TV size should be clamp(1.375rem,1.8vw,1.625rem)')

assert.ok(src.includes("compact ? 'text-sm' : 'text-[clamp(1.125rem,1.5vw,1.375rem)]'"),
  'company active TV size should be clamp(1.125rem,1.5vw,1.375rem)')

assert.ok(src.includes("compact ? 'size-[clamp(4.5rem,9vw,6rem)]' : 'size-[clamp(7.2rem,12.8vw,10.4rem)]'"),
  'near-tier TV image size should be clamp(7.2rem,12.8vw,10.4rem), scaled to the card\'s own 0.8 scale factor')

assert.ok(src.includes("compact ? 'size-[clamp(3.5rem,6vw,4.5rem)]' : 'size-[clamp(5.6rem,9.9vw,8.1rem)]'"),
  'outer-tier TV image size should be clamp(5.6rem,9.9vw,8.1rem), scaled to the card\'s own 0.62 scale factor')

console.log('legibility sizes OK')
