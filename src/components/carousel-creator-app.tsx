'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { DashboardView } from '@/components/dashboard-view'
import { NewProjectDialog } from '@/components/new-project-dialog'
import { CarouselEditor } from '@/components/carousel-editor'
import { localProjectRepository } from '@/lib/repositories/local-project-repository'
import { demoProject } from '@/lib/demo/demo-project'
import type { Project, Slide } from '@/types'
import type { SlideResult } from '@/lib/ai/schemas'

function mapSlideResult(result: SlideResult, order: number): Slide {
  return {
    id: result.id,
    order,
    photoId: result.imageId,
    type: result.slideType,
    headline: result.headline,
    body: result.body,
    altText: result.altText,
    alignment: result.textAlignment,
    placement: result.textPlacement,
    overlay: result.overlayStrength,
    shadow: result.textShadow,
    crop: result.cropPosition,
    cta: result.cta,
    confidence: result.confidence,
    reasoningSummary: result.reasoningSummary,
    editedFields: [],
  }
}

export function CarouselCreatorApp() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [aiMode, setAiMode] = useState('Mock')
  const saveTimeout = useRef<number | null>(null)

  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) ?? null, [projects, selectedProjectId])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const saved = await localProjectRepository.listProjects()
      const hasDemo = saved.some((project) => project.id === demoProject.id)
      if (!hasDemo) {
        await localProjectRepository.createProject(demoProject)
      }
      const hydrated = hasDemo ? saved : [demoProject, ...saved]
      const urlProject = new URLSearchParams(window.location.search).get('project')
      if (!cancelled) {
        setProjects(hydrated)
        setSelectedProjectId(urlProject && hydrated.some((project) => project.id === urlProject) ? urlProject : null)
        setLoading(false)
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedProjectId) {
      const url = new URL(window.location.href)
      url.searchParams.delete('project')
      window.history.replaceState({}, '', url)
      return
    }
    const url = new URL(window.location.href)
    url.searchParams.set('project', selectedProjectId)
    window.history.replaceState({}, '', url)
  }, [selectedProjectId])

  useEffect(() => {
    if (!selectedProject) {
      if (saveTimeout.current) {
        window.clearTimeout(saveTimeout.current)
        saveTimeout.current = null
      }
      return
    }

    if (saveTimeout.current) window.clearTimeout(saveTimeout.current)
    saveTimeout.current = window.setTimeout(async () => {
      await localProjectRepository.updateProject(selectedProject)
      saveTimeout.current = null
    }, 250)

    return () => {
      if (saveTimeout.current) {
        window.clearTimeout(saveTimeout.current)
        saveTimeout.current = null
      }
    }
  }, [selectedProject])

  function upsertProject(nextProject: Project) {
    setProjects((current) => {
      const without = current.filter((project) => project.id !== nextProject.id)
      return [nextProject, ...without].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    })
  }

  function openProject(projectId: string) {
    setSelectedProjectId(projectId)
  }

  async function createProject(project: Project) {
    await localProjectRepository.createProject(project)
    const fresh = await localProjectRepository.listProjects()
    setProjects(fresh)
    setSelectedProjectId(project.id)
    toast.success('Project created. Generate the carousel when you are ready.')
  }

  async function deleteProject(projectId: string) {
    await localProjectRepository.deleteProject(projectId)
    const fresh = await localProjectRepository.listProjects()
    setProjects(fresh)
    setSelectedProjectId(null)
    toast.success('Project deleted.')
  }

  async function generateCarousel(project: Project) {
    const photosForGeneration =
      aiMode === 'Mock'
        ? project.photos.map((photo) => ({
            id: photo.id,
            originalName: photo.originalName,
            url: photo.originalName,
            width: photo.width,
            height: photo.height,
            mimeType: photo.mimeType,
            analysis: photo.analysis,
          }))
        : project.photos

    const response = await fetch('/api/ai/generate-carousel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: project.title,
        location: project.location,
        notes: project.notes,
        photos: photosForGeneration,
      }),
    })

    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.error || 'Carousel generation failed.')
    }

    setAiMode(payload.mode)
    const nextProject: Project = {
      ...project,
      status: 'generated',
      photos: project.photos.map((photo, index) => ({ ...photo, analysis: payload.analyses[index] })),
      slides: payload.slides.map((slide: SlideResult, index: number) => mapSlideResult(slide, index)),
      caption: payload.caption.caption,
      hashtags: payload.caption.hashtags,
      keywords: payload.caption.keywords,
      updatedAt: new Date().toISOString(),
    }
    upsertProject(nextProject)
    toast.success(`Carousel generated in ${payload.mode} mode.`)
  }

  async function regenerateSlide(project: Project, slideId: string, target: 'slide' | 'headline' | 'body') {
    const slide = project.slides.find((entry) => entry.id === slideId)
    const photo = project.photos.find((entry) => entry.id === slide?.photoId)
    if (!slide || !photo) return

    const response = await fetch('/api/ai/regenerate-slide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectTitle: project.title,
        location: project.location,
        notes: project.notes,
        photo,
        currentSlide: slide,
        target,
      }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Slide regeneration failed.')
    setAiMode(payload.mode)

    const replacement = mapSlideResult(payload.slide, slide.order)
    replacement.editedFields = target === 'headline' ? [...slide.editedFields, 'headline'] : target === 'body' ? [...slide.editedFields, 'body'] : []

    const nextProject = {
      ...project,
      slides: project.slides.map((entry) => (entry.id === slideId ? { ...replacement, id: slideId, order: slide.order } : entry)),
      updatedAt: new Date().toISOString(),
    }
    upsertProject(nextProject)
    toast.success(`Slide ${target === 'slide' ? 'regenerated' : `${target} refreshed`}.`)
  }

  async function regenerateCaption(project: Project) {
    const slides = project.slides.map((slide) => ({
      id: slide.id,
      imageId: slide.photoId,
      slideType: slide.type,
      headline: slide.headline,
      body: slide.body,
      altText: slide.altText,
      textAlignment: slide.alignment,
      textPlacement: slide.placement,
      overlayStrength: slide.overlay,
      textShadow: slide.shadow,
      cropPosition: slide.crop,
      cta: slide.cta,
      confidence: slide.confidence,
      reasoningSummary: slide.reasoningSummary,
    }))

    const response = await fetch('/api/ai/generate-caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: project.title,
        location: project.location,
        notes: project.notes,
        slides,
      }),
    })

    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Caption regeneration failed.')

    setAiMode(payload.mode)
    upsertProject({
      ...project,
      caption: payload.caption.caption,
      hashtags: payload.caption.hashtags,
      keywords: payload.caption.keywords,
      updatedAt: new Date().toISOString(),
    })
    toast.success('Caption regenerated.')
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-stone-400">Loading carousel projects…</div>
  }

  return (
    <>
      <Toaster theme="dark" position="top-right" />
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-stone-300">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-stone-50">Lifestyle Hikers Carousel Creator</span>
            <span className="hidden text-stone-500 md:inline">Turn hike photos into stories worth saving.</span>
          </div>
          <Badge className="bg-white/10 text-stone-100 hover:bg-white/10">{aiMode} mode</Badge>
        </div>

        {selectedProject ? (
          <CarouselEditor
            project={selectedProject}
            aiMode={aiMode}
            onBack={() => setSelectedProjectId(null)}
            onDelete={(projectId) => void deleteProject(projectId)}
            onChange={upsertProject}
            onGenerate={() => generateCarousel(selectedProject)}
            onRegenerateSlide={(slideId, target) => regenerateSlide(selectedProject, slideId, target)}
            onRegenerateCaption={() => regenerateCaption(selectedProject)}
          />
        ) : (
          <DashboardView projects={projects} onCreate={() => setDialogOpen(true)} onOpen={openProject} />
        )}
      </div>

      <NewProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={(project) => void createProject(project)} />
    </>
  )
}
