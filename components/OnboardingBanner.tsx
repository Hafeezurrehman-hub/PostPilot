'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ArrowRight, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const STEPS = [
  { key: 'connect', label: 'Connect an account', desc: 'Link at least one platform to publish to.', href: '/dashboard/connect' },
  { key: 'post', label: 'Create your first post', desc: 'Write or generate a caption with AI.', href: '/dashboard/new' },
  { key: 'publish', label: 'Publish it', desc: 'Go live or schedule it for later.', href: '/dashboard/new' },
]

export default function OnboardingBanner() {
  const [loading, setLoading] = useState(true)
  const [connectedCount, setConnectedCount] = useState<number | null>(null)
  const [postCount, setPostCount] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      console.log('[Onboarding] user:', user, 'userError:', userError)

      if (!user) {
        console.log('[Onboarding] No user found — banner will stay hidden.')
        setLoading(false)
        return
      }

      const [connResult, postResult] = await Promise.all([
        supabase
          .from('platform_connections')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ])

      console.log('[Onboarding] connections result:', connResult)
      console.log('[Onboarding] posts result:', postResult)

      setConnectedCount(connResult.count ?? 0)
      setPostCount(postResult.count ?? 0)
      setLoading(false)
    }
    check()

    if (localStorage.getItem('pp-onboarding-dismissed') === '1') {
      setDismissed(true)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem('pp-onboarding-dismissed', '1')
    setDismissed(true)
  }

  if (loading || dismissed) return null
  if (connectedCount === null) return null
  if (connectedCount > 0 || (postCount ?? 0) > 0) return null

  const stepStatus = [connectedCount > 0, (postCount ?? 0) > 0, false]

  return (
    <div className="pp-card" style={{
      marginBottom: 20,
      background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
      border: '1px solid rgba(139,92,246,0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={16} style={{ color: 'var(--pp-purple)' }} />
          <h2 className="pp-card__title" style={{ margin: 0 }}>Welcome to PostPilot 👋</h2>
        </div>
        <button
          onClick={dismiss}
          style={{ fontSize: '0.75rem', color: 'var(--pp-muted2)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Skip for now
        </button>
      </div>
      <p className="pp-card__desc" style={{ marginBottom: 18 }}>
        Let's get your first post published — it only takes a minute.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {STEPS.map((step, i) => {
          const done = stepStatus[i]
          return (
            <Link
              key={step.key}
              href={step.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px',
                borderRadius: 'var(--pp-radius-sm)',
                border: '1px solid var(--pp-border)',
                background: 'var(--pp-surface)',
                transition: 'border-color 0.15s',
              }}
            >
              {done ? (
                <CheckCircle2 size={18} style={{ color: 'var(--pp-green)', flexShrink: 0 }} />
              ) : (
                <Circle size={18} style={{ color: 'var(--pp-muted2)', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--pp-text)' }}>
                  {i + 1}. {step.label}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--pp-muted2)' }}>{step.desc}</div>
              </div>
              <ArrowRight size={16} style={{ color: 'var(--pp-muted2)', flexShrink: 0 }} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
