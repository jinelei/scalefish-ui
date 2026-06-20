import client from './client';
import type { GenericResult } from '../types';

export async function getAppConfig(): Promise<GenericResult<Record<string, string>>> {
  const res = await client.get('/app-config');
  return res.data;
}

export async function updateAppConfig(config: Record<string, string>): Promise<void> {
  await client.put('/app-config', config);
}
