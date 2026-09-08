import { useEffect, useState } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiArchive } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { getAllTags, getTagStats, createTag, updateTag, deleteTag } from '../api/tags'
import { archiveBookmarks } from '../api/bookmarks'
import { useConfirm } from '../components/ConfirmDialog'
import type { TagResponse, TagStatsResponse } from '../types'

export default function TagsTab() {
  const [confirm, confirmDialog] = useConfirm()
  const [tags, setTags] = useState<TagResponse[]>([])
  const [stats, setStats] = useState<TagStatsResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  const load = async () => {
    try {
      const [tagsRes, statsRes] = await Promise.all([getAllTags(), getTagStats({})])
      setTags(tagsRes.data)
      setStats(statsRes.data)
    } catch {
      toast.error('加载标签失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const countOf = (id: number) => stats.find(s => s.id === id)?.count ?? 0

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    try {
      await createTag({ name })
      setNewName('')
      toast.success('标签已创建')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败')
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (t: TagResponse) => {
    setEditingId(t.id)
    setEditName(t.name)
  }

  const handleRename = async () => {
    if (editingId == null) return
    const name = editName.trim()
    if (!name) { toast.error('标签名不能为空'); return }
    try {
      await updateTag(editingId, { name })
      toast.success('标签已重命名')
      setEditingId(null)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '重命名失败')
    }
  }

  const handleDelete = async (t: TagResponse) => {
    const count = countOf(t.id)
    const ok = await confirm({
      title: `删除标签「${t.name}」`,
      message: `该标签会从 ${count} 个关联书签上移除，书签本身不会被删除。此操作不可撤销。`,
      confirmText: '删除',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteTag(t.id)
      toast.success('标签已删除')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  const handleArchive = async (t: TagResponse) => {
    const count = countOf(t.id)
    const ok = await confirm({
      title: `归档带标签「${t.name}」的书签`,
      message: `将带有该标签的 ${count} 个未归档书签全部归档？\n\n归档后这些书签不在书签导航、分类、标签中展示，可在「管理-归档」中恢复或删除。\n标签本身不会被删除。`,
      confirmText: '归档',
    })
    if (!ok) return
    try {
      const res = await archiveBookmarks({ tagIds: [t.id], archived: true })
      toast.success(`成功归档 ${res.data} 个书签`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '归档失败')
    }
  }

  if (loading) {
    return <div className="space-y-2.5">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-black/5 dark:bg-white/5 rounded-lg animate-pulse" />)}</div>
  }

  return (
    <div>
      {confirmDialog}
      <div className="flex items-center gap-2 mb-5">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          placeholder="新标签名称，回车创建"
          className="flex-1 bg-surface-800 border border-surface-500 rounded-lg px-3.5 py-2 text-sm text-gray-300 outline-none focus:border-accent-500/70"
        />
        <button onClick={handleCreate} disabled={creating || !newName.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
          <FiPlus size={14} /> 创建
        </button>
      </div>

      {tags.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-500">暂无标签</div>
      ) : (
        <div className="space-y-2.5">
          {tags.map(t => (
            <div key={t.id}
              className="flex items-center gap-3 rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] px-4 py-3">
              {editingId === t.id ? (
                <>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingId(null) }}
                    autoFocus
                    className="flex-1 bg-surface-800 border border-accent-500/50 rounded-lg px-3 py-1.5 text-sm text-gray-300 outline-none"
                  />
                  <button onClick={handleRename} className="p-2 rounded text-emerald-400 hover:bg-white/10"><FiCheck size={16} /></button>
                  <button onClick={() => setEditingId(null)} className="p-2 rounded text-gray-500 hover:bg-white/10"><FiX size={16} /></button>
                </>
              ) : (
                <>
                  <span className="px-3 py-1 rounded-full bg-neon-500/10 text-neon-400 text-sm font-medium border border-neon-500/20">
                    {t.name}
                  </span>
                  <span className="text-xs text-gray-500">{countOf(t.id)} 个书签</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <button onClick={() => startEdit(t)} title="重命名"
                      className="p-2 rounded text-gray-500 hover:text-accent-400 hover:bg-white/10">
                      <FiEdit2 size={15} />
                    </button>
                    <button onClick={() => handleArchive(t)} title="归档带此标签的书签"
                      className="p-2 rounded text-gray-500 hover:text-accent-400 hover:bg-white/10">
                      <FiArchive size={15} />
                    </button>
                    <button onClick={() => handleDelete(t)} title="删除"
                      className="p-2 rounded text-gray-500 hover:text-rose-400 hover:bg-white/10">
                      <FiTrash2 size={15} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
