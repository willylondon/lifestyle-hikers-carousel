'use client'

import { useMemo, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { PhotoUploader } from '@/components/photo-uploader'
import { fileToDataUrl, imageDimensions, makeThumbnail } from '@/lib/image-utils'
import { makeId } from '@/lib/project-utils'
import { projectInputSchema, validateFile, validatePhotoCount } from '@/lib/validation'
import type { PhotoAsset, Project } from '@/types'

export function NewProjectDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (project: Project) => void
}) {
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<PhotoAsset[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const countError = useMemo(() => validatePhotoCount(photos.length), [photos.length])

  async function buildPhoto(file: File): Promise<PhotoAsset | null> {
    const validation = validateFile(file)
    if (validation) {
      setErrors((current) => [...current, `${file.name}: ${validation}`])
      return null
    }

    const dataUrl = await fileToDataUrl(file)
    const dimensions = await imageDimensions(dataUrl)
    const thumbnailDataUrl = await makeThumbnail(dataUrl)
    return {
      id: makeId('photo'),
      originalName: file.name,
      url: dataUrl,
      dataUrl,
      thumbnailDataUrl,
      width: dimensions.width,
      height: dimensions.height,
      mimeType: file.type,
    }
  }

  async function addFiles(fileList: FileList | File[]) {
    setErrors([])
    const files = Array.from(fileList)
    const built = (await Promise.all(files.map((file) => buildPhoto(file)))).filter(Boolean) as PhotoAsset[]
    setPhotos((current) => [...current, ...built].slice(0, 15))
  }

  async function replacePhoto(photoId: string, file: File) {
    const built = await buildPhoto(file)
    if (!built) return
    setPhotos((current) => current.map((photo) => (photo.id === photoId ? { ...built, id: photoId } : photo)))
  }

  function movePhoto(photoId: string, direction: 'up' | 'down') {
    setPhotos((current) => {
      const index = current.findIndex((photo) => photo.id === photoId)
      if (index < 0) return current
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function reset() {
    setTitle('')
    setLocation('')
    setNotes('')
    setPhotos([])
    setErrors([])
    setBusy(false)
  }

  async function handleCreate() {
    setBusy(true)
    setErrors([])

    const parsed = projectInputSchema.safeParse({ title, location, notes })
    const nextErrors = [countError, ...(parsed.success ? [] : parsed.error.issues.map((issue) => issue.message))].filter(Boolean) as string[]
    if (nextErrors.length > 0) {
      setErrors(nextErrors)
      setBusy(false)
      return
    }

    const now = new Date().toISOString()
    const projectInput = parsed.data!
    onCreate({
      id: makeId('project'),
      title: projectInput.title,
      location: projectInput.location,
      notes: projectInput.notes,
      createdAt: now,
      updatedAt: now,
      status: 'ready',
      photos,
      slides: [],
      caption: '',
      hashtags: [],
      keywords: [],
      coverPhotoId: photos[0]?.id,
    })

    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      onOpenChange(nextOpen)
      if (!nextOpen) reset()
    }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#101311] text-stone-100 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create carousel project</DialogTitle>
          <DialogDescription className="text-stone-400">Upload 5–15 hike photos, add grounded field notes, then open the editor to generate the full carousel.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-200" htmlFor="title">Project title</label>
              <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Hellshire coastal story" className="border-white/10 bg-black/25" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-200" htmlFor="location">Hike / location</label>
              <Input id="location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Hellshire, St. Catherine" className="border-white/10 bg-black/25" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-200" htmlFor="notes">Hike notes / context</label>
              <Textarea id="notes" rows={10} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What happened on the route, what changed in the terrain, what stood out, and what the story should emphasize." className="border-white/10 bg-black/25" />
            </div>
          </div>

          <PhotoUploader
            photos={photos}
            onFilesSelected={addFiles}
            onMove={movePhoto}
            onRemove={(photoId) => setPhotos((current) => current.filter((photo) => photo.id !== photoId))}
            onReplace={replacePhoto}
          />
        </div>

        {(errors.length > 0 || countError) && (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
            <div className="mb-2 flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" />Fix these items before generating</div>
            <ul className="list-disc space-y-1 pl-5 text-amber-50/90">
              {[...new Set([...errors, countError].filter(Boolean))].map((error) => <li key={error}>{error}</li>)}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-stone-500">{photos.length} / 15 photos selected</p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={busy}>{busy ? 'Creating…' : 'Create project'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
