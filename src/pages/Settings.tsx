import { useParams, Navigate } from 'react-router-dom'
import AccountSettings from '../settings/AccountSettings'
import SystemSettings from '../settings/SystemSettings'
import DataSettings from '../settings/DataSettings'

type TabKey = 'account' | 'system' | 'data'

const tabs = new Set<TabKey>(['account', 'system', 'data'])

export default function Settings() {
  const { section } = useParams()
  const current = (section && tabs.has(section as TabKey)) ? (section as TabKey) : null

  if (!current) return <Navigate to="/settings/account" replace />

  return (
    <div>
      {current === 'account' && <AccountSettings />}
      {current === 'system' && <SystemSettings />}
      {current === 'data' && <DataSettings />}
    </div>
  )
}
