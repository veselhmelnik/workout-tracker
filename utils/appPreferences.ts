import { File, Paths } from 'expo-file-system'

/**
 * Small device-local preferences file. The project has no AsyncStorage and
 * keeps no settings in SQLite, but expo-file-system is already a dependency,
 * so a single JSON file avoids both a new dependency and a new table.
 */
const PREFERENCES_FILE = 'app-preferences.json'

type AppPreferences = {
  onboardingCompleted: boolean
  /**
   * Development-only Pro override. Read only when __DEV__ is true, so a value
   * left in the file cannot grant Pro in a production build.
   */
  developerProEnabled: boolean
}

const DEFAULT_PREFERENCES: AppPreferences = {
  onboardingCompleted: false,
  developerProEnabled: false,
}

/** Cached after the first read so screens never hit the disk directly. */
let cache: AppPreferences | null = null

function preferencesFile(): File {
  return new File(Paths.document, PREFERENCES_FILE)
}

async function readPreferences(): Promise<AppPreferences> {
  if (cache) {
    return cache
  }

  try {
    const file = preferencesFile()

    if (file.exists) {
      const parsed: unknown = JSON.parse(await file.text())

      if (parsed && typeof parsed === 'object') {
        cache = {
          ...DEFAULT_PREFERENCES,
          ...(parsed as Partial<AppPreferences>),
        }

        return cache
      }
    }
  } catch (error) {
    // A missing or unreadable file must not block startup; the user simply
    // sees onboarding again rather than being locked out.
    console.warn('Could not read app preferences', error)
  }

  cache = { ...DEFAULT_PREFERENCES }

  return cache
}

async function writePreferences(next: AppPreferences): Promise<void> {
  // Update the cache first, so the current session behaves correctly even if
  // the write fails.
  cache = next

  const file = preferencesFile()

  if (!file.exists) {
    file.create({ intermediates: true })
  }

  file.write(JSON.stringify(next))
}

export async function getOnboardingCompleted(): Promise<boolean> {
  return (await readPreferences()).onboardingCompleted
}

/** Resolves even when the write fails; the failure is logged, not thrown. */
export async function setOnboardingCompleted(): Promise<void> {
  try {
    await writePreferences({
      ...(await readPreferences()),
      onboardingCompleted: true,
    })
  } catch (error) {
    console.warn('Could not save onboarding state', error)
  }
}

/**
 * The development Pro override. Always false outside a development build, so
 * production entitlement cannot come from this file however it was edited.
 */
export async function getDeveloperProEnabled(): Promise<boolean> {
  if (!__DEV__) {
    return false
  }

  return (await readPreferences()).developerProEnabled
}

/** Resolves even when the write fails; the failure is logged, not thrown. */
export async function setDeveloperProEnabled(enabled: boolean): Promise<void> {
  try {
    await writePreferences({
      ...(await readPreferences()),
      developerProEnabled: enabled,
    })
  } catch (error) {
    console.warn('Could not save developer Pro state', error)
  }
}
