import * as mammoth from 'mammoth'
import { uploadAsset } from './cloudinary'
import type { SlideInput } from './supabase'

function splitPerson(text: string) {
  const parts = text.split(/\s+[–-]\s+/)
  return { name: parts[0]?.trim() ?? text, degreeYear: parts.slice(1).join(' – ').trim() }
}

function splitRole(text: string) {
  const dashParts = text.split(/\s+[–-]\s+/)
  if (dashParts.length > 1) {
    return { jobTitle: dashParts[0].trim(), company: dashParts.slice(1).join(' – ').trim() }
  }
  const atIndex = text.toLowerCase().indexOf(' at ')
  if (atIndex > 0) {
    return { jobTitle: text.slice(0, atIndex).trim(), company: text.slice(atIndex + 4).trim() }
  }
  return { jobTitle: text.trim(), company: '' }
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
  const records: Array<{ text: string; imageUrl: string | null }> = []
  let pendingImageUrl: string | null = null

  for (const element of Array.from(document.body.children)) {
    const image = element.querySelector('img') ?? (element.tagName === 'IMG' ? element : null)
    const imageUrl = image instanceof HTMLImageElement && image.src ? image.src : null
    const text = element.textContent?.trim() ?? ''

    if (text) {
      records.push({ text, imageUrl: imageUrl ?? pendingImageUrl })
      pendingImageUrl = null
    } else if (imageUrl) {
      const previous = records[records.length - 1]
      if (previous && !previous.imageUrl) previous.imageUrl = imageUrl
      else pendingImageUrl = imageUrl
    }
  }

  const sections: SlideInput[] = []
  for (let index = 0; index < records.length; index += 2) {
    const person = records[index]
    const role = records[index + 1]
    if (!person) continue
    const personData = splitPerson(person.text)
    const roleData = splitRole(role?.text ?? person.text)

    sections.push({
      type: 'content',
      eyebrow: personData.degreeYear,
      heading: roleData.jobTitle,
      subheading: '',
      bullets: [],
      imageUrl: person.imageUrl ?? role?.imageUrl ?? null,
      degreeYear: personData.degreeYear,
      name: personData.name,
      jobTitle: roleData.jobTitle,
      company: roleData.company,
      companyLogoUrl: null,
    })
  }

  if (sections.length === 0) {
    throw new Error('The DOCX file did not contain importable person and role rows.')
  }
  return sections
}
