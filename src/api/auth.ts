import client from './client'
import type { AuthResponse, LoginRequest, UserInfo, RegistrationStatus, GenericResult } from '../types'

export async function login(req: LoginRequest): Promise<GenericResult<AuthResponse>> {
  const res = await client.post('/auth/login', req)
  return res.data
}

export async function register(req: LoginRequest & { name?: string; email?: string }): Promise<GenericResult<AuthResponse>> {
  const res = await client.post('/auth/register', req)
  return res.data
}

export async function refreshToken(token: string): Promise<GenericResult<AuthResponse>> {
  const res = await client.post('/auth/refresh', { refreshToken: token })
  return res.data
}

export async function logout(): Promise<void> {
  await client.post('/auth/logout')
}

export async function getMe(): Promise<GenericResult<UserInfo>> {
  const res = await client.get('/auth/me')
  return res.data
}

export async function getRegistrationStatus(): Promise<GenericResult<RegistrationStatus>> {
  const res = await client.get('/auth/registration-status')
  return res.data
}
