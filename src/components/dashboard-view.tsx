/* eslint-disable @next/next/no-img-element */

import { ArrowRight, Clock3, Layers3, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Project } from '@/types'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DashboardView({
  projects,
  onCreate,
  onOpen,
}: {
  projects: Project[]
  onCreate: () => void
  onOpen: (projectId: string) => void
}) {
  const demoProject = projects.find((project) => project.id === 'demo-coastal-jamaica')
  const userProjects = projects.filter((project) => project.id !== 'demo-coastal-jamaica')

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-7 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
        <div className="space-y-5">
          <Badge className="w-fit border border-emerald-300/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/10">Lifestyle Hikers Carousel Creator</Badge>
          <div className="space-y-3">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-stone-50 md:text-5xl">Turn hike photos into stories worth saving.</h1>
            <p className="max-w-2xl text-lg leading-8 text-stone-400">Upload trail images, add grounded hike notes, let the story engine sequence the strongest frames, then refine every slide before export.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={onCreate} className="h-12 rounded-full bg-stone-50 px-6 text-stone-950 hover:bg-stone-200">Create Carousel</Button>
            {demoProject ? <Button variant="secondary" className="h-12 rounded-full" onClick={() => onOpen(demoProject.id)}>Open demo project</Button> : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {[
            { label: 'Workflow', value: 'Upload → Story → Edit → Export' },
            { label: 'Canvas', value: '1080 × 1350 deterministic render' },
            { label: 'Mode', value: 'Mock-ready, OpenAI optional' },
          ].map((item) => (
            <Card key={item.label} className="border-white/10 bg-black/25 text-stone-100">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-stone-500">{item.label}</p>
                <p className="mt-3 text-lg font-medium text-stone-100">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-stone-100">Recent projects</h2>
          <Button variant="ghost" onClick={onCreate}>New project</Button>
        </div>

        {userProjects.length === 0 ? (
          <Card className="border-dashed border-white/15 bg-white/[0.02] text-stone-200">
            <CardContent className="flex flex-col items-start gap-4 p-8">
              <p className="text-sm uppercase tracking-[0.28em] text-stone-500">First use</p>
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold text-stone-50">No personal projects yet.</h3>
                <p className="max-w-xl text-stone-400">Create your first carousel from 5–15 hike photos, or open the seeded coastal Jamaica demo to explore the full editor before uploading anything.</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={onCreate}>Create carousel</Button>
                {demoProject ? <Button variant="secondary" onClick={() => onOpen(demoProject.id)}>Explore demo</Button> : null}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {userProjects.map((project) => {
              const cover = project.photos.find((photo) => photo.id === project.coverPhotoId) || project.photos[0]
              return (
                <Card key={project.id} className="overflow-hidden border-white/10 bg-black/25 text-stone-100">
                  <div className="aspect-[4/3] bg-black/35">
                    {cover ? <img src={cover.thumbnailDataUrl || cover.dataUrl || cover.url} alt={project.title} className="h-full w-full object-cover" /> : null}
                  </div>
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-xl text-stone-50">{project.title}</CardTitle>
                        <p className="mt-2 flex items-center gap-2 text-sm text-stone-400"><MapPin className="h-4 w-4" />{project.location}</p>
                      </div>
                      <Badge variant="outline" className="border-white/15 text-stone-300">{project.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0 text-sm text-stone-400">
                    <div className="flex flex-wrap gap-4">
                      <span className="inline-flex items-center gap-2"><Layers3 className="h-4 w-4" />{project.slides.length} slides</span>
                      <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{formatDate(project.updatedAt)}</span>
                    </div>
                    <Button className="w-full justify-between" onClick={() => onOpen(project.id)}>Open project <ArrowRight className="h-4 w-4" /></Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
