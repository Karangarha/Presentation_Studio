import * as mammoth from 'mammoth'
import { uploadAsset } from './cloudinary'
import type { SlideInput } from './supabase'

type Draft = { degreeYear: string; name: string; jobTitle: string; company: string; imageUrl: string | null }
type Field = 'degreeYear' | 'name' | 'jobTitle' | 'company'

const LABEL_LINE = /^\s*(degree(?:\s*(?:&|and)?\s*year)?|name|position|company)\s*[-–—:]\s*(.*)$/i

function matchLabel(text: string): { field: Field; value: string } | null {
  const m = text.match(LABEL_LINE)
  if (!m) return null
  const label = m[1].toLowerCase()
  const value = m[2].trim()
  if (label.startsWith('degree')) return { field: 'degreeYear', value }
  if (label.startsWith('name')) return { field: 'name', value }
  if (label.startsWith('position')) return { field: 'jobTitle', value }
  return { field: 'company', value }
}

function blankDraft(): Draft {
  return { degreeYear: '', name: '', jobTitle: '', company: '', imageUrl: null }
}

export async function importDocx(file: File): Promise<SlideInput[]> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({
    arrayBuffer,
  }, {
    convertImage: mammoth.images.imgElement(async (image) => {
      const base64 = await image.read('base64')
      const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
      const extension = image.contentType.split('/')[1] ?? 'png'
      const imageFile = new File([bytes], `embedded.${extension}`, { type: image.contentType })
      const url = await uploadAsset(imageFile, `docx-${crypto.randomUUID()}`)
      return { src: url }
    }),
  })

  const document = new DOMParser().parseFromString(result.value, 'text/html')
  const sections: SlideInput[] = []
  let draft: Draft | null = null
  let pendingImageUrl: string | null = null

  const flush = () => {
    if (draft?.name) {
      sections.push({
        type: 'content', eyebrow: '', heading: '', subheading: '', bullets: [],
        imageUrl: draft.imageUrl, degreeYear: draft.degreeYear, name: draft.name,
        jobTitle: draft.jobTitle, company: draft.company, companyLogoUrl: null,
      })
    }
    draft = null
  }

  // Every field lives on its own labeled line ("degree- ...", "name- ...",
  // "position- ...", "company- ..."), in any order. Photos have no label --
  // an image-only line folds into whichever person is currently being read.
  // Seeing a label the current draft already has means a new person started.
  for (const element of Array.from(document.body.children)) {
    const image = element.querySelector('img') ?? (element.tagName === 'IMG' ? element : null)
    const imageUrl = image instanceof HTMLImageElement && image.src ? image.src : null
    const text = element.textContent?.trim() ?? ''

    if (text) {
      const match = matchLabel(text)
      if (!match) continue
      if (!draft) draft = blankDraft()
      else if (draft[match.field]) { flush(); draft = blankDraft() }
      draft[match.field] = match.value
      if (imageUrl) draft.imageUrl ??= imageUrl
      else if (pendingImageUrl) { draft.imageUrl ??= pendingImageUrl; pendingImageUrl = null }
    } else if (imageUrl) {
      if (draft && !draft.imageUrl) draft.imageUrl = imageUrl
      else pendingImageUrl = imageUrl
    }
  }
  flush()

  if (sections.length === 0) {
    throw new Error('The DOCX file did not contain any recognizable rows (expected lines like "degree- ...", "name- ...", "position- ...", "company- ...").')
  }
  return sections
}
