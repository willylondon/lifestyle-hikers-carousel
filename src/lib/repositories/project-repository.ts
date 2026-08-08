import type { Project } from '@/types'

export interface ProjectRepository {
  createProject(project: Project): Promise<Project>
  updateProject(project: Project): Promise<Project>
  deleteProject(projectId: string): Promise<void>
  getProject(projectId: string): Promise<Project | null>
  listProjects(): Promise<Project[]>
}
