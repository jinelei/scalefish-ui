import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  FiSearch, FiPlus, FiExternalLink, FiChevronLeft, FiChevronRight,
  FiTrash2, FiEdit2, FiMousePointer, FiX, FiBookmark, FiPaperclip,
  FiGrid, FiList,
} from 'react-icons/fi'
import { searchBookmarks, createBookmark, updateBookmark, deleteBookmark, togglePin, recordClick } from '../api/bookmarks'
import { getCategoryTree } from '../api/categories'
import { getAllTags } from '../api/tags'
import type { BookmarkResponse, CategoryResponse, TagResponse, BookmarkSearchParams, BookmarkRequest } from '../types'
import Modal from '../components/Modal'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const itemAnim = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
}

function Favicon({ url, className = 'w-5 h-5' }: { url: string; className?: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    try {
      setSrc(`https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`)
    } catch {
      setSrc('')
    }
  }, [url])
  if (!src) return <div className={`${className} rounded bg-surface-600`} />
  return (
    <img
      src={src}
      alt=""
      className={`${className} rounded shrink-0`}
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
    />
  )
}

interface BookmarkFormProps {
  initial?: BookmarkResponse
  categories: CategoryResponse[]
  tags: TagResponse[]
  onSubmit: (data: BookmarkRequest) => Promise<void>
  onCancel: () => void
}

