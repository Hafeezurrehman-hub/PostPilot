'use client'

import Link from 'next/link'
import { PenSquare, Users, BarChart2, Zap, ArrowRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import OnboardingBanner from '@/components/OnboardingBanner'

const stats = [
  { label: 'Posts Published', value: '0', icon: CheckCircle2, color: 'var(--pp-green)' },
  { label: 'Scheduled', value: '0', icon: Clock, color: 'var(--pp-indigo)' },
  { label: 'Connected Accounts', value: '0', icon: Users, color: 'var(--pp-purple)' },
  { label: 'Total Reach', value: '—', icon: BarChart2, color: 'var(--pp-amber)' },
]

const platforms = [
  { name: 'Twitter / X', icon: '𝕏', connected: false },
  { name: 'LinkedIn', icon: 'in', connected: false },
  { name: 'Instagram', icon: '📸', connected: false },
  { name: 'Facebook', icon: 'f', connected: false },
  { name: 'TikTok', icon: '♪', connected: false },
  { name: 'YouTube', icon: '▶', connected: false },
]

export default function DashboardPage() {
  return (
    <div className="pp-dashboard">

      <OnboardingBanner />

      {/* Welcome */}
      <div className="pp-welcome">
        <div>
          <h1 className="pp-welcome__heading">Good evening 👋</h1>
          <p className="pp-welcome__sub">You have 0 posts scheduled. Ready to create?</p>
        </div>
        <Link href="/dashboard/new" className="pp-btn pp-btn--primary">
          <PenSquare size={16} />
          New Post
        </Link>
      </div>

      {/* Stats */}
      <div className="pp-stats">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="pp-stat-card">
            <div className="pp-stat-card__icon" style={{ color }}>
              <Icon size={20} strokeWidth={1.8} />
            </div>
            <div className="pp-stat-card__value">{value}</div>
            <div className="pp-stat-card__label">{label}</div>
          </div>
        ))}
      </div>

      {/* Two col */}
      <div className="pp-grid-2">

        {/* Connect platforms */}
        <div className="pp-card">
          <div className="pp-card__header">
            <h2 className="pp-card__title">Connect Platforms</h2>
            <Link href="/dashboard/connect" className="pp-link">
              Manage <ArrowRight size={14} />
            </Link>
          </div>
          <div className="pp-platforms">
            {platforms.map(({ name, icon, connected }) => (
              <div key={name} className="pp-platform-row">
                <div className="pp-platform-row__icon">{icon}</div>
                <span className="pp-platform-row__name">{name}</span>
                <span className={`pp-platform-row__status ${connected ? 'pp-platform-row__status--connected' : ''}`}>
                  {connected ? '● Connected' : '○ Connect'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions + empty state */}
        <div className="pp-col-stack">
          {/* AI Feature */}
          <div className="pp-card pp-card--ai">
            <div className="pp-card__ai-badge">
              <Zap size={13} />
              AI Powered
            </div>
            <h2 className="pp-card__title">Generate Captions</h2>
            <p className="pp-card__desc">Describe your post — AI writes captions optimized for every platform.</p>
            <Link href="/dashboard/new" className="pp-btn pp-btn--purple pp-btn--sm">
              Try it now
            </Link>
          </div>

          {/* Recent posts empty */}
          <div className="pp-card pp-empty">
            <AlertCircle size={32} strokeWidth={1.4} className="pp-empty__icon" />
            <p className="pp-empty__text">No posts yet</p>
            <Link href="/dashboard/new" className="pp-link pp-link--centered">
              Create your first post →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
