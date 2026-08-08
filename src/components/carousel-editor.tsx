/* eslint-disable @next/next/no-img-element */

'use client'

import { useMemo, useState } from 'react'
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeft,
  Download,
  GripVertical,
  RefreshCcw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { exportProjectPackage } from '@/lib/export/export-service'
import { slideTypeLabels } from '@/config/brand'
import type { CropPreset, PhotoAsset, Project, Slide, SlideType, TextAlignment, TextPlacement } from '@/types'
import { SlidePreview } from '@/components/slide-preview'

const placements: TextPlacement[] = ['top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right']
const slideTypes = Object.keys(slideTypeLabels) as SlideType[]
const cropPresets: CropPreset[] = ['center', 'top', 'bottom', 'left', 'right']
const alignments: TextAlignment[] = ['left', 'center', 'right']

function SortableThumbnail({
  slide,
  photo,
  active,
  onSelect,
}: {
  slide: Slide
  photo?: PhotoAsset
  active: boolean
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: slide.id })

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${active ? 'border-emerald-300/60 bg-emerald-300/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div {...attributes} {...listeners} className="rounded-md border border-white/10 p-1 text-stone-500 hover:text-stone-200">
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="h-16 w-14 overflow-hidden rounded-xl bg-black/30">
        {photo ? <img src={photo.thumbnailDataUrl || photo.dataUrl || photo.url} alt={slide.headline} className="h-full w-full object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-[0.28em] text-stone-500">{slide.order + 1} · {slide.type}</p>
        <p className="line-clamp-2 text-sm font-medium text-stone-100">{slide.headline}</p>
      </div>
    </button>
  )
}

