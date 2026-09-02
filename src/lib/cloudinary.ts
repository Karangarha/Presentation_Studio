const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const SIGN_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cloudinary-sign`

type SignaturePayload = {
  timestamp: number
  signature: string
  apiKey: string
  cloudName: string
  folder: string
}

export async function uploadLogo(file: File): Promise<string> {
  const signRes = await fetch(SIGN_ENDPOINT)
  if (!signRes.ok) throw new Error(`Failed to get upload signature: ${signRes.status}`)
  const { timestamp, signature, apiKey, folder }: SignaturePayload = await signRes.json()

  const form = new FormData()
  form.append('file', file)
  form.append('api_key', apiKey)
  form.append('timestamp', String(timestamp))
  form.append('signature', signature)
  form.append('folder', folder)

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  })
  if (!uploadRes.ok) throw new Error(`Cloudinary upload failed: ${uploadRes.status}`)
  const data: { secure_url: string } = await uploadRes.json()
  return data.secure_url
}
