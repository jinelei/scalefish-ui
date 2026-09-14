interface SettingsHeaderProps {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  desc: string
}

export default function SettingsHeader({ icon: Icon, title, desc }: SettingsHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center">
        <Icon size={18} className="text-accent-400" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-gray-300">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
    </div>
  )
}
