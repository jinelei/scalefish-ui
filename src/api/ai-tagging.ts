import client from './client';
import { postSse } from './sse';
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

export interface AiTaggingStreamEvent {
  event: string;
  total?: number;
  index?: number;
  id?: number;
  tags?: string[] | null;
  error?: string | null;
  result?: AiTagResult | null;
  message?: string;
}

export interface AiTaggingStreamHandlers {
  onStart?: (total: number) => void;
  onProgress?: (e: {
    index: number;
    total: number;
    id: number;
    tags: string[] | null;
    error: string | null;
  }) => void;
  onDone?: (e: { id?: number; tags?: string[] | null; result?: AiTagResult | null }) => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

function bindStream(handlers: AiTaggingStreamHandlers, signal?: AbortSignal) {
  return {
    onEvent: (name: string, data: AiTaggingStreamEvent) => {
      if (name === 'start') {
        handlers.onStart?.(data.total ?? 0);
      } else if (name === 'progress') {
        handlers.onProgress?.({
          index: data.index ?? 0,
          total: data.total ?? 0,
          id: data.id ?? 0,
          tags: data.tags ?? null,
          error: data.error ?? null,
        });
      } else if (name === 'done') {
        handlers.onDone?.({ id: data.id, tags: data.tags ?? null, result: data.result ?? null });
      } else if (name === 'error') {
        handlers.onError?.(data.message ?? 'AI 打标失败');
      }
    },
    onError: handlers.onError,
    onClose: handlers.onClose,
    signal,
  };
}

export function tagBookmarkWithAiStream(
  id: number,
  handlers: AiTaggingStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  return postSse<AiTaggingStreamEvent>(
    `/ai-tagging/tag/bookmark/${id}/stream`,
    undefined,
    bindStream(handlers, signal),
    signal,
  );
}

export function tagBatchWithAiStream(
  ids: number[],
  handlers: AiTaggingStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  return postSse<AiTaggingStreamEvent>(
    '/ai-tagging/tag/batch/stream',
    { ids },
    bindStream(handlers, signal),
    signal,
  );
}

export function tagPendingWithAiStream(
  handlers: AiTaggingStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  return postSse<AiTaggingStreamEvent>(
    '/ai-tagging/tag/pending/stream',
    undefined,
    bindStream(handlers, signal),
    signal,
  );
}
