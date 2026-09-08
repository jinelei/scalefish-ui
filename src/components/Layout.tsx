import { useState, useEffect, useCallback } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { FiSun, FiMoon, FiMonitor, FiSettings, FiLogOut, FiPlus, FiMenu } from 'react-icons/fi'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { getAppConfig } from '../api/app-config'
import { OPEN_CREATE_BOOKMARK_EVENT } from '../events'
import SecondaryMenu from './SecondaryMenu'

const navLinks = [
  { to: '/', label: '书签' },
  { to: '/moments', label: '时刻' },
  { to: '/settings', label: '设置' },
]

export default function Layout() {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [secondaryOpen, setSecondaryOpen] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const { theme, cycleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    getAppConfig().then(res => {
      const name = res.data?.display_name
      if (name) setDisplayName(name)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const name = displayName || 'scalefish'
    document.title = name
  }, [displayName])

  const isBookmarkMode = location.pathname === '/'
    || location.pathname.startsWith('/bookmarks/')
    || location.pathname.startsWith('/manage')
  const hasSecondaryMenu = isBookmarkMode

  const closeSecondary = useCallback(() => setSecondaryOpen(false), [])

  const themeLabel = theme === 'light' ? '亮色模式' : theme === 'dark' ? '暗色模式' : '跟随系统'

  const openCreateBookmark = () => {
    window.dispatchEvent(new CustomEvent(OPEN_CREATE_BOOKMARK_EVENT))
  }

  return (
    <div className="flex flex-col h-screen bg-surface-900 overflow-hidden">
      <header className="glass border-b border-white/5 h-14 flex items-center px-3 sm:px-4 gap-2 sm:gap-3 shrink-0 relative z-30">
        {hasSecondaryMenu && (
          <button
            onClick={() => setSecondaryOpen(v => !v)}
            className="md:hidden text-gray-400 hover:text-gray-200 transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
            title="菜单"
          >
            <FiMenu size={18} />
          </button>
        )}
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5 cursor-pointer mr-2 sm:mr-4 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-lg">
            {(displayName || 'S')[0].toUpperCase()}
          </div>
          <span className="font-semibold text-sm tracking-wide hidden sm:inline">
            <span className="gradient-text">{displayName || 'scalefish'}</span>
          </span>
        </button>
        <nav className="flex items-center gap-1">
          {navLinks.map(({ to, label }) => {
            const isActive = to === '/'
              ? isBookmarkMode
              : to === '/moments'
                ? location.pathname.startsWith('/moments')
                : location.pathname === '/settings' || location.pathname.startsWith('/settings/')
            return (
              <button
                key={to}
                onClick={() => navigate(to)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-sm transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-accent-500/10 text-accent-400 font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            )
          })}
        </nav>
        <div className="flex-1" />
        {isBookmarkMode && (
          <button
            onClick={openCreateBookmark}
            title="新增书签"
            className="flex items-center gap-1 text-sm font-medium text-white bg-accent-600 hover:bg-accent-500 transition-colors px-3 py-1.5 rounded-lg cursor-pointer"
          >
            <FiPlus size={15} />
            <span className="hidden sm:inline">新增书签</span>
          </button>
        )}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer"
          >
            <span className="w-6 h-6 rounded-full bg-accent-600 flex items-center justify-center text-white text-xs font-medium">
              {user?.username?.charAt(0).toUpperCase() || '?'}
            </span>
            <span className="hidden sm:inline">{user?.username}</span>
          </button>
          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 w-48 glass rounded-lg py-1 shadow-xl border border-white/10">
                <div className="px-3 py-2 text-sm text-gray-400 border-b border-white/5">
                  {user?.name || user?.username}
                </div>
                <button
                  onClick={cycleTheme}
                  title="点击切换 亮色 / 暗色 / 跟随系统"
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {theme === 'system' ? <FiMonitor size={14} /> : theme === 'light' ? <FiSun size={14} /> : <FiMoon size={14} />}
                  <span className="flex-1 text-left">{themeLabel}</span>
                </button>
                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/settings') }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <FiSettings size={14} />
                  设置
                </button>
                <button
                  onClick={() => { setUserMenuOpen(false); logout() }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <FiLogOut size={14} />
                  退出登录
                </button>
              </div>
            </>
          )}
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        {hasSecondaryMenu && (
          <SecondaryMenu open={secondaryOpen} onClose={closeSecondary} />
        )}
        <main className="flex-1 min-w-0 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
