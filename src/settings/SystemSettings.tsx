import BrandSection from './sections/BrandSection'
import AISettingsSection from './sections/AISettingsSection'
import PluginSection from './sections/PluginSection'
import { useAuth } from '../contexts/AuthContext'

export default function SystemSettings() {
  const { isAdmin } = useAuth()
  return (
    <div className="space-y-6">
      {isAdmin && <BrandSection />}
      {isAdmin && <AISettingsSection />}
      <PluginSection />
    </div>
  )
}
