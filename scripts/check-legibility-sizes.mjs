// Guards the active-card TV-mode text sizes from SlideCarousel.tsx
// against silent regression back to the pre-legibility-pass values.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/components/SlideCarousel.tsx', import.meta.url), 'utf8')

assert.ok(src.includes("compact ? 'text-base' : 'text-[clamp(1.5rem,2vw,1.875rem)]'"),
  'degree/year active TV size should be clamp(1.5rem,2vw,1.875rem)')

assert.ok(src.includes("compact ? 'text-xl leading-tight' : 'text-[clamp(3rem,5vw,4.5rem)] leading-tight'"),
  'name active TV size should be clamp(3rem,5vw,4.5rem)')

const jobTitleCompanyCount = (src.match(/compact \? 'text-sm' : 'text-\[clamp\(1\.875rem,2\.5vw,2\.25rem\)\]'/g) ?? []).length
assert.equal(jobTitleCompanyCount, 2,
  `expected the job-title and company paragraphs to both use clamp(1.875rem,2.5vw,2.25rem), found ${jobTitleCompanyCount}`)

console.log('legibility sizes OK')
