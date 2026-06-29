import client from './client';
import type { GenericResult, ExternalLinkRequest, ExternalLinkResponse } from '../types';

export async function getExternalLinks(): Promise<GenericResult<ExternalLinkResponse[]>> {
  const res = await client.get('/external-links');
  return res.data;
}

export async function createExternalLink(req: ExternalLinkRequest): Promise<GenericResult<ExternalLinkResponse>> {
  const res = await client.post('/external-links', req);
  return res.data;
}

export async function updateExternalLink(id: number, req: ExternalLinkRequest): Promise<GenericResult<ExternalLinkResponse>> {
  const res = await client.put(`/external-links/${id}`, req);
  return res.data;
}

export async function deleteExternalLink(id: number): Promise<void> {
  await client.delete(`/external-links/${id}`);
}
