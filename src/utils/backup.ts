import axios from 'axios'
import toast from 'react-hot-toast'
import { searchBookmarks, createBookmark, togglePin } from '../api/bookmarks'
import { getCategoryTree, createCategory } from '../api/categories'
import { getAllTags, createTag } from '../api/tags'
import type { CategoryResponse } from '../types'

interface ExportTag {
  id: number
  name: string
}

interface ExportLink {
  id: number
  name: string
  type: 'url'
  url: string
  description: string | null
  tags: ExportTag[]
  collectionId?: number
  createdAt: string
  updatedAt: string
}

interface ExportCollection {
  id: number
  name: string
  description: string | null
  parentId?: number | null
  links: ExportLink[]
}

interface ExportData {
  root_user: {
    name: string
    collections: ExportCollection[]
    pinnedLinks: ExportLink[]
  }
}

function flattenCategories(cats: CategoryResponse[], parentId?: number): { id: number; name: string; sortOrder: number; parentId?: number | null }[] {
  const result: { id: number; name: string; sortOrder: number; parentId?: number | null }[] = []
  for (const c of cats) {
    result.push({ id: c.id, name: c.name, sortOrder: c.sortOrder, parentId: parentId ?? null })
    if (c.children && c.children.length > 0) {
      result.push(...flattenCategories(c.children, c.id))
    }
  }
  return result
}

export async function exportBackup() {
  const toastId = toast.loading('正在导出...')
  try {
    const [bookmarksRes, categoriesRes] = await Promise.all([
      searchBookmarks({ page: 0, size: 10000 }),
      getCategoryTree(),
    ])

    const allBookmarks = bookmarksRes.data.content
    const flatCats = flattenCategories(categoriesRes.data)

    const exportData: ExportData = {
      root_user: {
        name: 'jinelei',
        collections: flatCats.map(cat => ({
          id: cat.id,
          name: cat.name,
          description: null,
          parentId: cat.parentId,
          links: allBookmarks
            .filter(b => b.category?.id === cat.id)
            .map(b => ({
              id: b.id,
              name: b.title,
              type: 'url' as const,
              url: b.url,
              description: b.description,
              tags: b.tags.map(t => ({ id: t.id, name: t.name })),
              createdAt: b.createdAt,
              updatedAt: b.updatedAt,
            })),
        })),
        pinnedLinks: allBookmarks
          .filter(b => b.pinned)
          .map(b => ({
            id: b.id,
            name: b.title,
            type: 'url' as const,
            url: b.url,
            description: b.description,
            tags: b.tags.map(t => ({ id: t.id, name: t.name })),
            createdAt: b.createdAt,
            updatedAt: b.updatedAt,
          })),
      },
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scalefish-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('导出成功', { id: toastId })
  } catch {
    toast.error('导出失败', { id: toastId })
  }
}

function extractErr(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const body = e.response?.data
    if (body) console.error('服务端响应数据:', JSON.stringify(body, null, 2))
    if (typeof body === 'object' && body !== null) {
      const b = body as Record<string, unknown>
      return String(b.message || b.error || e.message)
    }
    return e.message
  }
  if (e instanceof Error) return e.message
  return String(e)
}

