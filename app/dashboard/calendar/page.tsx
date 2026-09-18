'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { PlatformIcon } from '@/components/PlatformIcon'

type Post = {
  id: string
  content: string
  platforms: string[]
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  scheduled_for: string | null
  published_at: string | null
}

function statusClass(status: Post['status']) {
  switch (status) {
    case 'published': return 'pp-cal-chip--published'
    case 'scheduled': return 'pp-cal-chip--scheduled'
    case 'failed': return 'pp-cal-chip--failed'
    default: return 'pp-cal-chip--draft'
  }
}

export default function CalendarPage() {
  const supabase = createClient()
  const { t } = useLanguage()
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // Fetch posts whose scheduled_for OR published_at falls anywhere near
    // this month (with a little padding for the leading/trailing days
    // shown from adjacent months).
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 20)
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 10)

    const { data } = await supabase
      .from('posts')
      .select('id, content, platforms, status, scheduled_for, published_at')
      .eq('user_id', user.id)
      .or(
        `and(scheduled_for.gte.${monthStart.toISOString()},scheduled_for.lte.${monthEnd.toISOString()}),` +
        `and(published_at.gte.${monthStart.toISOString()},published_at.lte.${monthEnd.toISOString()})`
      )

    setPosts((data as Post[]) || [])
    setLoading(false)
  }, [supabase, cursor])

  useEffect(() => { load() }, [load])

  // Build the 6-week grid for this month (Mon-start)
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = (firstOfMonth.getDay() + 6) % 7 // Mon=0
  const gridStart = new Date(year, month, 1 - startOffset)

  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i))
  }

  const postsByDay = (day: Date) => {
    const key = day.toDateString()
    return posts.filter(p => {
      const relevantDate = p.status === 'published' ? p.published_at : p.scheduled_for
      if (!relevantDate) return false
      return new Date(relevantDate).toDateString() === key
    })
  }

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const today = new Date()
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="pp-calendar">
      <div className="pp-calendar__header">
        <div>
          <h1 className="pp-calendar__title">Content Calendar</h1>
          <p className="pp-calendar__sub">Sab scheduled aur published posts ek nazar mein.</p>
        </div>
        <Link href="/dashboard/new" className="pp-btn pp-btn--primary pp-btn--sm">
          <Plus size={14} /> {t('dashboard.newPost')}
        </Link>
      </div>

      <div className="pp-calendar__nav">
        <button className="pp-icon-btn" onClick={() => setCursor(new Date(year, month - 1, 1))}>
          <ChevronLeft size={18} />
        </button>
        <span className="pp-calendar__month">{monthLabel}</span>
        <button className="pp-icon-btn" onClick={() => setCursor(new Date(year, month + 1, 1))}>
          <ChevronRight size={18} />
        </button>
        <button className="pp-btn pp-btn--ghost pp-btn--sm" style={{ marginLeft: 8 }} onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>
          Today
        </button>
      </div>

      <div className="pp-cal-grid">
        {DAY_LABELS.map(d => (
          <div key={d} className="pp-cal-grid__daylabel">{d}</div>
        ))}
        {days.map((day, i) => {
          const inMonth = day.getMonth() === month
          const isToday = day.toDateString() === today.toDateString()
          const dayPosts = postsByDay(day)

          return (
            <div key={i} className={`pp-cal-cell ${!inMonth ? 'pp-cal-cell--outside' : ''} ${isToday ? 'pp-cal-cell--today' : ''}`}>
              <div className="pp-cal-cell__num">{day.getDate()}</div>
              <div className="pp-cal-cell__chips">
                {dayPosts.slice(0, 3).map(p => (
                  <Link key={p.id} href={`/dashboard/new?edit=${p.id}`} className={`pp-cal-chip ${statusClass(p.status)}`}>
                    {p.platforms?.[0] && <PlatformIcon platform={p.platforms[0]} size={12} />}
                    <span className="pp-cal-chip__text">
                      {p.content.length > 18 ? p.content.slice(0, 18) + '…' : p.content}
                    </span>
                  </Link>
                ))}
                {dayPosts.length > 3 && (
                  <div className="pp-cal-chip pp-cal-chip--more">+{dayPosts.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {!loading && posts.length === 0 && (
        <div className="pp-empty" style={{ marginTop: 12 }}>
          <p className="pp-empty__text">Is mahine koi scheduled ya published post nahi.</p>
          <Link href="/dashboard/new" className="pp-link pp-link--centered">
            Naya post banayein →
          </Link>
        </div>
      )}

      <div className="pp-cal-legend">
        <span><span className="pp-cal-legend__dot pp-cal-legend__dot--scheduled" /> Scheduled</span>
        <span><span className="pp-cal-legend__dot pp-cal-legend__dot--published" /> Published</span>
        <span><span className="pp-cal-legend__dot pp-cal-legend__dot--failed" /> Failed</span>
        <span><span className="pp-cal-legend__dot pp-cal-legend__dot--draft" /> Draft</span>
      </div>
    </div>
  )
}
