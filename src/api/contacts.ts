import client from './client'
import type { AddressBookResponse, ContactRequest, ContactResponse } from '../types'

export function listAddressBooks() {
  return client.get<import('../types').GenericResult<AddressBookResponse[]>>('/addressbooks')
}

export function createAddressBook(name: string, description?: string) {
  const params = new URLSearchParams()
  params.set('name', name)
  if (description) params.set('description', description)
  return client.post<import('../types').GenericResult<AddressBookResponse>>('/addressbooks', null, { params })
}

export function updateAddressBook(id: number, name?: string, description?: string) {
  const params = new URLSearchParams()
  if (name) params.set('name', name)
  if (description) params.set('description', description)
  return client.put<import('../types').GenericResult<AddressBookResponse>>(`/addressbooks/${id}`, null, { params })
}

export function deleteAddressBook(id: number) {
  return client.delete(`/addressbooks/${id}`)
}

export function listContacts(addressBookId: number) {
  return client.get<import('../types').GenericResult<ContactResponse[]>>('/contacts', {
    params: { addressBookId },
  })
}

export function createContact(addressBookId: number, data: ContactRequest) {
  return client.post<import('../types').GenericResult<ContactResponse>>('/contacts', data, {
    params: { addressBookId },
  })
}

export function updateContact(id: number, data: ContactRequest) {
  return client.put<import('../types').GenericResult<ContactResponse>>(`/contacts/${id}`, data)
}

export function deleteContact(id: number) {
  return client.delete(`/contacts/${id}`)
}
