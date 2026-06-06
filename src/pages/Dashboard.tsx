import { useEffect, useState, useCallback } from 'react'
import { FiBookmark, FiFolder, FiTag, FiTrendingUp, FiSearch, FiX, FiGrid, FiList, FiPaperclip } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { searchBookmarks, recordClick } from '../api/bookmarks'
import { getCategoryTree, getCategoryStats } from '../api/categories'
import { getAllTags, getTagStats } from '../api/tags'
import type { BookmarkResponse, CategoryResponse, TagResponse, TagStatsResponse } from '../types'

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('dashboardBookmarkView') as 'grid' | 'list') || 'list'
  })

  const fetchData = useCallback((catIds: number[], tagIds: number[], kw: string = '') => {
    setLoading(true)
    const hasFilter = catIds.length > 0 || tagIds.length > 0 || kw.length > 0
    const bmParams: Record<string, unknown> = { page: 0, size: hasFilter ? 100 : 6 }
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
      setCategories(c.data)
      setAllTags(t.data)
      setTagStats(s.data)
      setCatStats(new Map(cs.data.map(cs2 => [cs2.id, cs2.count])))
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    localStorage.setItem('dashboardBookmarkView', viewMode)
  }, [viewMode])

  useEffect(() => {
    fetchData([], [])
  }, [fetchData])

  const flatCategories = flattenCategories(categories)

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds(prev => {
      const next = prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
      fetchData(next, selectedTagIds, keyword)
      return next
    })
  }

  const toggleTag = (id: number) => {
    setSelectedTagIds(prev => {
      const next = prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
      fetchData(selectedCategoryIds, next, keyword)
      return next
    })
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <motion.div
            key={label}
            variants={item}
            className="glass rounded-xl p-4 flex items-center gap-4 hover:border-white/10 transition-colors"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-lg shrink-0`}>
              <Icon size={18} className="text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold">{loading ? '...' : value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <motion.div variants={item} className="min-w-0 glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-gray-300 shrink-0">
                {keyword || hasFilter ? '筛选结果' : '最新书签'}
              </h2>
              <div className="relative flex-1 max-w-xs min-w-0">
                <FiSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchData(selectedCategoryIds, selectedTagIds, keyword) }}
                  className="w-full bg-surface-800 border border-surface-500 rounded-lg pl-8 pr-8 py-1.5 text-xs text-gray-300 outline-none focus:border-accent-500/70 transition-colors"
                  placeholder="搜索标题、URL..."
                />
                {keyword && (
                  <button
                    onClick={() => { setKeyword(''); fetchData(selectedCategoryIds, selectedTagIds, '') }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-accent-500/20 text-accent-400' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                title="图块视图"
              >
                <FiGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-accent-500/20 text-accent-400' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                title="列表视图"
              >
                <FiList size={14} />
              </button>
            </div>
          </div>
          {loading ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="glass rounded-xl p-4 h-24 animate-pulse">
                    <div className="bg-white/10 h-4 w-3/4 rounded mb-3" />
                    <div className="bg-white/10 h-3 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 animate-pulse">
                    <div className="w-5 h-5 rounded bg-white/10" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 w-48 rounded bg-white/10" />
                      <div className="h-3 w-64 rounded bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : recent.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">暂无书签</p>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recent.map((b) => (
                <a
                  key={b.id}
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => recordClick(b.id)}
                  className="glass rounded-xl p-4 glass-hover transition-all group block"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={b.faviconUrl || `https://www.google.com/s2/favicons?domain=${new URL(b.url).hostname}&sz=32`}
                      alt=""
                      className="w-8 h-8 rounded-lg shrink-0 mt-0.5"
                      onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate group-hover:text-accent-400 transition-colors">{b.title}</span>
                        {b.pinned && <FiPaperclip size={11} className="text-rose-400 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{b.url}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {b.category && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-medium">{b.category.name}</span>
                        )}
                        {b.tags.slice(0, 2).map(t => (
                          <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded bg-accent-500/10 text-accent-400">{t.name}</span>
                        ))}
                        {b.tags.length > 2 && <span className="text-[10px] text-gray-500">+{b.tags.length - 2}</span>}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((b) => (
                <a
                  key={b.id}
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => recordClick(b.id)}
                  className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-colors group min-w-0"
                >
                  <img
                    src={b.faviconUrl || `https://www.google.com/s2/favicons?domain=${new URL(b.url).hostname}&sz=32`}
                    alt=""
                    className="w-5 h-5 rounded shrink-0 mt-0.5"
                    onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate group-hover:text-accent-400 transition-colors">{b.title}</div>
                    <div className="text-xs text-gray-600 truncate">{b.url}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {b.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 leading-none">
                          {b.category.name}
                        </span>
                      )}
                      {b.tags.slice(0, 3).map(t => (
                        <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-neon-500/10 text-neon-400 border border-neon-500/20 leading-none">
                          # {t.name}
                        </span>
                      ))}
                      {b.tags.length > 3 && (
                        <span className="text-[10px] text-gray-500">+{b.tags.length - 3}</span>
                      )}
                    </div>
                  </div>
                  {b.pinned && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-medium shrink-0 mt-0.5">置顶</span>
                  )}
                </a>
              ))}
            </div>
          )}
        </motion.div>

        <div className="space-y-4">
          <motion.div variants={item} className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <FiFolder size={14} className="text-purple-400" />
              <span className="text-sm font-semibold text-gray-300">分类</span>
              {selectedCategoryIds.length > 0 && (
                <>
                  <span className="text-[10px] text-purple-400 ml-1">({selectedCategoryIds.length})</span>
                  <button onClick={() => { setSelectedCategoryIds([]); fetchData([], selectedTagIds, keyword) }} className="text-xs text-purple-400/70 hover:text-purple-300 ml-2 transition-colors">清除</button>
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
                  <button onClick={() => { setSelectedTagIds([]); fetchData(selectedCategoryIds, [], keyword) }} className="text-xs text-neon-400/70 hover:text-neon-300 ml-2 transition-colors">清除</button>
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
