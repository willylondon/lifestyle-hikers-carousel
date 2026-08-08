import { openDB } from 'idb'
import type { Project } from '@/types'
import type { ProjectRepository } from './project-repository'

const DB_NAME = 'lifestyle-hikers-carousel'
const STORE_NAME = 'projects'
const FALLBACK_KEY = 'lifestyle-hikers-carousel-projects'

async function openProjectsDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    },
  })
}

function hasIndexedDb() {
  return typeof indexedDB !== 'undefined'
}

function readLocalStorage(): Project[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(FALLBACK_KEY)
    return raw ? (JSON.parse(raw) as Project[]) : []
  } catch {
    return []
  }
}

function writeLocalStorage(projects: Project[]) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(projects))
}

export class LocalProjectRepository implements ProjectRepository {
  async createProject(project: Project) {
    return this.updateProject(project)
  }

  async updateProject(project: Project) {
    if (hasIndexedDb()) {
      const db = await openProjectsDB()
      await db.put(STORE_NAME, project)
      return project
    }

    const projects = readLocalStorage().filter((entry) => entry.id !== project.id)
    projects.unshift(project)
    writeLocalStorage(projects)
    return project
  }

  async deleteProject(projectId: string) {
    if (hasIndexedDb()) {
      const db = await openProjectsDB()
      await db.delete(STORE_NAME, projectId)
      return
    }

    writeLocalStorage(readLocalStorage().filter((entry) => entry.id !== projectId))
  }

  async getProject(projectId: string) {
    if (hasIndexedDb()) {
      const db = await openProjectsDB()
      return (await db.get(STORE_NAME, projectId)) ?? null
    }

    return readLocalStorage().find((entry) => entry.id === projectId) ?? null
  }

  async listProjects() {
    if (hasIndexedDb()) {
      const db = await openProjectsDB()
      const projects = await db.getAll(STORE_NAME)
      return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    }

    return readLocalStorage().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
}

export const localProjectRepository = new LocalProjectRepository()
