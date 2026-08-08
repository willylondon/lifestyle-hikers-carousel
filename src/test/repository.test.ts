import { describe, expect, it } from 'vitest'
import { LocalProjectRepository } from '@/lib/repositories/local-project-repository'
import { demoProject } from '@/lib/demo/demo-project'

describe('local project repository', () => {
  it('creates, fetches, lists, and deletes a project', async () => {
    const repository = new LocalProjectRepository()
    const project = { ...demoProject, id: 'repo-test-project', updatedAt: new Date().toISOString() }

    await repository.createProject(project)
    expect((await repository.getProject(project.id))?.title).toBe(project.title)
    expect((await repository.listProjects()).some((entry) => entry.id === project.id)).toBe(true)
    await repository.deleteProject(project.id)
    expect(await repository.getProject(project.id)).toBeNull()
  })
})
