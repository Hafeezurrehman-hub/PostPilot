'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'

const DEFAULT_PREFS = {
  emailPublish: true,
  emailSchedule: true,
  emailWeeklySummary: false,
  inAppMentions: true,
  inAppErrors: true,
}

type Prefs = typeof DEFAULT_PREFS

const ROWS: { key: keyof Prefs; label: string; desc: string }[] = [
  { key: 'emailPublish', label: 'Post published', desc: 'Email me when a post is successfully published.' },
  { key: 'emailSchedule', label: 'Scheduled post reminder', desc: 'Email me before a scheduled post goes live.' },
  { key: 'emailWeeklySummary', label: 'Weekly summary', desc: 'A weekly digest of your performance.' },
  { key: 'inAppMentions', label: 'In-app mentions', desc: 'Notify me in-app about new mentions.' },
  { key: 'inAppErrors', label: 'In-app publish errors', desc: 'Notify me in-app if a post fails to publish.' },
]

export default function NotificationsSettingsPage() {
  const router = useRouter()
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)

  useEffect(() => {
    const saved = localStorage.getItem('pp-notification-prefs')
    if (saved) {
      try {
        setPrefs(JSON.parse(saved))
      } catch {}
    }
  }, [])

  const toggle = (key: keyof Prefs) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    localStorage.setItem('pp-notification-prefs', JSON.stringify(next))
    toast.success('Preference saved', { duration: 1500 })
  }

  return (
    <div className="pp-composer">
      <div className="pp-composer__header">
        <button
          onClick={() => router.push('/dashboard/settings')}
          className="pp-icon-btn"
          style={{ marginRight: 4 }}
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="pp-composer__title">Notifications</h1>
      </div>

      <div className="pp-side-card" style={{ maxWidth: 560, padding: 0, overflow: 'hidden' }}>
        {ROWS.map((row, i) => (
          <div
            key={row.key}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              padding: '14px 16px',
              borderBottom: i < ROWS.length - 1 ? '1px solid var(--pp-border)' : 'none',
            }}
          >
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--pp-text)' }}>{row.label}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--pp-muted2)' }}>{row.desc}</div>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={prefs[row.key]}
                onChange={() => toggle(row.key)}
                style={{ width: 18, height: 18, accentColor: 'var(--pp-indigo)' }}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}
