import { useEffect, useState, useCallback, useRef } from 'react'
import { FiBookmark, FiFolder, FiTag, FiTrendingUp, FiSearch, FiX } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { searchBookmarks, togglePin } from '../api/bookmarks'
import { getCategoryTree, getCategoryStats } from '../api/categories'
import { getAllTags, getTagStats } from '../api/tags'
import type { BookmarkResponse, CategoryResponse, TagStatsResponse, TagResponse } from '../types'
import BookmarkView, { type ViewMode } from '../components/BookmarkView'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

function flattenCategories(
  cats: CategoryResponse[],
  parentPath: string[] = [],
): { id: number; name: string; label: string }[] {
  return cats.flatMap(c => [
    { id: c.id, name: c.name, label: parentPath.length > 0 ? `${parentPath.join(' › ')} › ${c.name}` : c.name },
    ...flattenCategories(c.children, [...parentPath, c.name]),
  ])
}

export default function Dashboard() {
  const [stats, setStats] = useState({ bookmarks: 0, categories: 0, tags: 0 })
  const [recent, setRecent] = useState<BookmarkResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<CategoryResponse[]>([])
  const [allTags, setAllTags] = useState<TagResponse[]>([])
  const [tagStats, setTagStats] = useState<TagStatsResponse[]>([])
  const [catStats, setCatStats] = useState<Map<number, number>>(new Map())
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('dashboardBookmarkView') as ViewMode) || 'list'
  })
  const [pageSize, setPageSize] = useState(() => {
    return Number(localStorage.getItem('dashboardPageSize')) || 12
  })
  const pageSizeRef = useRef(pageSize)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doFetch = useCallback((catIds: number[], tagIds: number[], kw: string, pg: number) => {
    setLoading(true)
    const bmParams: Record<string, unknown> = { page: pg, size: pageSizeRef.current }
    if (catIds.length > 0) bmParams.categoryIds = catIds
    if (tagIds.length > 0) bmParams.tagIds = tagIds
    if (kw.length > 0) bmParams.keyword = kw
    const statsParams: Record<string, unknown> = {}
    if (catIds.length > 0) statsParams.categoryIds = catIds
    if (tagIds.length > 0) statsParams.tagIds = tagIds
    Promise.all([
      searchBookmarks(bmParams),
      getCategoryTree(),
      getAllTags(),
      getTagStats(statsParams),
      getCategoryStats(),
    ]).then(([b, c, t, s, cs]) => {
      setStats({ bookmarks: b.data.totalElements, categories: c.data.length, tags: t.data.length })
      setRecent(b.data.content)
      setTotalPages(b.data.totalPages)
      setTotalElements(b.data.totalElements)
      setCategories(c.data)
      setAllTags(t.data)
      setTagStats(s.data)
      setCatStats(new Map(cs.data.map(cs2 => [cs2.id, cs2.count])))
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    if (keyword) {
      debounceTimer.current = setTimeout(() => {
        setPage(0)
        doFetch(selectedCategoryIds, selectedTagIds, keyword, 0)
      }, 1000)
    } else {
      setPage(0)
      doFetch(selectedCategoryIds, selectedTagIds, keyword, 0)
    }
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [selectedCategoryIds, selectedTagIds, keyword]) // eslint-disable-line react-hooks/exhaustive-deps

  const flatCategories = flattenCategories(categories)

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    )
  }

  const toggleTag = (id: number) => {
    setSelectedTagIds(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    )
  }

  const handlePin = async (id: number) => {
    await togglePin(id)
    doFetch(selectedCategoryIds, selectedTagIds, keyword, page)
  }

  const handlePageSizeChange = (newSize: number) => {
    pageSizeRef.current = newSize
    setPageSize(newSize)
    localStorage.setItem('dashboardPageSize', String(newSize))
    setPage(0)
    doFetch(selectedCategoryIds, selectedTagIds, keyword, 0)
  }

  const hasFilter = selectedCategoryIds.length > 0 || selectedTagIds.length > 0

  const selectedTagNames = allTags.filter(t => selectedTagIds.includes(t.id))
  const otherTags = tagStats.filter(s => !selectedTagIds.includes(s.id) && s.count > 0)

  const cards = [
    { label: '书签', value: stats.bookmarks, icon: FiBookmark, color: 'from-accent-500 to-blue-600' },
    { label: '分类', value: stats.categories, icon: FiFolder, color: 'from-purple-500 to-purple-600' },
    { label: '标签', value: stats.tags, icon: FiTag, color: 'from-neon-500 to-emerald-600' },
    { label: '总点击', value: recent.reduce((a, b) => a + b.clickCount, 0), icon: FiTrendingUp, color: 'from-rose-500 to-pink-600' },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="relative">
        <div className="relative w-full">
          <FiSearch size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (debounceTimer.current) clearTimeout(debounceTimer.current)
                setPage(0)
                doFetch(selectedCategoryIds, selectedTagIds, keyword, 0)
              }
            }}
            className="w-full bg-surface-800/60 backdrop-blur-sm rounded-xl pl-11 pr-10 py-3 text-sm text-gray-300 placeholder-gray-500 outline-none transition-all"
            placeholder="搜索书签标题、URL..."
          />
          {keyword && (
            <button
              onClick={() => { if (debounceTimer.current) clearTimeout(debounceTimer.current); setKeyword('') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors p-0.5 rounded hover:bg-white/5"
            >
              <FiX size={16} />
            </button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <motion.div variants={item} className="min-w-0 glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300">
              {keyword || hasFilter ? '筛选结果' : '最新书签'}
            </h2>
          </div>
          <BookmarkView
            bookmarks={recent}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            loading={loading}
            totalPages={totalPages}
            currentPage={page}
            onPageChange={(p) => { setPage(p); doFetch(selectedCategoryIds, selectedTagIds, keyword, p) }}
            onPin={handlePin}
            storageKey="dashboardBookmarkView"
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
            totalElements={totalElements}
          />
        </motion.div>

        <div className="space-y-4">
          <motion.div variants={item} className="grid grid-cols-2 gap-2">
            {cards.map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className={`glass rounded-xl p-3 flex items-center gap-3 ${loading ? 'opacity-60' : ''} transition-opacity`}
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-lg shrink-0`}>
                  <Icon size={14} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-bold leading-tight">{loading ? '...' : value}</div>
                  <div className="text-[10px] text-gray-500 leading-tight truncate">{label}</div>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div variants={item} className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <FiFolder size={14} className="text-purple-400" />
              <span className="text-sm font-semibold text-gray-300">分类</span>
              {selectedCategoryIds.length > 0 && (
                <>
                  <span className="text-[10px] text-purple-400 ml-1">({selectedCategoryIds.length})</span>
                  <button onClick={() => setSelectedCategoryIds([])} className="text-xs text-purple-400/70 hover:text-purple-300 ml-2 transition-colors">清除</button>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {flatCategories.length === 0 ? (
                <span className="text-xs text-gray-600">暂无分类</span>
              ) : (
                flatCategories.map(c => {
                  const active = selectedCategoryIds.includes(c.id)
                  return (
                    <button
                      key={`cat-${c.id}`}
                      onClick={() => toggleCategory(c.id)}
                      className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium border transition-colors max-w-full sm:max-w-[320px] ${
                        active
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {active && <span className="text-purple-300 shrink-0">✓</span>}
                      <span className="truncate min-w-0">{c.label}</span>
                    <span className="text-gray-600 shrink-0">{catStats.get(c.id) ?? 0}</span>
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>

          <motion.div variants={item} className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <FiTag size={14} className="text-neon-400" />
              <span className="text-sm font-semibold text-gray-300">标签</span>
              {selectedTagIds.length > 0 && (
                <>
                  <span className="text-[10px] text-neon-400 ml-1">({selectedTagIds.length})</span>
                  <button onClick={() => setSelectedTagIds([])} className="text-xs text-neon-400/70 hover:text-neon-300 ml-2 transition-colors">清除</button>
                </>
              )}
            </div>

            {selectedTagNames.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-neon-500/5 border border-neon-500/10">
                {selectedTagNames.map(t => (
                  <span
                    key={`sel-${t.id}`}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-neon-500/20 text-neon-300 border border-neon-500/30"
                  >
                    # {t.name}
                    <FiX
                      size={12}
                      className="cursor-pointer hover:text-white transition-colors"
                      onClick={() => toggleTag(t.id)}
                    />
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {otherTags.length === 0 && selectedTagNames.length === 0 ? (
                allTags.length === 0 ? (
                  <span className="text-xs text-gray-600">暂无标签</span>
                ) : (
                  tagStats.map(s => {
                    const active = selectedTagIds.includes(s.id)
                    return (
                      <button
                        key={`tag-${s.id}`}
                        onClick={() => toggleTag(s.id)}
                        className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-neon-500/20 text-neon-300 border-neon-500/40'
                            : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {active && <span className="text-neon-300 shrink-0">✓</span>}
                        <span className="truncate"># {s.name}</span>
                        <span className="shrink-0 text-gray-600">{s.count}</span>
                      </button>
                    )
                  })
                )
              ) : (
                otherTags.map(s => (
                  <button
                    key={`tag-${s.id}`}
                    onClick={() => toggleTag(s.id)}
                    className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 transition-colors"
                  >
                    <span className="truncate"># {s.name}</span>
                    <span className="shrink-0 text-gray-600">{s.count}</span>
                  </button>
                ))
              )}
              {otherTags.length === 0 && selectedTagNames.length > 0 && (
                <span className="text-xs text-gray-600">无其他标签</span>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
