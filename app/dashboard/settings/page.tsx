'use client'

import Link from 'next/link'
import {
  Layers, FileText, Mic2, Ear, Users2, Link2,
  ChevronRight, User, Bell, Shield,
} from 'lucide-react'

const toolItems = [
  { href: '/dashboard/bulk', label: 'Bulk Scheduling', desc: 'Upload and schedule multiple posts at once.', icon: Layers },
  { href: '/dashboard/templates', label: 'Templates', desc: 'Reusable post templates for faster drafting.', icon: FileText },
  { href: '/dashboard/brand-voice', label: 'Brand Voice', desc: 'Train AI captions to match your brand tone.', icon: Mic2 },
  { href: '/dashboard/listening', label: 'Social Listening', desc: 'Track mentions and keywords across platforms.', icon: Ear },
  { href: '/dashboard/teams', label: 'Teams', desc: 'Invite teammates and manage permissions.', icon: Users2 },
  { href: '/dashboard/links', label: 'Link Shortener', desc: 'Shorten and track links used in your posts.', icon: Link2 },
]

const accountItems = [
  { href: '/dashboard/settings/profile', label: 'Profile', desc: 'Name, email, and password.', icon: User },
  { href: '/dashboard/settings/notifications', label: 'Notifications', desc: 'Email and in-app alert preferences.', icon: Bell },
  { href: '/dashboard/settings/privacy-security', label: 'Privacy & Security', desc: 'Manage your data and account security.', icon: Shield },
]

export default function SettingsPage() {
  return (
    <div className="pp-composer">
      <div className="pp-composer__header">
        <h1 className="pp-composer__title">Settings</h1>
      </div>

      <div>
        <div className="pp-side-card__title" style={{ marginBottom: 10 }}>Tools</div>
        <div className="pp-platform-grid">
          {toolItems.map(({ href, label, desc, icon: Icon }) => (
            <Link key={href} href={href} className="pp-platform-card">
              <div className="pp-platform-card__top">
                <div className="pp-platform-card__icon" style={{ background: 'rgba(99,102,241,0.14)', color: 'var(--pp-indigo)' }}>
                  <Icon size={18} strokeWidth={1.8} />
                </div>
                <ChevronRight size={16} color="var(--pp-muted2)" />
              </div>
              <div className="pp-platform-card__name">{label}</div>
              <div className="pp-platform-card__desc">{desc}</div>
            </Link>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <div className="pp-side-card__title" style={{ marginBottom: 10 }}>Account</div>
        <div className="pp-side-card" style={{ padding: 0, overflow: 'hidden' }}>
          {accountItems.map(({ href, label, desc, icon: Icon }, i) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px',
                borderBottom: i < accountItems.length - 1 ? '1px solid var(--pp-border)' : 'none',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--pp-surface2)', color: 'var(--pp-muted2)',
              }}>
                <Icon size={16} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--pp-text)' }}>{label}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--pp-muted2)' }}>{desc}</div>
              </div>
              <ChevronRight size={16} color="var(--pp-muted2)" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