export function CarouselEditor({
  project,
  aiMode,
  onBack,
  onChange,
  onDelete,
  onGenerate,
  onRegenerateSlide,
  onRegenerateCaption,
}: {
  project: Project
  aiMode: string
  onBack: () => void
  onChange: (project: Project) => void
  onDelete: (projectId: string) => void
  onGenerate: () => Promise<void>
  onRegenerateSlide: (slideId: string, target: 'slide' | 'headline' | 'body') => Promise<void>
  onRegenerateCaption: () => Promise<void>
}) {
  const [selectedSlideId, setSelectedSlideId] = useState(project.slides[0]?.id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const sortedSlides = useMemo(() => [...project.slides].sort((a, b) => a.order - b.order), [project.slides])
  const photosById = useMemo(() => new Map(project.photos.map((photo) => [photo.id, photo])), [project.photos])
  const selectedSlide = sortedSlides.find((slide) => slide.id === selectedSlideId) ?? sortedSlides[0]
  const selectedPhoto = selectedSlide ? photosById.get(selectedSlide.photoId) : undefined

  function updateSlide(slideId: string, updater: (slide: Slide) => Slide) {
    const slides = project.slides.map((slide) => (slide.id === slideId ? updater(slide) : slide))
    onChange({ ...project, slides, updatedAt: new Date().toISOString() })
  }

  function changeField<K extends keyof Slide>(slideId: string, key: K, value: Slide[K]) {
    updateSlide(slideId, (slide) => ({
      ...slide,
      [key]: value,
      editedFields: Array.from(new Set([...slide.editedFields, String(key)])),
    }))
  }

  function duplicateSlide() {
    if (!selectedSlide) return
    const duplicate: Slide = {
      ...selectedSlide,
      id: `${selectedSlide.id}-copy-${Math.random().toString(36).slice(2, 7)}`,
      order: selectedSlide.order + 1,
      headline: `${selectedSlide.headline}`,
      editedFields: [...selectedSlide.editedFields],
    }
    const nextSlides = arrayMove([...sortedSlides, duplicate], sortedSlides.length, selectedSlide.order + 1).map((slide, index) => ({ ...slide, order: index }))
    onChange({ ...project, slides: nextSlides, updatedAt: new Date().toISOString() })
    setSelectedSlideId(duplicate.id)
  }

  function deleteSlide() {
    if (!selectedSlide || sortedSlides.length <= 1) return
    const nextSlides = sortedSlides.filter((slide) => slide.id !== selectedSlide.id).map((slide, index) => ({ ...slide, order: index }))
    onChange({ ...project, slides: nextSlides, updatedAt: new Date().toISOString() })
    setSelectedSlideId(nextSlides[0]?.id)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sortedSlides.findIndex((slide) => slide.id === active.id)
    const newIndex = sortedSlides.findIndex((slide) => slide.id === over.id)
    const nextSlides = arrayMove(sortedSlides, oldIndex, newIndex).map((slide, index) => ({ ...slide, order: index }))
    onChange({ ...project, slides: nextSlides, updatedAt: new Date().toISOString() })
  }

  async function handleGenerate() {
    setBusy(true)
    setError('')
    try {
      await onGenerate()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Carousel generation failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleExport() {
    setBusy(true)
    setError('')
    try {
      await exportProjectPackage(project)
      onChange({ ...project, status: 'exported', updatedAt: new Date().toISOString() })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Export failed.')
    } finally {
      setBusy(false)
    }
  }

  if (!selectedSlide) {
    return (
      <Card className="border-white/10 bg-white/[0.02] text-stone-100">
        <CardContent className="space-y-4 p-8">
          <h2 className="text-2xl font-semibold">This project is ready for generation.</h2>
          <p className="text-stone-400">Generate the carousel once your photos and notes are in place.</p>
          {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">{error}</div> : null}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onBack} disabled={busy}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
            <Button onClick={handleGenerate} disabled={busy}><Sparkles className="mr-2 h-4 w-4" />{busy ? 'Generating…' : 'Generate carousel'}</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <button className="inline-flex items-center gap-2 text-sm text-stone-400 hover:text-stone-100" onClick={onBack}><ArrowLeft className="h-4 w-4" />Dashboard</button>
          <h1 className="text-3xl font-semibold text-stone-50">{project.title}</h1>
          <p className="text-stone-400">{project.location} · {project.photos.length} photos · {project.slides.length} slides</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-white/15 text-stone-300">{project.status}</Badge>
          <Badge className="bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/10">{aiMode} mode</Badge>
          <Button variant="secondary" onClick={handleGenerate} disabled={busy}><Sparkles className="mr-2 h-4 w-4" />{busy ? 'Generating…' : 'Regenerate carousel'}</Button>
          <Button onClick={handleExport} disabled={busy}><Download className="mr-2 h-4 w-4" />Export package</Button>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <Card className="border-white/10 bg-white/[0.02] text-stone-100">
          <CardHeader>
            <CardTitle>Slides</CardTitle>
          </CardHeader>
          <CardContent>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortedSlides.map((slide) => slide.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {sortedSlides.map((slide) => (
                    <SortableThumbnail
                      key={slide.id}
                      slide={slide}
                      photo={photosById.get(slide.photoId)}
                      active={selectedSlide.id === slide.id}
                      onSelect={() => setSelectedSlideId(slide.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <SlidePreview project={project} slide={selectedSlide} photo={selectedPhoto} />
          <Card className="border-white/10 bg-white/[0.02] text-stone-100">
            <CardContent className="flex flex-wrap gap-3 p-5 text-sm text-stone-300">
              <Button variant="secondary" onClick={() => onRegenerateSlide(selectedSlide.id, 'slide')}><RefreshCcw className="mr-2 h-4 w-4" />Regenerate slide</Button>
              <Button variant="secondary" onClick={() => onRegenerateSlide(selectedSlide.id, 'headline')}>Headline only</Button>
              <Button variant="secondary" onClick={() => onRegenerateSlide(selectedSlide.id, 'body')}>Body only</Button>
              <Button variant="secondary" onClick={duplicateSlide}>Duplicate</Button>
              <Button variant="destructive" onClick={deleteSlide} disabled={sortedSlides.length <= 1}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-white/10 bg-white/[0.02] text-stone-100">
            <CardHeader>
              <CardTitle>Edit slide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Headline</label>
                <Textarea value={selectedSlide.headline} rows={4} onChange={(event) => changeField(selectedSlide.id, 'headline', event.target.value)} className="border-white/10 bg-black/25" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Body</label>
                <Textarea value={selectedSlide.body} rows={5} onChange={(event) => changeField(selectedSlide.id, 'body', event.target.value)} className="border-white/10 bg-black/25" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Slide type</label>
                  <Select value={selectedSlide.type} onValueChange={(value) => changeField(selectedSlide.id, 'type', value as SlideType)}>
                    <SelectTrigger className="border-white/10 bg-black/25"><SelectValue /></SelectTrigger>
                    <SelectContent>{slideTypes.map((type) => <SelectItem key={type} value={type}>{slideTypeLabels[type]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Alignment</label>
                  <Select value={selectedSlide.alignment} onValueChange={(value) => changeField(selectedSlide.id, 'alignment', value as TextAlignment)}>
                    <SelectTrigger className="border-white/10 bg-black/25"><SelectValue /></SelectTrigger>
                    <SelectContent>{alignments.map((alignment) => <SelectItem key={alignment} value={alignment}>{alignment}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">Placement</label>
                  <Select value={selectedSlide.placement} onValueChange={(value) => changeField(selectedSlide.id, 'placement', value as TextPlacement)}>
                    <SelectTrigger className="border-white/10 bg-black/25"><SelectValue /></SelectTrigger>
                    <SelectContent>{placements.map((placement) => <SelectItem key={placement} value={placement}>{placement}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Crop</label>
                  <Select value={selectedSlide.crop} onValueChange={(value) => changeField(selectedSlide.id, 'crop', value as CropPreset)}>
                    <SelectTrigger className="border-white/10 bg-black/25"><SelectValue /></SelectTrigger>
                    <SelectContent>{cropPresets.map((crop) => <SelectItem key={crop} value={crop}>{crop}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Overlay</label>
                  <Input type="range" min={0} max={65} value={selectedSlide.overlay} onChange={(event) => changeField(selectedSlide.id, 'overlay', Number(event.target.value))} className="border-white/10 bg-black/25" />
                </div>
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-300">
                <input type="checkbox" checked={selectedSlide.shadow} onChange={(event) => changeField(selectedSlide.id, 'shadow', event.target.checked)} />
                Text shadow
              </label>
              <div className="space-y-2">
                <label className="text-sm font-medium">Alt text</label>
                <Textarea value={selectedSlide.altText} rows={4} onChange={(event) => changeField(selectedSlide.id, 'altText', event.target.value)} className="border-white/10 bg-black/25" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Implementation note</label>
                <Textarea value={selectedSlide.reasoningSummary} rows={3} onChange={(event) => changeField(selectedSlide.id, 'reasoningSummary', event.target.value)} className="border-white/10 bg-black/25" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.02] text-stone-100">
            <CardHeader>
              <CardTitle>Post caption</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea value={project.caption} rows={9} onChange={(event) => onChange({ ...project, caption: event.target.value, updatedAt: new Date().toISOString() })} className="border-white/10 bg-black/25" />
              <div className="flex flex-wrap gap-2 text-xs text-stone-400">
                {project.hashtags.map((hashtag) => <Badge key={hashtag} variant="outline" className="border-white/10 text-stone-300">{hashtag}</Badge>)}
              </div>
              <Button variant="secondary" onClick={onRegenerateCaption}><RefreshCcw className="mr-2 h-4 w-4" />Regenerate caption</Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.02] text-stone-100">
            <CardHeader>
              <CardTitle>Project settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input value={project.title} onChange={(event) => onChange({ ...project, title: event.target.value, updatedAt: new Date().toISOString() })} className="border-white/10 bg-black/25" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Input value={project.location} onChange={(event) => onChange({ ...project, location: event.target.value, updatedAt: new Date().toISOString() })} className="border-white/10 bg-black/25" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea value={project.notes} rows={5} onChange={(event) => onChange({ ...project, notes: event.target.value, updatedAt: new Date().toISOString() })} className="border-white/10 bg-black/25" />
              </div>
              <Button variant="destructive" onClick={() => onDelete(project.id)}>Delete project</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
