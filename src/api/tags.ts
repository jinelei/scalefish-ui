import client from './client';
import type { GenericResult, TagRequest, TagResponse, TagStatsResponse } from '../types';

export async function getAllTags(): Promise<GenericResult<TagResponse[]>> {
  const res = await client.get('/tags');
  return res.data;
}

export async function getTagStats(params: { categoryIds?: number[]; tagIds?: number[] }): Promise<GenericResult<TagStatsResponse[]>> {
  const res = await client.get('/tags/stats', { params });
  return res.data;
}

export async function createTag(
  req: TagRequest,
): Promise<GenericResult<TagResponse>> {
  const res = await client.post('/tags', req);
  return res.data;
}

export async function deleteTag(id: number): Promise<void> {
  await client.delete(`/tags/${id}`);
}
