/* eslint-disable @next/next/no-img-element */

'use client'

import { ImagePlus, Trash2, ArrowUp, ArrowDown, Replace } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { INSTAGRAM_CAROUSEL_MAX_ITEMS, MIN_CAROUSEL_PHOTOS } from '@/lib/validation'
import type { PhotoAsset } from '@/types'

type Props = {
  photos: PhotoAsset[]
  onFilesSelected: (files: FileList | File[]) => void
  onRemove: (photoId: string) => void
  onReplace: (photoId: string, file: File) => void
  onMove: (photoId: string, direction: 'up' | 'down') => void
}

export function PhotoUploader({ photos, onFilesSelected, onRemove, onReplace, onMove }: Props) {
  return (
    <div className="space-y-4">
      <label htmlFor="photo-upload" className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.03] px-6 text-center transition hover:border-emerald-400/60 hover:bg-white/[0.05]" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onFilesSelected(event.dataTransfer.files) }}>
        <ImagePlus className="mb-4 h-9 w-9 text-emerald-300" />
        <div className="space-y-2">
          <p className="text-lg font-semibold text-stone-100">Upload {MIN_CAROUSEL_PHOTOS}–{INSTAGRAM_CAROUSEL_MAX_ITEMS} excursion photos</p>
          <p className="max-w-lg text-sm text-stone-400">Instagram currently supports up to {INSTAGRAM_CAROUSEL_MAX_ITEMS} photos or videos in one carousel. Drag and drop JPG, JPEG, PNG, or WEBP files.</p>
        </div>
        <input id="photo-upload" className="hidden" type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple onChange={(event) => event.target.files && onFilesSelected(event.target.files)} />
      </label>

      {photos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {photos.map((photo, index) => (
            <div key={photo.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
              <div className="aspect-[4/5] bg-black/40"><img src={photo.thumbnailDataUrl || photo.dataUrl || photo.url} alt={photo.originalName} className="h-full w-full object-cover" /></div>
              <div className="space-y-3 p-3">
                <div><p className="line-clamp-1 text-sm font-medium text-stone-100">{photo.originalName}</p><p className="text-xs text-stone-500">{photo.width}×{photo.height}</p></div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => onMove(photo.id, 'up')} disabled={index === 0}><ArrowUp className="mr-1 h-4 w-4" />Up</Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => onMove(photo.id, 'down')} disabled={index === photos.length - 1}><ArrowDown className="mr-1 h-4 w-4" />Down</Button>
                  <label className="inline-flex cursor-pointer items-center rounded-md border border-white/10 px-3 py-2 text-xs font-medium text-stone-200 hover:bg-white/5"><Replace className="mr-1 h-4 w-4" />Replace<input type="file" className="hidden" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={(event) => event.target.files?.[0] && onReplace(photo.id, event.target.files[0])} /></label>
                  <Button type="button" size="sm" variant="destructive" onClick={() => onRemove(photo.id)}><Trash2 className="mr-1 h-4 w-4" />Remove</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
