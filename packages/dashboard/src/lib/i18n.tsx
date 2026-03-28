import { createContext, useContext, type ReactNode } from 'react'
import { en, type Translations } from '@/locales/en'

const I18nContext = createContext<Translations>(en)

/**
 * To add a new language in the future:
 * 1. Create `src/locales/<lang>.ts` implementing the `Translations` type
 * 2. Add a `locale` prop (or detect from browser/user preference)
 * 3. Pass the matching locale object as the context value
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  return <I18nContext.Provider value={en}>{children}</I18nContext.Provider>
}

export function useT(): Translations {
  return useContext(I18nContext)
}
