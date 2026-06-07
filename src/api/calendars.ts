import client from './client'
import type { CalendarResponse, CalendarEventRequest, CalendarEventResponse } from '../types'

export function listCalendars() {
  return client.get<import('../types').GenericResult<CalendarResponse[]>>('/calendars')
}

export function createCalendar(name: string, description?: string, displayColor?: string) {
  const params = new URLSearchParams()
  params.set('name', name)
  if (description) params.set('description', description)
  if (displayColor) params.set('displayColor', displayColor)
  return client.post<import('../types').GenericResult<CalendarResponse>>('/calendars', null, { params })
}

export function updateCalendar(id: number, name?: string, description?: string, displayColor?: string) {
  const params = new URLSearchParams()
  if (name) params.set('name', name)
  if (description) params.set('description', description)
  if (displayColor) params.set('displayColor', displayColor)
  return client.put<import('../types').GenericResult<CalendarResponse>>(`/calendars/${id}`, null, { params })
}

export function deleteCalendar(id: number) {
  return client.delete(`/calendars/${id}`)
}

export function listEvents(calendarId: number) {
  return client.get<import('../types').GenericResult<CalendarEventResponse[]>>('/events', {
    params: { calendarId },
  })
}

export function listEventsByRange(start: string, end: string) {
  return client.get<import('../types').GenericResult<CalendarEventResponse[]>>('/events', {
    params: { start, end },
  })
}

export function createEvent(calendarId: number, data: CalendarEventRequest) {
  return client.post<import('../types').GenericResult<CalendarEventResponse>>('/events', data, {
    params: { calendarId },
  })
}

export function updateEvent(id: number, data: CalendarEventRequest) {
  return client.put<import('../types').GenericResult<CalendarEventResponse>>(`/events/${id}`, data)
}

export function deleteEvent(id: number) {
  return client.delete(`/events/${id}`)
}
