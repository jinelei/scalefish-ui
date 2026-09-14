import client from './client'
import type { GenericResult, AdminUserResponse, CreateUserRequest } from '../types'

export async function listAdminUsers(): Promise<GenericResult<AdminUserResponse[]>> {
  const res = await client.get('/admin/users')
  return res.data
}

export async function createAdminUser(data: CreateUserRequest): Promise<GenericResult<AdminUserResponse>> {
  const res = await client.post('/admin/users', data)
  return res.data
}

export async function resetUserPassword(id: number, newPassword: string): Promise<void> {
  await client.post(`/admin/users/${id}/reset-password`, { newPassword })
}

export async function setUserEnabled(id: number, enabled: boolean): Promise<void> {
  await client.post(`/admin/users/${id}/${enabled ? 'enable' : 'disable'}`)
}
