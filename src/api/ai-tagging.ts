import client from './client';
import type { GenericResult } from '../types';

export interface AiTaggingConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  apiKeySet: boolean;
  model: string;
  maxTags: number;
  cron: string;
}

export interface AiTaggingStats {
  total: number;
  tagged: number;
  pending: number;
}

export interface AiTagResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export interface AiTaggingConfigPayload {
  enabled?: boolean;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  maxTags?: number;
  cron?: string;
}

export async function getAiTaggingConfig(): Promise<GenericResult<AiTaggingConfig>> {
  const res = await client.get('/ai-tagging/config');
  return res.data;
}

export async function updateAiTaggingConfig(payload: AiTaggingConfigPayload): Promise<GenericResult<void>> {
  const res = await client.put('/ai-tagging/config', payload);
  return res.data;
}

export async function tagBookmarkWithAi(id: number): Promise<GenericResult<string[]>> {
  const res = await client.post(`/ai-tagging/tag/bookmark/${id}`);
  return res.data;
}

export async function tagBatchWithAi(ids: number[]): Promise<GenericResult<AiTagResult>> {
  const res = await client.post('/ai-tagging/tag/batch', { ids });
  return res.data;
}

export async function tagPendingWithAi(): Promise<GenericResult<AiTagResult>> {
  const res = await client.post('/ai-tagging/tag/pending');
  return res.data;
}

export async function getAiTaggingStats(): Promise<GenericResult<AiTaggingStats>> {
  const res = await client.get('/ai-tagging/stats');
  return res.data;
}
