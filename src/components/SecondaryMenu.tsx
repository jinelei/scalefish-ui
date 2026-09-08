import { useEffect, useState, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { FiBookmark, FiBriefcase, FiUser, FiHeart, FiStar, FiPlayCircle, FiCode, FiTool, FiPackage, FiList } from 'react-icons/fi'
import { getCategoryTree } from '../api/categories'
import { categoryColor, withAlpha } from '../utils/categoryColor'

const manageSubItems = [
  { to: '/', label: '全部书签', icon: FiBookmark },
  { to: '/manage', label: '管理书签', icon: FiList },
]

interface SecondaryMenuProps {
  open: boolean
  onClose: () => void
}

function categoryIcon(name: string) {
  switch (name) {
    case '工作': return FiBriefcase
    case '我的': return FiUser
    case '个人': return FiHeart
    case '专属': return FiStar
    case '娱乐': return FiPlayCircle
    case '研发': return FiCode
    case '工具': return FiTool
    case '资源': return FiPackage
    default: return FiBookmark
  }
}

export default function SecondaryMenu({ open, onClose }: SecondaryMenuProps) {
  const location = useLocation()
  const [categoryList, setCategoryList] = useState<{ id: number; name: string; color?: string | null }[]>([])

  const loadCategories = useCallback(() => {
    getCategoryTree()
      .then(res => setCategoryList(res.data.map(c => ({ id: c.id, name: c.name, color: c.color }))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories, location.pathname])

  useEffect(() => {
    onClose()
  }, [location.pathname, onClose])

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 md:z-auto w-52 shrink-0 glass border-r border-white/5 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="h-full overflow-y-auto py-4 px-3 space-y-0.5">
          <div className="px-3 py-1.5 text-[11px] font-medium text-gray-600 uppercase tracking-wider">
            书签
          </div>
          {manageSubItems.map(sub => {
            const isActive = sub.to === '/manage'
              ? location.pathname.startsWith('/manage')
              : location.pathname === '/' || location.pathname.startsWith('/bookmarks/')
            return (
              <NavLink
                key={sub.to}
                to={sub.to}
                end
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-accent-500/10 text-accent-400 font-medium'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <sub.icon size={15} />
                {sub.label}
              </NavLink>
            )
          })}

          {categoryList.length > 0 && (
            <>
              <div className="px-3 pt-3 pb-1.5 text-[11px] font-medium text-gray-600 uppercase tracking-wider">
                分类
              </div>
              <div className="space-y-0.5">
                {categoryList.map(cat => {
                  const CatIcon = categoryIcon(cat.name)
                  const catColor = categoryColor(cat.color)
                  const active = location.pathname === `/bookmarks/${cat.id}`
                  return (
                    <NavLink
                      key={cat.id}
                      to={`/bookmarks/${cat.id}`}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                        active ? '' : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                      }`}
                      style={active
                        ? { backgroundColor: withAlpha(catColor, 0.12), color: catColor, fontWeight: 500 }
                        : undefined}
                    >
                      <span style={{ color: catColor }} className="opacity-80 shrink-0">
                        <CatIcon size={15} />
                      </span>
                      <span className="truncate">{cat.name}</span>
                    </NavLink>
                  )
                })}
              </div>
            </>
          )}
        </nav>
      </aside>
    </>
  )
}
