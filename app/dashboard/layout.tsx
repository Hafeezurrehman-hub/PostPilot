'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, PenSquare, Users,
  BarChart2, Settings, LogOut, Zap,
  Menu, X, Bell, Sun, Moon, Globe,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const { language, setLanguage, t } = useLanguage()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [initials, setInitials] = useState('HA')

  const navItems = [
    { href: '/dashboard',           label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/dashboard/new',       label: t('nav.newPost'),   icon: PenSquare },
    { href: '/dashboard/connect',   label: t('nav.accounts'),  icon: Users },
    { href: '/dashboard/analytics', label: t('nav.analytics'), icon: BarChart2 },
    { href: '/dashboard/settings',  label: t('nav.settings'),  icon: Settings },
  ]

  useEffect(() => {
    const saved = localStorage.getItem('pp-theme') as 'dark' | 'light' | null
    if (saved) {
      setTheme(saved)
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  // Load profile photo + initials for the topbar avatar
  useEffect(() => {
    let isMounted = true
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !isMounted) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', user.id)
        .single()

      if (!isMounted) return
      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
      const name = profile?.full_name || user.email || ''
      const parts = name.trim().split(/\s+/)
      const computed = parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase()
      if (computed) setInitials(computed)
    }
    loadProfile()
    return () => { isMounted = false }
  }, [supabase])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('pp-theme', next)
  }

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ur' : 'en')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="pp-root">
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--pp-surface)',
            color: 'var(--pp-text)',
            border: '1px solid var(--pp-border)',
            borderRadius: '10px',
            fontSize: '0.875rem',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          },
          success: {
            iconTheme: { primary: '#10B981', secondary: 'white' },
            style: {
              borderLeft: '3px solid #10B981',
            },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: 'white' },
            style: {
              borderLeft: '3px solid #EF4444',
            },
          },
          loading: {
            iconTheme: { primary: '#6366F1', secondary: 'white' },
            style: {
              borderLeft: '3px solid #6366F1',
            },
          },
        }}
      />

      {sidebarOpen && (
        <div className="pp-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`pp-sidebar ${sidebarOpen ? 'pp-sidebar--open' : ''}`}>
        <div className="pp-logo">
          <div className="pp-logo__icon"><Zap size={18} strokeWidth={2.5} /></div>
          <span className="pp-logo__text">Post<span>Pilot</span></span>
          <button className="pp-sidebar__close" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="pp-nav">
          <div className="pp-nav__label">{t('nav.menu')}</div>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`pp-nav__item ${active ? 'pp-nav__item--active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{label}</span>
                {active && <div className="pp-nav__dot" />}
              </Link>
            )
          })}
        </nav>

        <div className="pp-sidebar__bottom">
          <div className="pp-plan-badge">
            <span className="pp-plan-badge__dot" />
            {t('nav.freePlan')}
          </div>
          <button onClick={handleLogout} className="pp-logout">
            <LogOut size={16} strokeWidth={1.8} />
            <span>{t('nav.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="pp-main">
        <header className="pp-topbar">
          <button className="pp-topbar__menu" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="pp-topbar__title">
            {navItems.find(i => i.href === pathname)?.label || 'PostPilot'}
          </div>
          <div className="pp-topbar__right">
            <Link href="/dashboard/pricing" className="pp-btn pp-btn--purple pp-btn--sm pp-upgrade-btn">
              <Zap size={14} />
              <span className="pp-upgrade-btn__text">{t('nav.upgrade')}</span>
            </Link>
            <button className="pp-theme-toggle" onClick={toggleLanguage} title="Switch language / Zaban badlein">
              <Globe size={17} strokeWidth={1.8} />
              <span className="pp-lang-badge">{language === 'en' ? 'EN' : 'UR'}</span>
            </button>
            <button className="pp-theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? <Sun size={17} strokeWidth={1.8} /> : <Moon size={17} strokeWidth={1.8} />}
            </button>
            <button className="pp-topbar__bell">
              <Bell size={18} strokeWidth={1.8} />
            </button>
            <div className="pp-avatar">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Profile" className="pp-avatar__img" />
              ) : (
                initials
              )}
            </div>
          </div>
        </header>
        <main className="pp-content">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="pp-bottom-nav">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              className={`pp-bottom-nav__item ${active ? 'pp-bottom-nav__item--active' : ''}`}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
