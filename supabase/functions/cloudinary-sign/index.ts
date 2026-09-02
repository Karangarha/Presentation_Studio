Deno.serve(async (_req: Request) => {
  const cloudinaryUrl = Deno.env.get('CLOUDINARY_URL')
  if (!cloudinaryUrl) {
    return new Response(JSON.stringify({ error: 'CLOUDINARY_URL is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const match = cloudinaryUrl.match(/^cloudinary:\/\/(\d+):([^@]+)@([\w-]+)$/)
  if (!match) {
    return new Response(JSON.stringify({ error: 'CLOUDINARY_URL is malformed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const [, apiKey, apiSecret, cloudName] = match

  const timestamp = Math.floor(Date.now() / 1000)
  const folder = 'abet-logos'
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`

  const encoder = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-1', encoder.encode(paramsToSign + apiSecret))
  const signature = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return new Response(JSON.stringify({ timestamp, signature, apiKey, cloudName, folder }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
})
