import { HashtagManager } from '@/features/hashtags/HashtagManager'
import { ProfileManager } from '@/features/profiles/ProfileManager'

export function ColetaPage() {
  return (
    <>
      <div>
        <h1 className="text-xl font-semibold">Collection</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Hashtags and tracked profiles</p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <HashtagManager />
        <ProfileManager />
      </div>
    </>
  )
}
