import { useRef, useState } from 'react'
import { updateLogoUrl } from '../lib/supabase'
import { uploadLogo } from '../lib/cloudinary'

type LogoSlotProps = {
  slot: 'left' | 'right'
  url: string | null
  onUploaded: (slot: 'left' | 'right', url: string) => void
}

function LogoSlot({ slot, url, onUploaded }: LogoSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const secureUrl = await uploadLogo(file)
      await updateLogoUrl(slot, secureUrl)
      onUploaded(slot, secureUrl)
    } catch (err) {
      console.error('Logo upload failed:', err)
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const position = slot === 'left' ? 'left-5' : 'right-5'

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={`fixed top-5 ${position} z-10 flex h-12 w-24 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-bg text-xs text-text`}
      aria-label={`Upload logo (${slot})`}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-contain" />
      ) : isUploading ? (
        'Uploading…'
      ) : (
        'Add logo'
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
