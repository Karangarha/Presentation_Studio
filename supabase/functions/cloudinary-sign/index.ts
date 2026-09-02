Deno.serve(async (req) => {
  const corsHeaders = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  const cloudinaryUrl = Deno.env.get('CLOUDINARY_URL')
  if (!cloudinaryUrl) {
    return new Response(JSON.stringify({ error: 'CLOUDINARY_URL is not configured' }), {
      status: 500,
      headers: corsHeaders,
    })
  }

  const match = cloudinaryUrl.trim().match(/^cloudinary:\/\/(\d+):([^@]+)@([\w-]+)$/)
  if (!match) {
    return new Response(JSON.stringify({ error: 'CLOUDINARY_URL is malformed' }), {
      status: 500,
      headers: corsHeaders,
    })
  }
  const [, apiKey, apiSecret, cloudName] = match

  const slot = new URL(req.url).searchParams.get('slot')
  if (slot !== 'left' && slot !== 'right') {
    return new Response(JSON.stringify({ error: 'slot must be "left" or "right"' }), {
      status: 400,
      headers: corsHeaders,
    })
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const folder = 'abet-logos'
  const paramsToSign = `folder=${folder}&overwrite=true&public_id=${slot}&timestamp=${timestamp}`

  const encoder = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-1', encoder.encode(paramsToSign + apiSecret))
  const signature = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return new Response(
    JSON.stringify({
      timestamp,
      signature,
      apiKey,
      cloudName,
      folder,
      publicId: slot,
      overwrite: true,
    }),
    { headers: corsHeaders },
  )
})
