import { useRef, useState } from 'react'
import { updateLogoUrl } from '../lib/supabase'
import { uploadLogo } from '../lib/cloudinary'

type LogoSlotProps = {
  slot: 'left' | 'right'
  url: string | null
  onUploaded: (slot: 'left' | 'right', url: string) => void
  readOnly?: boolean
  scale?: number
}

function LogoSlot({ slot, url, onUploaded, readOnly = false, scale = 1 }: LogoSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setIsUploading(true)
    try {
      const secureUrl = await uploadLogo(file, slot)
      await updateLogoUrl(slot, secureUrl)
      onUploaded(slot, secureUrl)
    } catch (err) {
      console.error('Logo upload failed:', err)
      setError('Upload failed')
      setTimeout(() => setError(null), 4000)
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const position = slot === 'left' ? 'left-6' : 'right-6'
  const logoStyle = { width: `${256 * scale}px`, height: `${128 * scale}px` }
  const content = url ? (
    <img
      src={url}
      alt=""
      className={`max-h-full max-w-full object-contain drop-shadow-md ${
        readOnly ? 'brightness-0 invert' : ''
      }`}
    />
  ) : (
    <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/60">Logo</span>
  )

  if (readOnly) {
    return (
      <div
        className={`tv-logo pointer-events-none fixed top-4 ${position} z-20 flex items-center justify-center overflow-hidden p-2`}
        style={logoStyle}
        aria-label={`${slot} logo`}
      >
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={isUploading}
      className={`tv-logo fixed top-4 ${position} z-20 flex items-center justify-center overflow-hidden p-2 transition disabled:cursor-wait`}
      style={logoStyle}
      aria-label={`Upload logo (${slot})`}
    >
      {isUploading ? (
        <span className="text-xs text-white/80">Uploading…</span>
      ) : error ? (
        <span className="text-xs text-red-300">{error}</span>
      ) : url ? (
        content
      ) : (
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/60">Logo</span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </button>
  )
}

export default LogoSlot
