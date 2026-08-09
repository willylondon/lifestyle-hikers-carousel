'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Toaster, toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { DashboardView } from '@/components/dashboard-view'
import { NewProjectDialog } from '@/components/new-project-dialog'
import { CarouselEditor } from '@/components/carousel-editor'
import { localProjectRepository } from '@/lib/repositories/local-project-repository'
import { demoProject } from '@/lib/demo/demo-project'
import { makeAnalysisImage } from '@/lib/image-utils'
import type { PhotoAsset, Project, Slide } from '@/types'
import type { AnalysisResult, SlideResult } from '@/lib/ai/schemas'

export const MAX_ANALYSIS_BATCH = 5
export const MAX_ANALYSIS_REQUEST_BYTES = 3_500_000

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

type AnalysisPhoto = Pick<PhotoAsset, 'id' | 'originalName' | 'width' | 'height'> & {
  url: string
  dataUrl: string
  mimeType: 'image/jpeg'
}

function analysisBody(project: Project, photos: AnalysisPhoto[]) {
  return { title: project.title, location: project.location, notes: project.notes, photos }
}

function serializedBytes(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength
}

export function splitAnalysisBatch(project: Project, photos: AnalysisPhoto[]): AnalysisPhoto[][] {
  if (photos.length <= 1 || serializedBytes(analysisBody(project, photos)) <= MAX_ANALYSIS_REQUEST_BYTES) return [photos]
  const midpoint = Math.ceil(photos.length / 2)
  return [
    ...splitAnalysisBatch(project, photos.slice(0, midpoint)),
    ...splitAnalysisBatch(project, photos.slice(midpoint)),
  ]
}

function isAbortError(cause: unknown) {
  return cause instanceof DOMException && cause.name === 'AbortError'
}

