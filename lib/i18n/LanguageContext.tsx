'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { translations, type Language } from './translations'

type LanguageContextValue = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    const saved = localStorage.getItem('pp-language') as Language | null
    if (saved === 'en' || saved === 'ur') {
      setLanguageState(saved)
    }
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('pp-language', lang)
  }, [])

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    let str = translations[language][key] ?? translations.en[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v))
      }
    }
    return str
  }, [language])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return ctx
}
