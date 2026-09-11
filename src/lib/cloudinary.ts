const SIGN_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cloudinary-sign`

type SignaturePayload = {
  timestamp: number
  signature: string
  apiKey: string
  cloudName: string
  folder: string
  publicId: string
  overwrite: boolean
}

export async function uploadLogo(file: File, slot: 'left' | 'right'): Promise<string> {
  return uploadAsset(file, slot, 'logo')
}

export async function uploadAsset(
  file: File,
  publicId: string,
  assetType: 'logo' | 'file' = 'file',
): Promise<string> {
  const signRes = await fetch(
    `${SIGN_ENDPOINT}?asset=${assetType}&publicId=${encodeURIComponent(publicId)}${
      assetType === 'logo' ? `&slot=${encodeURIComponent(publicId)}` : ''
    }`,
  )
  if (!signRes.ok) throw new Error(`Failed to get upload signature: ${signRes.status}`)
  const { timestamp, signature, apiKey, folder, cloudName, publicId: signedPublicId, overwrite }: SignaturePayload =
    await signRes.json()

  const form = new FormData()
  form.append('file', file)
  form.append('api_key', apiKey)
  form.append('timestamp', String(timestamp))
  form.append('signature', signature)
  form.append('folder', folder)
  form.append('public_id', signedPublicId)
  form.append('overwrite', String(overwrite))

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  })
  if (!uploadRes.ok) {
    const details = await uploadRes.text()
    throw new Error(`Cloudinary upload failed (${uploadRes.status}): ${details}`)
  }
  const data: { secure_url: string } = await uploadRes.json()
  return data.secure_url
}