export function CarouselCreatorApp() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [aiMode, setAiMode] = useState('Mock')
  const saveTimeout = useRef<number | null>(null)
  const analysisAbortRef = useRef<AbortController | null>(null)

  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) ?? null, [projects, selectedProjectId])

  const postJson = useCallback(async <T,>(url: string, body: unknown, signal?: AbortSignal): Promise<T> => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
    const payload = await response.json().catch(() => null) as { error?: string } | null

    if (response.status === 401) {
      router.replace('/login')
      router.refresh()
      throw new Error('Your session expired. Sign in again.')
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      throw new Error(`Too many requests. Try again${retryAfter ? ` in ${retryAfter} seconds` : ' shortly'}.`)
    }

    if (!response.ok || !payload) throw new Error(payload?.error || 'Request failed.')
    return payload as T
  }, [router])

  useEffect(() => () => analysisAbortRef.current?.abort(), [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const [saved, modeResponse] = await Promise.all([
        localProjectRepository.listProjects(),
        fetch('/api/ai/mode').catch(() => null),
      ])

      const hasDemo = saved.some((project) => project.id === demoProject.id)
      if (!hasDemo) await localProjectRepository.createProject(demoProject)
      const hydrated = hasDemo ? saved : [demoProject, ...saved]
      const urlProject = new URLSearchParams(window.location.search).get('project')

      if (modeResponse?.status === 401) {
        router.replace('/login')
        router.refresh()
        return
      }

      if (modeResponse?.ok) {
        const modePayload = (await modeResponse.json()) as { mode?: string }
        if (!cancelled && modePayload.mode) setAiMode(modePayload.mode)
      }

      if (!cancelled) {
        setProjects(hydrated)
        setSelectedProjectId(urlProject && hydrated.some((project) => project.id === urlProject) ? urlProject : null)
        setLoading(false)
      }
    }

    void bootstrap()
    return () => { cancelled = true }
  }, [router])

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
    analysisAbortRef.current?.abort()
    const controller = new AbortController()
    analysisAbortRef.current = controller
    const toastId = toast.loading(`Preparing ${project.photos.length} photos…`)
    upsertProject({ ...project, status: 'analyzing', updatedAt: new Date().toISOString() })

    try {
      const analysisById = new Map<string, AnalysisResult>()
      for (const photo of project.photos) {
        if (photo.analysis) analysisById.set(photo.id, photo.analysis as AnalysisResult)
      }

      const pending = project.photos.filter((photo) => !analysisById.has(photo.id))
      let preparedCount = project.photos.length - pending.length

      for (let offset = 0; offset < pending.length; offset += MAX_ANALYSIS_BATCH) {
        const sourceBatch = pending.slice(offset, offset + MAX_ANALYSIS_BATCH)
        const preparedBatch: AnalysisPhoto[] = []

        for (const photo of sourceBatch) {
          if (controller.signal.aborted) throw new DOMException('Generation cancelled', 'AbortError')
          const dataUrl = await makeAnalysisImage(photo.dataUrl || photo.url)
          preparedBatch.push({
            id: photo.id,
            originalName: photo.originalName,
            url: photo.originalName,
            dataUrl,
            width: photo.width,
            height: photo.height,
            mimeType: 'image/jpeg',
          })
        }

        const requestBatches = splitAnalysisBatch(project, preparedBatch)
        for (const batch of requestBatches) {
          const start = preparedCount + 1
          const end = preparedCount + batch.length
          toast.loading(`Analyzing photos ${start}–${end} of ${project.photos.length}…`, { id: toastId })

          let result: { mode: string; analyses: Array<{ photoId: string; analysis: AnalysisResult }> } | null = null
          for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
              result = await postJson('/api/ai/analyze', analysisBody(project, batch), controller.signal)
              break
            } catch (cause) {
              if (isAbortError(cause) || attempt === 1) throw cause
            }
          }

          if (!result || result.analyses.length !== batch.length) throw new Error('Image analysis returned an unexpected result count.')
          const expectedIds = new Set(batch.map((photo) => photo.id))
          for (const item of result.analyses) {
            if (!expectedIds.has(item.photoId)) throw new Error('Image analysis returned an unexpected photo reference.')
            analysisById.set(item.photoId, item.analysis)
          }
          if (batch.some((photo) => !analysisById.has(photo.id))) throw new Error('Image analysis did not return every requested photo.')

          setAiMode(result.mode)
          preparedCount += batch.length

          const partialProject: Project = {
            ...project,
            status: 'analyzing',
            photos: project.photos.map((photo) => ({ ...photo, analysis: analysisById.get(photo.id) ?? photo.analysis })),
            updatedAt: new Date().toISOString(),
          }
          await localProjectRepository.updateProject(partialProject)
          upsertProject(partialProject)
        }
      }

      const analyses = project.photos.map((photo) => analysisById.get(photo.id))
      if (analyses.some((analysis) => !analysis)) throw new Error('Not every photo has a completed analysis.')
      const orderedAnalyses = analyses as AnalysisResult[]

      toast.loading('Writing carousel and caption…', { id: toastId })
      const compactPhotos = project.photos.map((photo) => ({
        id: photo.id,
        originalName: photo.originalName,
        url: photo.originalName,
        width: photo.width,
        height: photo.height,
        mimeType: 'image/jpeg' as const,
      }))

      const payload = await postJson<{
        mode: string
        analyses: AnalysisResult[]
        slides: SlideResult[]
        caption: { caption: string; hashtags: string[]; keywords: string[] }
      }>('/api/ai/generate-carousel', {
        title: project.title,
        location: project.location,
        notes: project.notes,
        photos: compactPhotos,
        analyses: orderedAnalyses,
      }, controller.signal)

      setAiMode(payload.mode)
      const nextProject: Project = {
        ...project,
        status: 'generated',
        photos: project.photos.map((photo, index) => ({ ...photo, analysis: payload.analyses[index] ?? orderedAnalyses[index] })),
        slides: payload.slides.map((slide, index) => mapSlideResult(slide, index)),
        caption: payload.caption.caption,
        hashtags: payload.caption.hashtags,
        keywords: payload.caption.keywords,
        updatedAt: new Date().toISOString(),
      }
      await localProjectRepository.updateProject(nextProject)
      upsertProject(nextProject)
      toast.success(`Carousel generated in ${payload.mode} mode.`, { id: toastId })
    } catch (cause) {
      if (isAbortError(cause)) {
        toast.dismiss(toastId)
        return
      }
      const message = cause instanceof Error ? cause.message : 'Carousel generation failed.'
      const latestProject = await localProjectRepository.getProject(project.id)
      if (latestProject) upsertProject({ ...latestProject, status: 'ready', updatedAt: new Date().toISOString() })
      else upsertProject({ ...project, status: 'ready', updatedAt: new Date().toISOString() })
      toast.error(message, { id: toastId })
      throw cause
    } finally {
      if (analysisAbortRef.current === controller) analysisAbortRef.current = null
    }
  }

  async function regenerateSlide(project: Project, slideId: string, target: 'slide' | 'headline' | 'body') {
    const slide = project.slides.find((entry) => entry.id === slideId)
    const photo = project.photos.find((entry) => entry.id === slide?.photoId)
    if (!slide || !photo) return

    const analysisDataUrl = await makeAnalysisImage(photo.dataUrl || photo.url)
    const payload = await postJson<{ mode: string; slide: SlideResult }>('/api/ai/regenerate-slide', {
      projectTitle: project.title,
      location: project.location,
      notes: project.notes,
      photo: { ...photo, url: photo.originalName, dataUrl: analysisDataUrl, thumbnailDataUrl: undefined, mimeType: 'image/jpeg' },
      currentSlide: slide,
      target,
    })
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

    const payload = await postJson<{
      mode: string
      caption: { caption: string; hashtags: string[]; keywords: string[] }
    }>('/api/ai/generate-caption', { title: project.title, location: project.location, notes: project.notes, slides })

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

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-stone-400">Loading carousel projects…</div>

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
