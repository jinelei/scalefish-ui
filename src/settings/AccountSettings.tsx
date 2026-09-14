import AccountSection from './sections/AccountSection'
import PasswordSection from './sections/PasswordSection'
import TotpSection from './sections/TotpSection'
import FingerprintsSection from './sections/FingerprintsSection'
import AiTaggingSection from './sections/AiTaggingSection'

export default function AccountSettings() {
  return (
    <div className="space-y-6">
      <AccountSection />
      <PasswordSection />
      <TotpSection />
      <FingerprintsSection />
      <AiTaggingSection />
    </div>
  )
}
