import type { AIService } from './types'
import { MockAIService } from './mock-service'
import { OpenAIService } from './openai-service'

export function createAIService(): AIService {
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIService()
  }

  return new MockAIService()
}

export function getAIMode() {
  return process.env.OPENAI_API_KEY ? 'OpenAI' : 'Mock'
}
