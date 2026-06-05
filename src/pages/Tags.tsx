import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { FiTag, FiPlus, FiTrash2 } from 'react-icons/fi'
import { getAllTags, createTag, deleteTag } from '../api/tags'
import type { TagResponse } from '../types'
import Modal from '../components/Modal'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

export default function Tags() {
  const [tags, setTags] = useState<TagResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [creating, setCreating] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAllTags()
      setTags(res.data)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const handleCreate = async () => {
    if (!newTagName.trim()) { toast.error('名称不能为空'); return }
    setCreating(true)
    try {
      await createTag({ name: newTagName.trim() })
      toast.success('标签已创建')
      setNewTagName('')
      setModalOpen(false)
      fetch()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`确认删除标签「${name}」？`)) return
    try {
      await deleteTag(id)
      toast.success('已删除')
      fetch()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      {loading ? (
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-surface-600 h-8 w-20 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tags.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <FiTag size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无标签</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <div
            onClick={() => setModalOpen(true)}
            className="glass rounded-lg px-3.5 py-2 flex items-center gap-2 border-2 border-dashed border-white/10 hover:border-accent-500/40 cursor-pointer text-gray-500 hover:text-accent-400 transition-colors"
          >
            <FiPlus size={14} />
            <span className="text-sm font-medium">新建标签</span>
          </div>
          {tags.map((t) => (
            <motion.div
              key={t.id}
              variants={container}
              className="glass rounded-lg px-3.5 py-2 flex items-center gap-2 group hover:border-white/10 transition-colors"
            >
              <FiTag size={13} className="text-accent-400 shrink-0" />
              <span className="text-sm">{t.name}</span>
              <button onClick={() => handleDelete(t.id, t.name)} className="text-gray-600 hover:text-rose-400 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                <FiTrash2 size={13} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setNewTagName('') }} title="新建标签">
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">标签名称</label>
            <input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full bg-surface-700 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-500 transition-colors"
              placeholder="输入标签名称"
              autoFocus
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleCreate} disabled={creating} className="flex-1 bg-accent-600 hover:bg-accent-500 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50">
              {creating ? '创建中...' : '创建'}
            </button>
            <button onClick={() => { setModalOpen(false); setNewTagName('') }} className="px-4 bg-surface-700 hover:bg-surface-600 text-gray-300 rounded-lg py-2 text-sm transition-colors">取消</button>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}
