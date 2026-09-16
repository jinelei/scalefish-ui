import client from './client'
import type { GenericResult } from '../types'

export interface AiSystemConfig {
  baseUrl: string
  apiKeySet: boolean
  model: string
  maxTags: number
  schedulerEnabled: boolean
  forceDeviceVerification: boolean
}

export interface AiSystemConfigPayload {
  baseUrl?: string
  apiKey?: string
  model?: string
  maxTags?: number
  schedulerEnabled?: boolean
  forceDeviceVerification?: boolean
}

export async function getAiSystemConfig(): Promise<GenericResult<AiSystemConfig>> {
  const res = await client.get('/admin/ai-config')
  return res.data
}

export async function updateAiSystemConfig(payload: AiSystemConfigPayload): Promise<GenericResult<void>> {
  const res = await client.put('/admin/ai-config', payload)
  return res.data
}
