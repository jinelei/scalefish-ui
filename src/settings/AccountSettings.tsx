import AccountSection from './sections/AccountSection'
import PasswordSection from './sections/PasswordSection'

export default function AccountSettings() {
  return (
    <div className="space-y-6">
      <AccountSection />
      <PasswordSection />
    </div>
  )
}
