import { useCallback, useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { FiBookmark, FiFolder, FiTag, FiArchive } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { getCategoryTree } from '../api/categories'
import { getAllTags } from '../api/tags'
import type { CategoryResponse, TagResponse } from '../types'
import BookmarksTab from '../manage/BookmarksTab'
import CategoriesTab from '../manage/CategoriesTab'
import TagsTab from '../manage/TagsTab'
import ArchivedTab from '../manage/ArchivedTab'

type TabKey = 'bookmarks' | 'categories' | 'tags' | 'archived'

const tabs: { key: TabKey; label: string; title: string; desc: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'bookmarks', label: '书签', title: '书签管理', desc: '编辑书签、批量调整分类与标签、归档', icon: FiBookmark },
  { key: 'categories', label: '分类', title: '分类管理', desc: '管理分类树结构', icon: FiFolder },
  { key: 'tags', label: '标签', title: '标签管理', desc: '管理书签标签', icon: FiTag },
  { key: 'archived', label: '已归档', title: '已归档', desc: '查看、恢复或删除已归档的书签', icon: FiArchive },
]

export default function Manage() {
  const { tab } = useParams()
  const [categories, setCategories] = useState<CategoryResponse[]>([])
  const [allTags, setAllTags] = useState<TagResponse[]>([])

  const loadMeta = useCallback(async () => {
    const [catRes, tagRes] = await Promise.all([getCategoryTree(), getAllTags()])
    setCategories(catRes.data)
    setAllTags(tagRes.data)
  }, [])

  useEffect(() => {
    loadMeta().catch(() => toast.error('加载基础数据失败')) // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadMeta])

  const current = tabs.find(t => t.key === tab)
  if (!current) return <Navigate to="/manage/bookmarks" replace />
  const Icon = current.icon

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-gray-100">
          <Icon size={18} className="text-accent-400" />
          {current.title}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">{current.desc}</p>
      </div>

      <div className="glass rounded-xl p-4 sm:p-6">
        {current.key === 'bookmarks' && <BookmarksTab categories={categories} allTags={allTags} reloadMeta={loadMeta} />}
        {current.key === 'categories' && <CategoriesTab />}
        {current.key === 'tags' && <TagsTab />}
        {current.key === 'archived' && <ArchivedTab reloadMeta={loadMeta} />}
      </div>
    </div>
  )
}
