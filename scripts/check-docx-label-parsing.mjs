// Mirrors matchLabel() in src/lib/docx.ts -- keep in sync if that changes.
import assert from 'node:assert/strict'

const LABEL_LINE = /^\s*(degree(?:\s*(?:&|and)?\s*year)?|name|position|company)\s*[-–—:]\s*(.*)$/i

function matchLabel(text) {
  const m = text.match(LABEL_LINE)
  if (!m) return null
  const label = m[1].toLowerCase()
  const value = m[2].trim()
  if (label.startsWith('degree')) return { field: 'degreeYear', value }
  if (label.startsWith('name')) return { field: 'name', value }
  if (label.startsWith('position')) return { field: 'jobTitle', value }
  return { field: 'company', value }
}

assert.deepEqual(matchLabel('degree- IT BS 2024'), { field: 'degreeYear', value: 'IT BS 2024' })
assert.deepEqual(matchLabel('Degree & Year - IT BS 2024'), { field: 'degreeYear', value: 'IT BS 2024' })
assert.deepEqual(matchLabel('Degree and year: IT BS 2024'), { field: 'degreeYear', value: 'IT BS 2024' })
assert.deepEqual(matchLabel('name- Fred Odonkor'), { field: 'name', value: 'Fred Odonkor' })
assert.deepEqual(matchLabel('Position – Datacenter Technician'), { field: 'jobTitle', value: 'Datacenter Technician' })
assert.deepEqual(matchLabel('company- Amazon Web Services (AWS)'), { field: 'company', value: 'Amazon Web Services (AWS)' })
assert.equal(matchLabel('Just a random unlabeled line'), null)
assert.equal(matchLabel(''), null)

console.log('docx label parsing OK')
