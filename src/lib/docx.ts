import * as mammoth from 'mammoth'
import { uploadAsset } from './cloudinary'
import type { SlideInput } from './supabase'

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

  // Each person is five consecutive lines: degree & year, photo (its own
  // line, folded into the preceding record above), name, position, company.
  const sections: SlideInput[] = []
  for (let index = 0; index < records.length; index += 4) {
    const degreeYear = records[index]
    const name = records[index + 1]
    const position = records[index + 2]
    const company = records[index + 3]
    if (!name) continue

    sections.push({
      type: 'content',
      eyebrow: '',
      heading: '',
      subheading: '',
      bullets: [],
      imageUrl: degreeYear?.imageUrl ?? name.imageUrl ?? null,
      degreeYear: degreeYear?.text ?? '',
      name: name.text,
      jobTitle: position?.text ?? '',
      company: company?.text ?? '',
      companyLogoUrl: null,
    })
  }

  if (sections.length === 0) {
    throw new Error('The DOCX file did not contain any recognizable rows (expected: degree & year, image, name, position, company per person).')
  }
  return sections
}
