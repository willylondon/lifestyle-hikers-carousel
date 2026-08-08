import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const repositoryMocks = vi.hoisted(() => ({
  listProjects: vi.fn(),
  updateProject: vi.fn(),
  createProject: vi.fn(),
  deleteProject: vi.fn(),
}))

const fixtures = vi.hoisted(() => ({
  demoProject: {
    id: 'demo-coastal-jamaica',
    title: 'Demo',
    location: 'Demo Location',
    notes: 'Demo notes',
    createdAt: '2026-08-08T00:00:00.000Z',
    updatedAt: '2026-08-08T00:00:00.000Z',
    status: 'generated' as const,
    photos: [],
    slides: [],
    caption: '',
    hashtags: [],
    keywords: [],
    coverPhotoId: undefined,
  },
  userProject: {
    id: 'user-project',
    title: 'User Project',
    location: 'Hellshire',
    notes: 'User notes',
    createdAt: '2026-08-08T00:00:00.000Z',
    updatedAt: '2026-08-08T00:00:00.000Z',
    status: 'ready' as const,
    photos: [],
    slides: [],
    caption: '',
    hashtags: [],
    keywords: [],
    coverPhotoId: undefined,
  },
}))

vi.mock('@/lib/repositories/local-project-repository', () => ({
  localProjectRepository: {
    listProjects: repositoryMocks.listProjects,
    updateProject: repositoryMocks.updateProject,
    createProject: repositoryMocks.createProject,
    deleteProject: repositoryMocks.deleteProject,
  },
}))

vi.mock('@/lib/demo/demo-project', () => ({ demoProject: fixtures.demoProject }))

vi.mock('@/components/dashboard-view', () => ({
  DashboardView: ({ projects, onOpen }: { projects: Array<{ id: string; title: string }>; onOpen: (id: string) => void }) => (
    <div>
      {projects.map((project) => (
        <button key={project.id} onClick={() => onOpen(project.id)}>
          open-{project.id}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('@/components/new-project-dialog', () => ({
  NewProjectDialog: () => null,
}))

vi.mock('@/components/carousel-editor', () => ({
  CarouselEditor: ({ project, onBack }: { project: { id: string }; onBack: () => void }) => (
    <div>
      <div>editor-{project.id}</div>
      <button onClick={onBack}>back</button>
    </div>
  ),
}))

import { CarouselCreatorApp } from '@/components/carousel-creator-app'

describe('CarouselCreatorApp autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    repositoryMocks.listProjects.mockResolvedValue([fixtures.userProject, fixtures.demoProject])
    repositoryMocks.updateProject.mockResolvedValue(undefined)
    repositoryMocks.createProject.mockResolvedValue(undefined)
    repositoryMocks.deleteProject.mockResolvedValue(undefined)
    window.history.replaceState({}, '', 'http://localhost:3000/')
  })

  it('cancels pending autosave when the project is deselected', async () => {
    render(<CarouselCreatorApp />)

    await act(async () => {
      await Promise.resolve()
    })

    fireEvent.click(screen.getByText('open-user-project'))
    expect(screen.getByText('editor-user-project')).toBeTruthy()

    fireEvent.click(screen.getByText('back'))
    expect(screen.getByText('open-user-project')).toBeTruthy()

    await act(async () => {
      vi.advanceTimersByTime(300)
      await Promise.resolve()
    })

    expect(repositoryMocks.updateProject).not.toHaveBeenCalled()
  })
})
