import { useState, useEffect, useMemo } from 'react'
import { FiPlus, FiTrash2, FiEdit2, FiCalendar, FiChevronLeft, FiChevronRight, FiClock, FiLink, FiTag, FiMenu, FiX } from 'react-icons/fi'
import toast from 'react-hot-toast'
import Modal from '../components/Modal'
import {
  listCalendars, createCalendar, deleteCalendar,
  listEventsByRange, createEvent, updateEvent, deleteEvent,
} from '../api/calendars'
import type { CalendarResponse, CalendarEventRequest, CalendarEventResponse } from '../types'

type ViewMode = 'day' | 'week' | 'month'

const WEEKDAY_CN = ['一', '二', '三', '四', '五', '六', '日']

function isWeekend(d: Date) {
  const w = d.getDay()
  return w === 0 || w === 6
}

function mondayBasedDow(d: Date) {
  return (d.getDay() + 6) % 7
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function shortDate(d: Date) {
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function startOfWeek(d: Date) {
  const r = new Date(d)
  const diff = mondayBasedDow(r)
  r.setDate(r.getDate() - diff)
  r.setHours(0, 0, 0, 0)
  return r
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

function daysInMonth(d: Date) {
  return endOfMonth(d).getDate()
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function addWeeks(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n * 7)
  return r
}

function addMonths(d: Date, n: number) {
  const r = new Date(d)
  r.setMonth(r.getMonth() + n)
  return r
}

function toLocalStr(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export default function Calendars() {
  const [calendars, setCalendars] = useState<CalendarResponse[]>([])
  const [selectedCal, setSelectedCal] = useState<CalendarResponse | null>(null)

  // Calendar creation modal
  const [showCalModal, setShowCalModal] = useState(false)
  const [calName, setCalName] = useState('')
  const [calDesc, setCalDesc] = useState('')
  const [calColor, setCalColor] = useState('#3b82f6')

  // Event modal
  const [showEventModal, setShowEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEventResponse | null>(null)
  const [modalCalId, setModalCalId] = useState<number | ''>('')
  const [eventTitle, setEventTitle] = useState('')
  const [eventDesc, setEventDesc] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventStart, setEventStart] = useState('')
  const [eventEnd, setEventEnd] = useState('')
  const [eventAllDay, setEventAllDay] = useState(false)
  const [eventStatus, setEventStatus] = useState('CONFIRMED')
  const [eventPriority, setEventPriority] = useState(0)
  const [eventCategories, setEventCategories] = useState('')
  const [eventUrl, setEventUrl] = useState('')

  // Sidebar toggle for mobile
  const [showSidebar, setShowSidebar] = useState(false)

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [cursor, setCursor] = useState(new Date())
  const today = useMemo(() => new Date(), [])

  // When cursor/selected changes, fetch events for the visible range
  const visibleRange = useMemo(() => {
    if (viewMode === 'day') {
      const s = new Date(cursor); s.setHours(0, 0, 0, 0)
      const e = new Date(cursor); e.setHours(23, 59, 59, 0)
      return { start: toLocalStr(s), end: toLocalStr(e) }
    }
    if (viewMode === 'week') {
      const s = startOfWeek(cursor)
      const e = addDays(s, 7)
      return { start: toLocalStr(s), end: toLocalStr(e) }
    }
    const s = startOfMonth(cursor)
    const e = addMonths(s, 1)
    return { start: toLocalStr(s), end: toLocalStr(e) }
  }, [cursor, viewMode])

  const [events, setEvents] = useState<CalendarEventResponse[]>([])

  useEffect(() => { loadCalendars() }, [])

  useEffect(() => {
    listEventsByRange(visibleRange.start, visibleRange.end)
      .then(r => setEvents(r.data.data || []))
      .catch(() => {})
  }, [visibleRange])

  function loadCalendars() {
    listCalendars().then(r => {
      const list = r.data.data || []
      setCalendars(list)
      if (!selectedCal && list.length > 0) {
        setSelectedCal(list[0])
      }
    }).catch(() => {})
  }

  // Events for selected day
  const dayEvents = useMemo(() => {
    return events
      .filter(e => sameDay(new Date(e.startTime), cursor))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }, [events, cursor])

  // Events for the visible week (descending by time)
  const weekEvents = useMemo(() => {
    if (viewMode !== 'week') return []
    const weekStart = startOfWeek(cursor)
    const weekEnd = addDays(weekStart, 7)
    return events
      .filter(e => {
        const d = new Date(e.startTime)
        return d >= weekStart && d < weekEnd
      })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  }, [events, cursor, viewMode])

  // Days in month that have events
  const eventDays = useMemo(() => {
    const set = new Set<number>()
    for (const e of events) {
      const d = new Date(e.startTime).getDate()
      set.add(d)
    }
    return set
  }, [events])

  function navigate(dir: number) {
    if (viewMode === 'day') setCursor(addDays(cursor, dir))
    else if (viewMode === 'week') setCursor(addWeeks(cursor, dir))
    else setCursor(addMonths(cursor, dir))
  }

  function periodLabel() {
    if (viewMode === 'day') return `${cursor.getFullYear()}年${cursor.getMonth() + 1}月${cursor.getDate()}日`
    if (viewMode === 'week') {
      const s = startOfWeek(cursor)
      const e = addDays(s, 6)
      return `${s.getFullYear()}年${s.getMonth() + 1}月${s.getDate()}日 - ${e.getMonth() + 1}月${e.getDate()}日`
    }
    return `${cursor.getFullYear()}年${cursor.getMonth() + 1}月`
  }

  // ---- Event CRUD ----
  function resetEventForm() {
    setEditingEvent(null)
    setModalCalId(selectedCal?.id ?? '')
    setEventTitle('')
    setEventDesc('')
    setEventLocation('')
    setEventStart('')
    setEventEnd('')
    setEventAllDay(false)
    setEventStatus('CONFIRMED')
    setEventPriority(0)
    setEventCategories('')
    setEventUrl('')
  }

  function openCreateEvent(day?: Date) {
    resetEventForm()
    const d = day || cursor
    setEventStart(formatDate(d) + 'T09:00')
    setEventEnd(formatDate(d) + 'T10:00')
    setShowEventModal(true)
  }

  function openEditEvent(event: CalendarEventResponse) {
    setEditingEvent(event)
    setModalCalId(event.calendarId)
    setEventTitle(event.title)
    setEventDesc(event.description || '')
    setEventLocation(event.location || '')
    setEventStart(event.allDay ? event.startTime.replace('Z', '').slice(0, 10) : event.startTime.replace('Z', '').slice(0, 16))
    setEventEnd(event.allDay ? event.endTime.replace('Z', '').slice(0, 10) : event.endTime.replace('Z', '').slice(0, 16))
    setEventAllDay(event.allDay)
    setEventStatus(event.status || 'CONFIRMED')
    setEventPriority(event.priority ?? 0)
    setEventCategories(event.categories || '')
    setEventUrl(event.url || '')
    setShowEventModal(true)
  }

  function handleSaveEvent() {
    const calId = editingEvent ? editingEvent.calendarId : modalCalId
    if (!calId) return toast.error('请选择一个日历')
    if (!eventTitle.trim() || !eventStart || !eventEnd) return toast.error('请填写事件信息')
    const data: CalendarEventRequest = {
      title: eventTitle,
      description: eventDesc || undefined,
      location: eventLocation || undefined,
      startTime: eventAllDay ? eventStart + 'T00:00:00' : toLocalStr(new Date(eventStart)),
      endTime: eventAllDay ? eventEnd + 'T00:00:00' : toLocalStr(new Date(eventEnd)),
      allDay: eventAllDay,
      status: eventStatus,
      priority: eventPriority || undefined,
      categories: eventCategories || undefined,
      url: eventUrl || undefined,
    }
    const p = editingEvent
      ? updateEvent(editingEvent.id, data)
      : createEvent(calId as number, data)
    p.then(() => {
      toast.success(editingEvent ? '事件已更新' : '事件已创建')
      setShowEventModal(false)
      refreshEvents()
    }).catch(e => toast.error(e.message))
  }

  function handleDeleteEvent(id: number) {
    setDeleteConfirmId(id)
  }

  function confirmDeleteEvent() {
    if (deleteConfirmId == null) return
    deleteEvent(deleteConfirmId).then(() => {
      toast.success('事件已删除')
      setDeleteConfirmId(null)
      refreshEvents()
    }).catch(e => toast.error(e.message))
  }

  function refreshEvents() {
    listEventsByRange(visibleRange.start, visibleRange.end)
      .then(r => setEvents(r.data.data || []))
      .catch(() => {})
  }

  // ---- Calendar CRUD ----
  function handleCreateCalendar() {
    if (!calName.trim()) return toast.error('请输入日历名称')
    createCalendar(calName, calDesc || undefined, calColor).then(() => {
      toast.success('日历已创建')
      setShowCalModal(false)
      setCalName('')
      setCalDesc('')
      loadCalendars()
    }).catch(e => toast.error(e.message))
  }

  // ---- Render helpers ----
  function renderDayCell(d: Date, idx: number) {
    const isToday = sameDay(d, today)
    const isSelected = sameDay(d, cursor)
    const hasEvents = eventDays.has(d.getDate())
    const isCurrentMonth = d.getMonth() === cursor.getMonth()
    const weekend = isWeekend(d)

    return (
      <div
        key={idx}
        onClick={() => setCursor(d)}
        className={`
          relative py-2.5 md:py-4 px-1 md:px-1.5 text-center cursor-pointer rounded-lg transition-all text-[11px] md:text-xs min-h-[2.5rem] md:min-h-[3.5rem]
          ${!isCurrentMonth ? 'text-gray-600' : ''}
          ${isSelected ? 'bg-accent-500/20 text-accent-400 ring-1 ring-accent-500' : 'hover:bg-white/5'}
          ${isToday && !isSelected ? 'text-accent-400 font-bold' : ''}
        `}
      >
        <span className={weekend && !isSelected && !isToday ? 'text-rose-400/70' : ''}>{d.getDate()}</span>
        {hasEvents && <div className="w-1 h-1 rounded-full bg-accent-500 mx-auto mt-1" />}
      </div>
    )
  }

  function renderMonthView() {
    const first = startOfMonth(cursor)
    const totalDays = daysInMonth(cursor)
    const startPad = mondayBasedDow(first)

    const cells: React.ReactNode[] = []
    // fill leading blanks
    for (let i = 0; i < startPad; i++) {
      const prev = addDays(first, -(startPad - i))
      cells.push(renderDayCell(prev, -startPad + i))
    }
    for (let d = 1; d <= totalDays; d++) {
      const dt = new Date(cursor.getFullYear(), cursor.getMonth(), d)
      cells.push(renderDayCell(dt, d))
    }
    // fill trailing blanks
    const remainder = (7 - (cells.length % 7)) % 7
    for (let i = 1; i <= remainder; i++) {
      const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, i)
      cells.push(renderDayCell(next, totalDays + i))
    }

    return (
      <div>
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAY_CN.map((w, i) => (
            <div key={w} className={`text-center text-[10px] md:text-xs font-bold py-1.5 border-b border-white/10 ${i >= 5 ? 'text-rose-400/70' : 'text-gray-400'}`}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px">
          {cells}
        </div>
      </div>
    )
  }

  function renderWeekView() {
    const s = startOfWeek(cursor)
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(s, i))

    return (
      <div>
        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-3 md:mb-4">
          {weekDays.map((d, i) => {
            const isToday = sameDay(d, today)
            const isSelected = sameDay(d, cursor)
            const weekend = isWeekend(d)
            return (
              <div
                key={i}
                onClick={() => setCursor(d)}
                className={`
                  p-1 md:p-2 rounded-lg text-center cursor-pointer transition-all
                  ${isSelected ? 'bg-accent-500/20 ring-1 ring-accent-500' : 'hover:bg-white/5'}
                `}
              >
                <div className={`text-[10px] md:text-xs font-bold ${weekend ? 'text-rose-400/70' : 'text-gray-400'}`}>{WEEKDAY_CN[i]}</div>
                <div className={`text-xs md:text-sm mt-0.5 ${isToday ? 'text-accent-400 font-bold' : weekend ? 'text-rose-400/70' : 'text-gray-200'}`}>
                  {d.getDate()}
                </div>
                <div className="text-[9px] md:text-[10px] text-gray-600">{d.getMonth() + 1}月</div>
              </div>
            )
          })}
        </div>
        {/* Week schedule */}
        <div className="space-y-1.5">
          {weekEvents.map(event => {
            const cal = calendars.find(c => c.id === event.calendarId)
            return (
              <EventRow
                key={event.id}
                event={event}
                color={cal?.displayColor || '#3b82f6'}
                onEdit={() => { setSelectedCal(cal || null); openEditEvent(event) }}
                onDelete={() => handleDeleteEvent(event.id)}
              />
            )
          })}
          {weekEvents.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-4">本周暂无日程</p>
          )}
        </div>
      </div>
    )
  }

  function renderDayView() {
    return (
      <div className="space-y-1.5">
        {dayEvents.map(event => {
          const cal = calendars.find(c => c.id === event.calendarId)
          return (
            <EventRow
              key={event.id}
              event={event}
              color={cal?.displayColor || '#3b82f6'}
              onEdit={() => { setSelectedCal(cal || null); openEditEvent(event) }}
              onDelete={() => handleDeleteEvent(event.id)}
            />
          )
        })}
        {dayEvents.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">当天暂无日程</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full relative">
      {/* Mobile sidebar backdrop */}
      {showSidebar && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* Calendar sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-56 bg-surface-900 border-r border-white/5 p-4
        transform transition-transform duration-200
        md:static md:z-auto md:border-r-0 md:bg-transparent md:p-0 md:transform-none
        ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between md:hidden mb-4">
          <h2 className="text-sm font-semibold text-gray-300">日历</h2>
          <button onClick={() => setShowSidebar(false)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-all">
            <FiX size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300 hidden md:block">日历</h2>
            <button onClick={() => { setCalName(''); setCalDesc(''); setCalColor('#3b82f6'); setShowCalModal(true) }}
              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-accent-400 transition-all">
              <FiPlus size={16} />
            </button>
          </div>
          <div className="space-y-1">
            {calendars.map(cal => (
              <div key={cal.id}
                className={`group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm ${
                  selectedCal?.id === cal.id ? 'bg-accent-500/10 text-accent-400' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
                onClick={() => { setSelectedCal(cal); setShowSidebar(false) }}>
                <FiCalendar size={15} style={{ color: cal.displayColor || '#3b82f6' }} />
                <span className="flex-1 truncate">{cal.name}</span>
                <button onClick={e => { e.stopPropagation(); deleteCalendar(cal.id).then(loadCalendars).catch(e => toast.error(e.message)) }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-all">
                  <FiTrash2 size={13} />
                </button>
              </div>
            ))}
            {calendars.length === 0 && <p className="text-xs text-gray-500 px-3">暂无日历</p>}
          </div>
          {selectedCal && (
            <div className="pt-2 border-t border-white/5 hidden md:block">
              <p className="text-xs text-gray-500 mb-2">当前日历：{selectedCal.name}</p>
              <p className="text-[10px] text-gray-600">该日历下的所有事件将显示在日程列表中</p>
            </div>
          )}
        </div>
      </div>

      {/* Main calendar area */}
      <div className="flex-1 min-w-0 space-y-3 md:space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          {/* Hamburger (mobile only) */}
          <button onClick={() => setShowSidebar(true)}
            className="md:hidden p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-all">
            <FiMenu size={18} />
          </button>

          {/* View switcher */}
          <div className="flex bg-white/5 rounded-lg p-0.5">
            {(['day', 'week', 'month'] as ViewMode[]).map(m => (
              <button key={m}
                onClick={() => { setViewMode(m); if (m === 'month') setCursor(startOfMonth(cursor)) }}
                className={`px-2 md:px-3 py-1 text-xs rounded-md transition-all ${
                  viewMode === m ? 'bg-accent-600 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {m === 'day' ? '日' : m === 'week' ? '周' : '月'}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-all">
              <FiChevronLeft size={14} />
            </button>
            <button onClick={() => setCursor(new Date())}
              className="px-1.5 md:px-2 py-1 text-[11px] md:text-xs rounded-lg hover:bg-white/5 text-gray-400 hover:text-accent-400 transition-all">
              今天
            </button>
            <button onClick={() => navigate(1)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-all">
              <FiChevronRight size={14} />
            </button>
          </div>

          <span className="text-xs md:text-sm font-medium text-gray-200">{periodLabel()}</span>

          <div className="flex-1" />

          <button onClick={() => openCreateEvent()}
            className="flex items-center gap-1 md:gap-1.5 text-xs px-2 md:px-3 py-1.5 rounded-lg bg-accent-500/10 text-accent-400 hover:bg-accent-500/20 transition-all">
            <FiPlus size={14} />
            <span className="hidden md:inline">新建事件</span>
          </button>
        </div>

        {/* Calendar grid / view */}
        <div className="glass rounded-lg md:rounded-xl p-2 md:p-4">
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
        </div>

        {/* Schedule list for selected day */}
        {viewMode === 'month' && (
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              {shortDate(cursor)} 日程
            </h3>
            <div className="space-y-1.5">
              {dayEvents.map(event => {
                const cal = calendars.find(c => c.id === event.calendarId)
                return (
                  <EventRow
                    key={event.id}
                    event={event}
                    color={cal?.displayColor || '#3b82f6'}
                    onEdit={() => { setSelectedCal(cal || null); openEditEvent(event) }}
                    onDelete={() => handleDeleteEvent(event.id)}
                  />
                )
              })}
              {dayEvents.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-6">当天暂无日程</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Calendar creation modal */}
      <Modal open={showCalModal} onClose={() => setShowCalModal(false)} title="新建日历">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">名称 *</label>
            <input value={calName} onChange={e => setCalName(e.target.value)}
              className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">描述</label>
            <input value={calDesc} onChange={e => setCalDesc(e.target.value)}
              className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">颜色</label>
            <input type="color" value={calColor} onChange={e => setCalColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-white/10" />
          </div>
          <button onClick={handleCreateCalendar}
            className="w-full py-2 rounded-lg bg-accent-600 text-white text-sm font-medium hover:bg-accent-500 transition-colors">
            创建
          </button>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={deleteConfirmId != null} onClose={() => setDeleteConfirmId(null)} title="删除事件">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">确定要删除此事件吗？此操作不可撤销。</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2 rounded-lg text-sm bg-surface-700 text-gray-300 hover:bg-surface-600 transition-colors">
              取消
            </button>
            <button onClick={confirmDeleteEvent}
              className="px-4 py-2 rounded-lg text-sm bg-rose-600 text-white hover:bg-rose-500 transition-colors">
              删除
            </button>
          </div>
        </div>
      </Modal>

      {/* Event create/edit modal */}
      <Modal open={showEventModal} onClose={() => { setShowEventModal(false); resetEventForm() }}
        title={editingEvent ? '编辑事件' : '新建事件'}>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {!editingEvent && calendars.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">日历 *</label>
              <select value={modalCalId} onChange={e => setModalCalId(Number(e.target.value))}
                className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors">
                <option value="" disabled>请选择日历</option>
                {calendars.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 block mb-1">标题 *</label>
            <input value={eventTitle} onChange={e => setEventTitle(e.target.value)}
              className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">描述</label>
            <textarea value={eventDesc} onChange={e => setEventDesc(e.target.value)} rows={2}
              className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors resize-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">地点</label>
            <input value={eventLocation} onChange={e => setEventLocation(e.target.value)}
              className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="allDay" checked={eventAllDay} onChange={e => {
              const on = e.target.checked
              if (on) {
                setEventStart(v => v ? v.slice(0, 10) : '')
                setEventEnd(v => v ? v.slice(0, 10) : '')
              } else {
                setEventStart(v => v + 'T09:00')
                setEventEnd(v => v + 'T10:00')
              }
              setEventAllDay(on)
            }}
              className="rounded border-white/10 bg-surface-700" />
            <label htmlFor="allDay" className="text-xs text-gray-500">全天事件</label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">开始{eventAllDay ? '日期' : '时间'} *</label>
              <input type={eventAllDay ? 'date' : 'datetime-local'} value={eventStart} onChange={e => setEventStart(e.target.value)}
                className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">结束{eventAllDay ? '日期' : '时间'} *</label>
              <input type={eventAllDay ? 'date' : 'datetime-local'} value={eventEnd} onChange={e => setEventEnd(e.target.value)}
                className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">状态</label>
              <select value={eventStatus} onChange={e => setEventStatus(e.target.value)}
                className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors">
                <option value="CONFIRMED">已确认</option>
                <option value="TENTATIVE">暂定</option>
                <option value="CANCELLED">已取消</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">优先级</label>
              <select value={eventPriority} onChange={e => setEventPriority(Number(e.target.value))}
                className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors">
                <option value={0}>无</option>
                <option value={1}>1 (最高)</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5 (中)</option>
                <option value={6}>6</option>
                <option value={7}>7</option>
                <option value={8}>8</option>
                <option value={9}>9 (最低)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1 flex items-center gap-1"><FiTag size={11} /> 分类</label>
            <input value={eventCategories} onChange={e => setEventCategories(e.target.value)}
              placeholder="用逗号分隔，如：会议,项目A"
              className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1 flex items-center gap-1"><FiLink size={11} /> 关联 URL</label>
            <input value={eventUrl} onChange={e => setEventUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors" />
          </div>
          <button onClick={handleSaveEvent}
            className="w-full py-2 rounded-lg bg-accent-600 text-white text-sm font-medium hover:bg-accent-500 transition-colors">
            {editingEvent ? '更新' : '创建'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

function EventRow({ event, color, onEdit, onDelete }: {
  event: CalendarEventResponse
  color: string
  onEdit: () => void
  onDelete: () => void
}) {
  const start = new Date(event.startTime)
  const end = new Date(event.endTime)
  const isPast = end < new Date()
  return (
    <div className={`glass rounded-lg px-3 md:px-4 py-2 md:py-3 flex items-center gap-3 md:gap-4 group ${isPast ? 'opacity-50' : ''}`}>
      <div className="w-0.5 md:w-1 h-full min-h-[2rem] md:min-h-[2.5rem] rounded-full shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs md:text-sm font-medium text-gray-200 truncate">{event.title}</p>
        <p className="text-[11px] md:text-xs text-gray-500 flex items-center gap-1 mt-0.5">
          {event.allDay ? (
            '全天'
          ) : (
            <><FiClock size={10} />{formatTime(start)} ~ {formatTime(end)}</>
          )}
          {event.location && <> · {event.location}</>}
        </p>
      </div>
      <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0">
        <button onClick={onEdit}
          className="p-1 md:p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-accent-400 transition-all">
          <FiEdit2 size={13} />
        </button>
        <button onClick={onDelete}
          className="p-1 md:p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-rose-400 transition-all">
          <FiTrash2 size={13} />
        </button>
      </div>
    </div>
  )
}
