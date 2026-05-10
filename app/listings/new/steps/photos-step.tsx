'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

type Props = {
  onBack: () => void
  onNext: (photos: File[]) => void
}

export default function PhotosStep({ onBack, onNext }: Props) {
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(selected: FileList | null) {
    if (!selected) return
    const arr = Array.from(selected)
    const invalid = arr.find(
      (f) => f.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    )
    if (invalid) { setError('Each file must be jpg/png/webp and under 5 MB.'); return }
    const combined = [...files, ...arr].slice(0, 5)
    setError('')
    setFiles(combined)
  }

  function handleNext() {
    if (files.length < 1) { setError('Upload at least 1 photo.'); return }
    onNext(files)
  }

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50"
        onClick={() => inputRef.current?.click()}
      >
        <p className="text-muted-foreground text-sm">
          Tap to add photos (1–5, max 5 MB each, jpg/png/webp)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative aspect-square rounded overflow-hidden bg-muted">
              <Image src={URL.createObjectURL(f)} alt="" fill className="object-cover" />
              <button
                type="button"
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>← Back</Button>
        <Button type="button" className="flex-1" onClick={handleNext}>Next: Review →</Button>
      </div>
    </div>
  )
}