export async function importBackup(file: File) {
  const toastId = toast.loading('正在导入...')
  const errors: string[] = []

  try {
    const text = await file.text()
    let data: ExportData
    try {
      data = JSON.parse(text)
    } catch (e) {
      toast.error(`JSON 解析失败：${(e as Error).message}`, { id: toastId, duration: 10000 })
      console.error('[导入] JSON 解析失败:', e)
      return
    }

    if (!data.root_user) {
      toast.error('JSON 结构错误：缺少 root_user', { id: toastId, duration: 10000 })
      console.error('[导入] JSON 结构错误：缺少 root_user, 顶层 key:', Object.keys(data))
      return
    }
    if (!Array.isArray(data.root_user.collections)) {
      toast.error('JSON 结构错误：root_user.collections 应为数组', { id: toastId, duration: 10000 })
      console.error('[导入] JSON 结构错误：root_user.collections 类型:', typeof data.root_user.collections)
      return
    }
    if (!Array.isArray(data.root_user.pinnedLinks)) {
      toast.error('JSON 结构错误：root_user.pinnedLinks 应为数组', { id: toastId, duration: 10000 })
      console.error('[导入] JSON 结构错误：root_user.pinnedLinks 类型:', typeof data.root_user.pinnedLinks)
      return
    }

    const [existingCatsRes, existingTagsRes] = await Promise.all([
      getCategoryTree(),
      getAllTags(),
    ])

    const existingFlatCats = flattenCategories(existingCatsRes.data)
    const catNameMap = new Map(existingFlatCats.map(c => [c.name, c.id]))
    const tagNameMap = new Map(existingTagsRes.data.map(t => [t.name, t.id]))

    let created = 0
    let failed = 0
    const createdUrls = new Map<string, number>()

    const allTagEntries = new Map<number, string>()
    for (const col of data.root_user.collections) {
      for (const link of col.links) {
        for (const tag of link.tags ?? []) {
          allTagEntries.set(tag.id, tag.name)
        }
      }
    }
    for (const link of data.root_user.pinnedLinks) {
      for (const tag of link.tags ?? []) {
        allTagEntries.set(tag.id, tag.name)
      }
    }

    for (const [_, tagName] of allTagEntries) {
      if (!tagNameMap.has(tagName)) {
        try {
          const res = await createTag({ name: tagName })
          tagNameMap.set(tagName, res.data.id)
        } catch (e) {
          const msg = `标签 "${tagName}" 创建失败：${extractErr(e)}`
          console.error('[导入] 标签创建失败:', { tagName, error: e })
          errors.push(msg)
          failed++
        }
      }
    }

    const catIdMap = new Map<number, number>()
    const collections = [...data.root_user.collections]

    collections.sort((a, b) => {
      const aDepth = depthOf(a, collections)
      const bDepth = depthOf(b, collections)
      return aDepth - bDepth
    })

    for (const col of collections) {
      const existingId = catNameMap.get(col.name)
      if (existingId !== undefined) {
        catIdMap.set(col.id, existingId)
      } else {
        try {
          const parentId = col.parentId != null ? catIdMap.get(col.parentId) : undefined
          const res = await createCategory({
            name: col.name,
            parentId,
          })
          catIdMap.set(col.id, res.data.id)
          catNameMap.set(col.name, res.data.id)
        } catch (e) {
          const msg = `分类 "${col.name}"（JSON 中的 id=${col.id}, parentId=${col.parentId}）创建失败：${extractErr(e)}`
          console.error('[导入] 分类创建失败:', { collection: col, error: e })
          errors.push(msg)
          failed++
        }
      }
    }

    console.log('[导入] 分类映射完成: catIdMap=%s catNameMap=%s',
      JSON.stringify([...catIdMap.entries()]),
      JSON.stringify([...catNameMap.entries()]))

    console.log('[导入] 分类映射完成: catIdMap=%s catNameMap=%s',
      JSON.stringify([...catIdMap.entries()]),
      JSON.stringify([...catNameMap.entries()]))

    console.log('[导入] 开始创建书签: collections=%d', data.root_user.collections.length)

    for (const col of data.root_user.collections) {
      console.log('[导入] 处理 collection: id=%s name="%s" links=%d', col.id, col.name, col.links?.length ?? 0)
      for (const link of col.links ?? []) {
        try {
          const tagIds = (link.tags ?? [])
            .map(t => tagNameMap.get(t.name))
            .filter((id): id is number => id !== undefined)
          const mappedCategoryId = catIdMap.get(col.id) ?? catIdMap.get(link.collectionId as number) ?? catNameMap.get(col.name)
          if (mappedCategoryId === undefined) {
            console.warn('[导入] 分类映射全部失败: col.id=%s col.name="%s" link.collectionId=%s catIdMap的大小=%d catNameMap的大小=%d', col.id, col.name, link.collectionId, catIdMap.size, catNameMap.size)
          }
          const res = await createBookmark({
            title: link.name,
            url: link.url,
            description: link.description || undefined,
            categoryId: mappedCategoryId,
            tagIds: tagIds.length > 0 ? tagIds : undefined,
            createdAt: link.createdAt,
            updatedAt: link.updatedAt,
          })
          createdUrls.set(link.url, res.data.id)
          created++
        } catch (e) {
          const msg = `书签 "${link.name}"（URL: ${link.url}, 所属分类: "${col.name}"）创建失败：${extractErr(e)}`
          console.error('[导入] 书签创建失败:', { link, collection: col.name, error: e })
          errors.push(msg)
          failed++
        }
      }
    }

    for (const link of data.root_user.pinnedLinks) {
      try {
        const existingId = createdUrls.get(link.url)
        if (existingId) {
          await togglePin(existingId)
        } else {
          const tagIds = (link.tags ?? [])
            .map(t => tagNameMap.get(t.name))
            .filter((id): id is number => id !== undefined)
          const res = await createBookmark({
            title: link.name,
            url: link.url,
            description: link.description || undefined,
            tagIds: tagIds.length > 0 ? tagIds : undefined,
            createdAt: link.createdAt,
            updatedAt: link.updatedAt,
          })
          await togglePin(res.data.id)
          created++
        }
        } catch (e) {
          const msg = `置顶书签 "${link.name}"（URL: ${link.url}）处理失败：${extractErr(e)}`
          console.error('[导入] 置顶书签处理失败:', { link, error: e })
          errors.push(msg)
          failed++
        }
    }

    const summary = `导入完成：创建 ${created} 个${failed > 0 ? `，失败 ${failed} 个` : ''}`
    if (errors.length > 0) {
      toast.error(`${summary}\n\n${errors.join('\n')}`, { id: toastId, duration: 15000 })
    } else {
      toast.success(summary, { id: toastId, duration: 5000 })
    }
  } catch (e) {
    console.error('[导入] 意外错误:', e)
    toast.error(`导入失败：${extractErr(e)}`, { id: toastId, duration: 10000 })
  }
}

function depthOf(col: ExportCollection, all: ExportCollection[]): number {
  let depth = 0
  let current = col
  const visited = new Set<number>()
  while (current.parentId != null && !visited.has(current.id)) {
    visited.add(current.id)
    const parent = all.find(c => c.id === current.parentId)
    if (!parent) break
    depth++
    current = parent
  }
  return depth
}
