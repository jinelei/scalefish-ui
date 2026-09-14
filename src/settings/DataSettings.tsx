import DataBackupSection from './sections/DataBackupSection'
import FaviconSection from './sections/FaviconSection'
import AiTaggingSection from './sections/AiTaggingSection'

export default function DataSettings() {
  return (
    <div className="space-y-6">
      <DataBackupSection />
      <FaviconSection />
      <AiTaggingSection />
    </div>
  )
}
