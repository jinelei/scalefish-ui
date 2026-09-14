import { useParams, Navigate } from 'react-router-dom'
import AccountSettings from '../settings/AccountSettings'
import SystemSettings from '../settings/SystemSettings'

type TabKey = 'account' | 'system'

const tabs = new Set<TabKey>(['account', 'system'])

export default function Settings() {
  const { section } = useParams()
  const current = (section && tabs.has(section as TabKey)) ? (section as TabKey) : null

  if (!current) return <Navigate to="/settings/account" replace />

  return (
    <div className="p-4 sm:p-6">
      {current === 'account' && <AccountSettings />}
      {current === 'system' && <SystemSettings />}
    </div>
  )
}
