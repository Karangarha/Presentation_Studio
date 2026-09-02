// Mirrors getOffset() in src/components/SlideCarousel.tsx — keep in sync if that changes.
import assert from 'node:assert/strict'

function getOffset(slideIndex, activeIndex, total) {
  let raw = slideIndex - activeIndex
  if (raw > total / 2) raw -= total
  if (raw < -total / 2) raw += total
  return raw
}

assert.equal(getOffset(9, 0, 10), -1)
assert.equal(getOffset(8, 5, 10), 3)
assert.equal(getOffset(3, 0, 8), 3)
assert.equal(getOffset(4, 0, 8), 4)
assert.equal(getOffset(1, 0, 2), 1)

console.log('carousel math OK')
