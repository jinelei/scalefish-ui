import BrandSection from './sections/BrandSection'
import TotpSection from './sections/TotpSection'
import FingerprintsSection from './sections/FingerprintsSection'
import PluginSection from './sections/PluginSection'

export default function SystemSettings() {
  return (
    <div className="space-y-6">
      <BrandSection />
      <TotpSection />
      <FingerprintsSection />
      <PluginSection />
    </div>
  )
}
