'use client'

import { useEffect, useState } from 'react'
import { Check, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type PlanId = 'free' | 'pro' | 'team'

const PLANS: {
  id: PlanId
  name: string
  price: string
  period: string
  desc: string
  features: string[]
  cta: string
  highlighted: boolean
}[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'Rs 0',
    period: '/forever',
    desc: 'For individuals just getting started.',
    features: ['3 connected accounts', '10 posts / month', 'Basic analytics', 'AI captions (limited)'],
    cta: 'Current Plan',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'Rs 1,500',
    period: '/month',
    desc: 'For creators and small teams.',
    features: [
      '13 connected accounts',
      'Unlimited posts',
      'Full analytics suite',
      'Unlimited AI captions',
      'Scheduling & auto-publish',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    highlighted: true,
  },
  {
    id: 'team',
    name: 'Team',
    price: 'Rs 4,000',
    period: '/month',
    desc: 'For growing marketing teams.',
    features: [
      'Everything in Pro',
      'Up to 5 team members',
      'Brand voice training',
      'Social listening',
      'Shared content calendar',
    ],
    cta: 'Upgrade to Team',
    highlighted: false,
  },
]

export default function PricingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [currentPlan, setCurrentPlan] = useState<PlanId>('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single()
      if (isMounted && data?.plan) setCurrentPlan(data.plan as PlanId)
      if (isMounted) setLoading(false)
    }
    load()
    return () => { isMounted = false }
  }, [supabase])

  const handleUpgrade = (planId: PlanId) => {
    if (planId === currentPlan || planId === 'free') return
    // Payment wale page par redirect karo
    router.push(`/dashboard/pricing/upgrade?plan=${planId}`)
  }

  return (
    <div className="pp-dashboard">
      <div className="pp-welcome">
        <div>
          <h1 className="pp-welcome__heading">Upgrade your plan</h1>
          <p className="pp-welcome__sub">Simple pricing, no surprises. Upgrade anytime. Prices in PKR.</p>
        </div>
      </div>

      <div className="pp-pricing-grid">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan
          return (
            <div
              key={plan.id}
              className={`pp-card pp-pricing-card ${plan.highlighted ? 'pp-pricing-card--highlighted' : ''}`}
            >
              {plan.highlighted && (
                <span className="pp-pricing-card__badge">
                  <Zap size={12} /> Most Popular
                </span>
              )}
              <h2 className="pp-card__title">{plan.name}</h2>
              <div className="pp-pricing-card__price">
                <span className="pp-pricing-card__amount">{plan.price}</span>
                <span className="pp-pricing-card__period">{plan.period}</span>
              </div>
              <p className="pp-card__desc">{plan.desc}</p>

              <ul className="pp-pricing-card__features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <Check size={15} className="pp-pricing-card__check"/>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className={`pp-btn ${plan.highlighted ? 'pp-btn--purple' : 'pp-btn--ghost'} pp-pricing-card__cta`}
                disabled={loading || isCurrent}
                onClick={() => handleUpgrade(plan.id)}
              >
                {isCurrent ? 'Current Plan' : plan.cta}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
