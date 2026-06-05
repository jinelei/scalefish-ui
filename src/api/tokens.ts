import client from './client'
import type { GenericResult, ApiTokenResponse, CreateApiTokenRequest } from '../types'

export async function listTokens(): Promise<GenericResult<ApiTokenResponse[]>> {
  const res = await client.get('/tokens')
  return res.data
}

export async function createToken(req: CreateApiTokenRequest): Promise<GenericResult<ApiTokenResponse>> {
  const res = await client.post('/tokens', req)
  return res.data
}

export async function revokeToken(id: number): Promise<void> {
  await client.delete(`/tokens/${id}`)
}
