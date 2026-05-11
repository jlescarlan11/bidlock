'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { ImagePlus } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type PhotoEntry = { file: File; url: string }

type Props = {
  onBack: () => void
  onNext: (photos: File[]) => void
  onPhotosChange?: (urls: string[]) => void
  initialPhotos?: File[]
}

function SortableThumbnail({
  entry,
  index,
  onRemove,
}: {
  entry: PhotoEntry
  index: number
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.url })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'relative aspect-square rounded-lg overflow-hidden bg-muted touch-none',
        isDragging && 'scale-105 shadow-xl ring-2 ring-primary z-10'
      )}
      {...attributes}
      {...listeners}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={entry.url} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      {index === 0 && (
        <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          Cover
        </span>
      )}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-black/80"
        aria-label="Remove photo"
      >
        ×
      </button>
    </div>
  )
}

export default function PhotosStep({ onBack, onNext, onPhotosChange, initialPhotos }: Props) {
  const [entries, setEntries] = useState<PhotoEntry[]>([])
  const [error, setError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep a ref synced to the latest entries so the cleanup closure always sees current state
  const entriesRef = useRef<PhotoEntry[]>([])
  entriesRef.current = entries

  // Restore initialPhotos on mount (useLayoutEffect = StrictMode-safe: recreates URLs on remount)
  useLayoutEffect(() => {
    if (!initialPhotos?.length) return
    const initial = initialPhotos.map((f) => ({ file: f, url: URL.createObjectURL(f) }))
    setEntries(initial)
    return () => initial.forEach((e) => URL.revokeObjectURL(e.url))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Revoke all live entries on real unmount (ref always points to latest, not captured closure)
  useEffect(() => {
    return () => entriesRef.current.forEach((e) => URL.revokeObjectURL(e.url))
  }, [])

  // Sync blob URLs to parent for live preview
  useEffect(() => {
    onPhotosChange?.(entries.map((e) => e.url))
  }, [entries, onPhotosChange])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setEntries((prev) => {
        const oldIndex = prev.findIndex((e) => e.url === active.id)
        const newIndex = prev.findIndex((e) => e.url === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  function handleFiles(selected: FileList | null) {
    if (!selected) return
    const arr = Array.from(selected)
    const invalid = arr.find(
      (f) => f.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    )
    if (invalid) { setError('Each file must be jpg/png/webp and under 5 MB.'); return }

    const remaining = 5 - entries.length
    const newEntries = arr.slice(0, remaining).map((f) => ({ file: f, url: URL.createObjectURL(f) }))
    setError('')
    setEntries((prev) => [...prev, ...newEntries])

    if (inputRef.current) inputRef.current.value = ''
  }

  function removeFile(i: number) {
    setEntries((prev) => {
      URL.revokeObjectURL(prev[i].url)
      return prev.filter((_, idx) => idx !== i)
    })
  }

  function handleNext() {
    if (entries.length < 1) { setError('Upload at least 1 photo.'); return }
    onNext(entries.map((e) => e.file))
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => entries.length < 5 && inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl py-10 text-center transition-colors',
          isDragOver && entries.length < 5
            ? 'border-primary bg-purple-50 cursor-copy'
            : entries.length >= 5
            ? 'border-muted opacity-60 cursor-not-allowed'
            : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30 cursor-pointer'
        )}
      >
        <ImagePlus className="mx-auto text-muted-foreground mb-2" size={28} aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">
          {entries.length >= 5 ? 'Maximum 5 photos reached' : 'Drag photos here or click to upload'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">1–5 · JPG, PNG, WebP · max 5 MB each</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <p className={cn('text-xs text-right', entries.length > 0 ? 'text-primary font-medium' : 'text-muted-foreground')}>
        {entries.length} / 5 photos
      </p>

      {entries.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={entries.map((e) => e.url)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-3">
              {entries.map((entry, i) => (
                <SortableThumbnail
                  key={entry.url}
                  entry={entry}
                  index={i}
                  onRemove={() => removeFile(i)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>← Back</Button>
        <Button type="button" className="flex-1" onClick={handleNext}>Next: Review →</Button>
      </div>
    </div>
  )
}
