'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, PenSquare, Users,
  BarChart2, Settings, LogOut, Zap,
  Menu, X, Bell, Sun, Moon,
} from 'lucide-react'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/dashboard',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/new',      label: 'New Post',  icon: PenSquare },
  { href: '/dashboard/connect',  label: 'Accounts',  icon: Users },
  { href: '/dashboard/analytics',label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/settings', label: 'Settings',  icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  // Load saved theme
  useEffect(() => {
    const saved = localStorage.getItem('pp-theme') as 'dark' | 'light' | null
    if (saved) {
      setTheme(saved)
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('pp-theme', next)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="pp-root">
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
          <div className="pp-nav__label">Menu</div>
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
            Free Plan
          </div>
          <button onClick={handleLogout} className="pp-logout">
            <LogOut size={16} strokeWidth={1.8} />
            <span>Logout</span>
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
            {/* Theme Toggle */}
            <button className="pp-theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? <Sun size={17} strokeWidth={1.8} /> : <Moon size={17} strokeWidth={1.8} />}
            </button>
            <button className="pp-topbar__bell">
              <Bell size={18} strokeWidth={1.8} />
            </button>
            <div className="pp-avatar">HA</div>
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
