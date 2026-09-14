import { useCallback, useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getCategoryTree } from '../api/categories'
import { getAllTags } from '../api/tags'
import { useAuth } from '../contexts/AuthContext'
import type { CategoryResponse, TagResponse } from '../types'
import BookmarksTab from '../manage/BookmarksTab'
import CategoriesTab from '../manage/CategoriesTab'
import TagsTab from '../manage/TagsTab'
import ArchivedTab from '../manage/ArchivedTab'
import UsersTab from '../manage/UsersTab'

type TabKey = 'bookmarks' | 'categories' | 'tags' | 'archived' | 'users'

const tabs = new Set<TabKey>(['bookmarks', 'categories', 'tags', 'archived', 'users'])

export default function Manage() {
  const { tab } = useParams()
  const { isAdmin } = useAuth()
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

  const current = (tab && tabs.has(tab as TabKey)) ? (tab as TabKey) : null
  if (!current) return <Navigate to="/manage/bookmarks" replace />
  if (current === 'users' && !isAdmin) return <Navigate to="/manage/bookmarks" replace />

  return (
    <div className="p-4 sm:p-6">
      {current === 'bookmarks' && <BookmarksTab categories={categories} allTags={allTags} reloadMeta={loadMeta} />}
      {current === 'categories' && <CategoriesTab />}
      {current === 'tags' && <TagsTab />}
      {current === 'archived' && <ArchivedTab reloadMeta={loadMeta} />}
      {current === 'users' && <UsersTab />}
    </div>
  )
}
