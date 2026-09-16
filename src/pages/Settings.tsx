import { useParams, Navigate } from 'react-router-dom'
import AccountSettings from '../settings/AccountSettings'
import SystemSettings from '../settings/SystemSettings'
import UsersTab from '../manage/UsersTab'
import { useAuth } from '../contexts/AuthContext'

type TabKey = 'account' | 'system' | 'users'

const tabs = new Set<TabKey>(['account', 'system', 'users'])

export default function Settings() {
  const { section } = useParams()
  const { isAdmin } = useAuth()
  const current = (section && tabs.has(section as TabKey)) ? (section as TabKey) : null

  if (!current) return <Navigate to="/settings/account" replace />
  if (current === 'users' && !isAdmin) return <Navigate to="/settings/account" replace />

  return (
    <div className="p-4 sm:p-6">
      {current === 'account' && <AccountSettings />}
      {current === 'system' && <SystemSettings />}
      {current === 'users' && <UsersTab />}
    </div>
  )
}