function BookmarkForm({ initial, categories, tags, onSubmit, onCancel }: BookmarkFormProps) {
  const [title, setTitle] = useState(initial?.title || '')
  const [url, setUrl] = useState(initial?.url || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [categoryId, setCategoryId] = useState<number | undefined>(initial?.category?.id)
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(initial?.tags.map((t) => t.id) || [])
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !url.trim()) {
      toast.error('标题和 URL 不能为空')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({ title: title.trim(), url: url.trim(), description: description.trim() || undefined, categoryId, tagIds: selectedTagIds.length ? selectedTagIds : undefined })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleTag = (id: number) => {
    setSelectedTagIds((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs text-gray-500 mb-1 block">标题 *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors" placeholder="书签标题" />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">URL *</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors" placeholder="https://..." />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">描述</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors resize-none h-20" placeholder="可选描述" />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">分类</label>
        <select value={categoryId || ''} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)} className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors">
          <option value="">无分类</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">标签</label>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <button key={t.id} type="button" onClick={() => toggleTag(t.id)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${selectedTagIds.includes(t.id) ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' : 'bg-surface-700 text-gray-400 border border-white/5 hover:border-white/20'}`}>
              {t.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={submitting} className="flex-1 bg-accent-600 hover:bg-accent-500 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50">
          {submitting ? '保存中...' : initial ? '更新' : '创建'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 bg-surface-700 hover:bg-surface-600 text-gray-300 rounded-lg py-2 text-sm transition-colors">
          取消
        </button>
      </div>
    </form>
  )
}

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkResponse[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [categories, setCategories] = useState<CategoryResponse[]>([])
  const [tags, setTags] = useState<TagResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterCategory, setFilterCategory] = useState<number | undefined>()
  const [filterPinned, setFilterPinned] = useState<boolean | undefined>()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('bookmarkView') as 'grid' | 'list') || 'grid'
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<BookmarkResponse | undefined>()

  const fetch = useCallback(async (params: BookmarkSearchParams = {}) => {
    setLoading(true)
    try {
      const res = await searchBookmarks({ page: 0, size: 20, ...params })
      setBookmarks(res.data.content)
      setTotalPages(res.data.totalPages)
      setCurrentPage(res.data.currentPage)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDeps = useCallback(async () => {
    const [cRes, tRes] = await Promise.all([getCategoryTree(), getAllTags()])
    setCategories(cRes.data)
    setTags(tRes.data)
  }, [])

  useEffect(() => {
    localStorage.setItem('bookmarkView', viewMode)
  }, [viewMode])

  useEffect(() => {
    fetch()
    fetchDeps()
  }, [fetch, fetchDeps])

  const buildParams = (overrides: Record<string, unknown> = {}) => ({
    keyword: searchKeyword || undefined,
    categoryIds: filterCategory !== undefined ? [filterCategory] : undefined,
    pinned: filterPinned,
    ...overrides,
  })

  const doSearch = () => {
    setCurrentPage(0)
    fetch(buildParams({ page: 0 }))
  }

  const goPage = (page: number) => {
    setCurrentPage(page)
    fetch(buildParams({ page }))
  }

  const handleCreate = async (data: BookmarkRequest) => {
    await createBookmark(data)
    toast.success('书签已创建')
    setModalOpen(false)
    fetch(buildParams({ page: currentPage }))
  }

  const handleUpdate = async (data: BookmarkRequest) => {
    if (!editing) return
    await updateBookmark(editing.id, data)
    toast.success('书签已更新')
    setModalOpen(false)
    setEditing(undefined)
    fetch(buildParams({ page: currentPage }))
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此书签？')) return
    await deleteBookmark(id)
    toast.success('已删除')
    fetch(buildParams({ page: currentPage }))
  }

  const handlePin = async (id: number) => {
    await togglePin(id)
    fetch(buildParams({ page: currentPage }))
  }

  const handleClick = async (id: number) => {
    await recordClick(id)
    setBookmarks((prev) => prev.map((b) => b.id === id ? { ...b, clickCount: b.clickCount + 1 } : b))
  }

  const openEdit = (b: BookmarkResponse) => {
    setEditing(b)
    setModalOpen(true)
  }

  const openCreate = () => {
    setEditing(undefined)
    setModalOpen(true)
  }

  const clearFilters = () => {
    setSearchKeyword('')
    setFilterCategory(undefined)
    setFilterPinned(undefined)
    fetch()
  }

  const hasFilters = searchKeyword || filterCategory !== undefined || filterPinned !== undefined

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 items-stretch sm:items-end">
          <div className="flex-1 min-w-0 relative">
            <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              className="w-full bg-surface-700 border border-white/5 rounded-lg pl-9 pr-3 py-2.5 sm:py-2 text-sm outline-none focus:border-accent-500/50 transition-colors"
              placeholder="搜索标题、URL、描述..."
            />
          </div>
          <div className="flex gap-2 sm:gap-3">
            <select
              value={filterCategory ?? ''}
              onChange={(e) => setFilterCategory(e.target.value ? Number(e.target.value) : undefined)}
              className="flex-1 sm:flex-none bg-surface-700 border border-white/5 rounded-lg px-3 py-2.5 sm:py-2 text-sm outline-none focus:border-accent-500/50 transition-colors min-w-0 sm:min-w-[120px]"
            >
              <option value="">全部分类</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={filterPinned === undefined ? '' : filterPinned ? 'true' : 'false'}
              onChange={(e) => setFilterPinned(e.target.value === '' ? undefined : e.target.value === 'true')}
              className="flex-1 sm:flex-none bg-surface-700 border border-white/5 rounded-lg px-3 py-2.5 sm:py-2 text-sm outline-none focus:border-accent-500/50 transition-colors min-w-0 sm:min-w-[100px]"
            >
              <option value="">全部状态</option>
              <option value="true">已置顶</option>
              <option value="false">未置顶</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={doSearch} className="flex-1 sm:flex-none bg-accent-600 hover:bg-accent-500 text-white px-5 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors">
              搜索
            </button>
            {hasFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-gray-500 hover:text-gray-300 text-sm transition-colors px-3 py-2.5 sm:py-2">
                <FiX size={14} /> 清除
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1">
        <button
          onClick={() => setViewMode('grid')}
          className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-accent-500/20 text-accent-400' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
          title="图块视图"
        >
          <FiGrid size={16} />
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-accent-500/20 text-accent-400' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
          title="列表视图"
        >
          <FiList size={16} />
        </button>
      </div>

      {loading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass rounded-xl p-4 h-28 animate-pulse">
                <div className="bg-surface-600 h-4 w-3/4 rounded mb-3" />
                <div className="bg-surface-600 h-3 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass rounded-xl px-4 py-3 h-14 animate-pulse flex items-center gap-3">
                <div className="w-5 h-5 rounded bg-surface-600 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="bg-surface-600 h-3 w-1/2 rounded" />
                  <div className="bg-surface-600 h-2 w-1/4 rounded" />
                </div>
              </div>
            ))}
          </div>
        )
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <FiBookmark size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无书签{hasFilters ? '，请调整筛选条件' : ''}</p>
        </div>
      ) : (
        <>
        {viewMode === 'grid' ? (
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <motion.div
              variants={itemAnim}
              onClick={openCreate}
              className="glass rounded-xl p-4 border-2 border-dashed border-white/10 hover:border-accent-500/40 flex items-center justify-center cursor-pointer h-full min-h-[140px] transition-colors group"
            >
              <div className="flex flex-col items-center gap-2 text-gray-500 group-hover:text-accent-400 transition-colors">
                <FiPlus size={24} />
                <span className="text-sm font-medium">新建书签</span>
              </div>
            </motion.div>
            {bookmarks.map((b) => (
              <motion.div
                key={b.id}
                variants={itemAnim}
                className="glass rounded-xl p-4 glass-hover transition-all group"
              >
                <div className="flex items-start gap-3">
                  <Favicon url={b.url} className="w-8 h-8 rounded-lg mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate">{b.title}</h3>
                      {b.pinned && <FiPaperclip size={12} className="text-rose-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{b.url}</p>
                    {b.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{b.description}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {b.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-medium">{b.category.name}</span>
                      )}
                      {b.tags.slice(0, 3).map((t) => (
                        <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded bg-accent-500/10 text-accent-400">{t.name}</span>
                      ))}
                      {b.tags.length > 3 && (
                        <span className="text-[10px] text-gray-500">+{b.tags.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><FiMousePointer size={11} /> {b.clickCount}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <a href={b.url} target="_blank" rel="noopener noreferrer" onClick={() => handleClick(b.id)} className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-accent-400 transition-colors" title="打开">
                      <FiExternalLink size={14} />
                    </a>
                    <button onClick={() => handlePin(b.id)} className={`p-1.5 rounded hover:bg-white/10 transition-colors ${b.pinned ? 'text-rose-400' : 'text-gray-500 hover:text-rose-400'}`} title={b.pinned ? '取消置顶' : '置顶'}>
                      <FiPaperclip size={14} />
                    </button>
                    <button onClick={() => openEdit(b)} className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-accent-400 transition-colors" title="编辑">
                      <FiEdit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-rose-400 transition-colors" title="删除">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
            <motion.div
              variants={itemAnim}
              onClick={openCreate}
              className="glass rounded-xl px-4 py-3 border-2 border-dashed border-white/10 hover:border-accent-500/40 flex items-center justify-center cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-2 text-gray-500 group-hover:text-accent-400 transition-colors">
                <FiPlus size={18} />
                <span className="text-sm font-medium">新建书签</span>
              </div>
            </motion.div>
            {bookmarks.map((b) => (
              <motion.div
                key={b.id}
                variants={itemAnim}
                className="glass rounded-xl px-4 py-3 flex items-center gap-3 group"
              >
                <Favicon url={b.url} className="w-5 h-5 rounded shrink-0" />
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {b.pinned && <FiPaperclip size={11} className="text-rose-400 shrink-0" />}
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleClick(b.id)}
                      className="text-sm font-medium truncate hover:text-accent-400 transition-colors"
                    >
                      {b.title}
                    </a>
                    <span className="text-xs text-gray-500 truncate hidden lg:inline flex-shrink min-w-0 max-w-[240px]">{b.url}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {b.category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-medium hidden sm:inline">{b.category.name}</span>
                    )}
                    {b.tags.slice(0, 2).map((t) => (
                      <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded bg-accent-500/10 text-accent-400 hidden sm:inline">{t.name}</span>
                    ))}
                    {b.tags.length > 2 && <span className="text-[10px] text-gray-500 hidden sm:inline">+{b.tags.length - 2}</span>}
                    <span className="flex items-center gap-1 text-xs text-gray-500 ml-1"><FiMousePointer size={11} /> {b.clickCount}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a href={b.url} target="_blank" rel="noopener noreferrer" onClick={() => handleClick(b.id)} className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-accent-400 transition-colors opacity-0 group-hover:opacity-100" title="打开">
                    <FiExternalLink size={14} />
                  </a>
                  <button onClick={() => handlePin(b.id)} className={`p-1.5 rounded hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100 ${b.pinned ? 'text-rose-400' : 'text-gray-500 hover:text-rose-400'}`} title={b.pinned ? '取消置顶' : '置顶'}>
                    <FiPaperclip size={14} />
                  </button>
                  <button onClick={() => openEdit(b)} className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-accent-400 transition-colors opacity-0 group-hover:opacity-100" title="编辑">
                    <FiEdit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100" title="删除">
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button disabled={currentPage === 0} onClick={() => goPage(currentPage - 1)} className="p-2 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-30 transition-colors">
              <FiChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-400 px-3">
              {currentPage + 1} / {totalPages}
            </span>
            <button disabled={currentPage >= totalPages - 1} onClick={() => goPage(currentPage + 1)} className="p-2 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-30 transition-colors">
              <FiChevronRight size={16} />
            </button>
          </div>
        )}
        </>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(undefined) }} title={editing ? '编辑书签' : '新建书签'}>
        <BookmarkForm
          initial={editing}
          categories={categories}
          tags={tags}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={() => { setModalOpen(false); setEditing(undefined) }}
        />
      </Modal>
    </motion.div>
  )
}
