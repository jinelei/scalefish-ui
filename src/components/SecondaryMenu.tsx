import { useEffect, useState, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { FiBookmark, FiBriefcase, FiUser, FiHeart, FiStar, FiPlayCircle, FiCode, FiTool, FiPackage, FiCompass, FiFolder, FiTag, FiArchive } from 'react-icons/fi'
import { getCategoryTree } from '../api/categories'
import { categoryColor, withAlpha } from '../utils/categoryColor'

const manageItems = [
  { to: '/manage/bookmarks', label: '书签', icon: FiBookmark },
  { to: '/manage/categories', label: '分类', icon: FiFolder },
  { to: '/manage/tags', label: '标签', icon: FiTag },
  { to: '/manage/archived', label: '已归档', icon: FiArchive },
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

  const isNavActive = location.pathname === '/' || location.pathname.startsWith('/bookmarks/')

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
            浏览
          </div>
          <NavLink
            to="/"
            end
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
              isNavActive
                ? 'bg-accent-500/10 text-accent-400 font-medium'
                : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <FiCompass size={15} />
            导航
          </NavLink>

          {isNavActive && categoryList.length > 0 && (
            <div className="ml-2 mt-0.5 space-y-0.5 border-l border-white/5 pl-2">
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
          )}

          <div className="px-3 pt-4 pb-1.5 text-[11px] font-medium text-gray-600 uppercase tracking-wider">
            管理
          </div>
          {manageItems.map(item => {
            const active = location.pathname.startsWith(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                  active
                    ? 'bg-accent-500/10 text-accent-400 font-medium'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <item.icon size={15} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
