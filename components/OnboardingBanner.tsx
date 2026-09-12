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
  const [publishedCount, setPublishedCount] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const [connResult, postResult, publishedResult] = await Promise.all([
        supabase
          .from('platform_connections')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'published'),
      ])

      setConnectedCount(connResult.count ?? 0)
      setPostCount(postResult.count ?? 0)
      setPublishedCount(publishedResult.count ?? 0)
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
  // Keep showing until the user has actually connected a platform —
  // creating a post alone doesn't mean onboarding is done.
  if (connectedCount > 0) return null

  const stepStatus = [connectedCount > 0, (postCount ?? 0) > 0, (publishedCount ?? 0) > 0]
  const completedSteps = stepStatus.filter(Boolean).length

  return (
    <div className="pp-card pp-onboarding">
      <div className="pp-onboarding__header">
        <div className="pp-onboarding__title-row">
          <Zap size={16} style={{ color: 'var(--pp-purple)' }} />
          <h2 className="pp-card__title" style={{ margin: 0 }}>Welcome to PostPilot 👋</h2>
        </div>
        <button onClick={dismiss} className="pp-onboarding__skip">
          Skip for now
        </button>
      </div>
      <p className="pp-card__desc" style={{ marginBottom: 14 }}>
        Let&apos;s get your first post published — it only takes a minute.
      </p>

      {/* Step indicator */}
      <div className="pp-onboarding__progress">
        {STEPS.map((step, i) => (
          <div key={step.key} className="pp-onboarding__progress-step">
            <div className={`pp-onboarding__progress-dot ${stepStatus[i] ? 'pp-onboarding__progress-dot--done' : ''}`}>
              {stepStatus[i] ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span className={`pp-onboarding__progress-label ${stepStatus[i] ? 'pp-onboarding__progress-label--done' : ''}`}>
              {step.label.split(' ')[0] === 'Connect' ? 'Connect' : step.label.split(' ')[0] === 'Create' ? 'Compose' : 'Publish'}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`pp-onboarding__progress-line ${stepStatus[i] ? 'pp-onboarding__progress-line--done' : ''}`} />
            )}
          </div>
        ))}
      </div>

      <div className="pp-onboarding__steps">
        {STEPS.map((step, i) => {
          const done = stepStatus[i]
          return (
            <Link key={step.key} href={step.href} className="pp-onboarding__step-row">
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

      <div className="pp-onboarding__count">{completedSteps} of 3 steps done</div>
    </div>
  )
}
