'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart2, TrendingUp, Users, FileText,
  ArrowUp, ArrowDown, Minus,
  Clock
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const PLATFORM_META: Record<string, { name: string; icon: string; color: string }> = {
  twitter:    { name: 'Twitter / X', icon: '𝕏',  color: '#1D9BF0' },
  linkedin:   { name: 'LinkedIn',    icon: 'in', color: '#0A66C2' },
  instagram:  { name: 'Instagram',   icon: '📸', color: '#E1306C' },
  facebook:   { name: 'Facebook',    icon: 'f',  color: '#1877F2' },
  tiktok:     { name: 'TikTok',      icon: '♪',  color: '#FF0050' },
  youtube:    { name: 'YouTube',     icon: '▶',  color: '#FF0000' },
  telegram:   { name: 'Telegram',    icon: '✈',  color: '#26A5E4' },
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type Post = {
  id: string
  content: string
  platforms: string[]
  status: string
  created_at: string
  published_at: string | null
  scheduled_for: string | null
}

type AnalyticsRow = {
  post_id: string
  platform: string
  reach: number | null
  impressions: number | null
  likes: number | null
  comments: number | null
  shares: number | null
}

function dateRangeCutoff(filterKey: string): Date | null {
  const now = new Date()
  switch (filterKey) {
    case 'last7': return new Date(now.getTime() - 7 * 86400000)
    case 'last30': return new Date(now.getTime() - 30 * 86400000)
    case 'last90': return new Date(now.getTime() - 90 * 86400000)
    default: return null // all time
  }
}

export default function AnalyticsPage() {
  const { t } = useLanguage()
  const supabase = createClient()

  const [dateFilter, setDateFilter] = useState('last7')
  const [chartTab, setChartTab] = useState<'posts' | 'reach'>('posts')
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<Post[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([])
  const [connectedCount, setConnectedCount] = useState(0)

  const DATE_FILTERS = [
    { key: 'last7', label: t('analytics.filter.last7') },
    { key: 'last30', label: t('analytics.filter.last30') },
    { key: 'last90', label: t('analytics.filter.last90') },
    { key: 'allTime', label: t('analytics.filter.allTime') },
  ]
  const activeFilterLabel = DATE_FILTERS.find(f => f.key === dateFilter)?.label

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const cutoff = dateRangeCutoff(dateFilter)

    let query = supabase
      .from('posts')
      .select('id, content, platforms, status, created_at, published_at, scheduled_for')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (cutoff) query = query.gte('created_at', cutoff.toISOString())

    const [{ data: postsData }, { count: connCount }] = await Promise.all([
      query,
      supabase.from('platform_connections').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])

    const fetchedPosts = (postsData as Post[]) || []
    setPosts(fetchedPosts)
    setConnectedCount(connCount || 0)

    const postIds = fetchedPosts.map(p => p.id)
    if (postIds.length > 0) {
      const { data: analyticsData } = await supabase
        .from('post_analytics')
        .select('post_id, platform, reach, impressions, likes, comments, shares')
        .in('post_id', postIds)
      setAnalytics((analyticsData as AnalyticsRow[]) || [])
    } else {
      setAnalytics([])
    }

    setLoading(false)
  }, [supabase, dateFilter])

  useEffect(() => { load() }, [load])

  // ── Derived stats ──
  const publishedPosts = posts.filter(p => p.status === 'published')
  const scheduledPosts = posts.filter(p => p.status === 'scheduled')
  const totalReach = analytics.reduce((sum, a) => sum + (a.reach || 0), 0)
  const platformsUsedSet = new Set(posts.flatMap(p => p.platforms || []))

  const STATS = [
    { label: t('analytics.stat.totalPosts'), value: String(posts.length), change: 0, icon: FileText, color: 'var(--pp-indigo)' },
    { label: t('analytics.stat.totalReach'), value: totalReach.toLocaleString(), change: 0, icon: TrendingUp, color: 'var(--pp-purple)' },
    { label: t('analytics.stat.platformsUsed'), value: String(platformsUsedSet.size || connectedCount), change: 0, icon: Users, color: 'var(--pp-green)' },
    { label: t('analytics.stat.scheduled'), value: String(scheduledPosts.length), change: 0, icon: Clock, color: 'var(--pp-amber)' },
  ]

  // Posts-over-time — last 7 days, Mon–Sun buckets based on published/created date
  const chartData = (() => {
    const now = new Date()
    const buckets = new Array(7).fill(0)
    const sourcePosts = publishedPosts.length > 0 ? publishedPosts : posts
    for (const p of sourcePosts) {
      const d = new Date(p.published_at || p.created_at)
      const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
      if (diffDays >= 0 && diffDays < 7) {
        const dayIdx = (d.getDay() + 6) % 7 // convert Sun=0 to Mon=0 index
        if (chartTab === 'posts') {
          buckets[dayIdx] += 1
        } else {
          const postReach = analytics.filter(a => a.post_id === p.id).reduce((s, a) => s + (a.reach || 0), 0)
          buckets[dayIdx] += postReach
        }
      }
    }
    return buckets
  })()
  const maxChartVal = Math.max(...chartData, 1)
  const hasChartData = chartData.some(v => v > 0)

  // Platform breakdown
  const platformBreakdown = Object.keys(PLATFORM_META).map(id => {
    const postsForPlatform = posts.filter(p => p.platforms?.includes(id)).length
    return { id, ...PLATFORM_META[id], posts: postsForPlatform }
  })
  const maxPlatformPosts = Math.max(...platformBreakdown.map(p => p.posts), 1)

  // Recent posts table
  const recentPosts = posts.slice(0, 10).map(p => {
    const reach = analytics.filter(a => a.post_id === p.id).reduce((s, a) => s + (a.reach || 0), 0)
    return {
      content: p.content.length > 50 ? p.content.slice(0, 50) + '…' : p.content,
      platform: (p.platforms || []).join(', ') || '—',
      status: p.status,
      date: new Date(p.published_at || p.scheduled_for || p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      reach,
    }
  })

  return (
    <div className="pp-analytics">

      {/* Header */}
      <div className="pp-analytics__header">
        <div>
          <h1 className="pp-analytics__title">{t('analytics.title')}</h1>
          <p className="pp-analytics__sub">{t('analytics.subtitle')}</p>
        </div>
        <div className="pp-date-filters">
          {DATE_FILTERS.map(f => (
            <button
              key={f.key}
              className={`pp-filter-tab ${dateFilter === f.key ? 'pp-filter-tab--active' : ''}`}
              onClick={() => setDateFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div className="pp-analytics__stats">
        {STATS.map(({ label, value, change, icon: Icon, color }) => (
          <div key={label} className="pp-stat-card pp-stat-card--analytics">
            <div className="pp-stat-card__top">
              <div className="pp-stat-card__icon" style={{ color }}><Icon size={18} strokeWidth={1.8} /></div>
              <div className={`pp-stat-card__change ${change > 0 ? 'pp--up' : change < 0 ? 'pp--down' : 'pp--neutral'}`}>
                {change > 0 ? <ArrowUp size={12} /> : change < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
                {change === 0 ? t('analytics.noData') : `${Math.abs(change)}%`}
              </div>
            </div>
            <div className="pp-stat-card__value">{loading ? '—' : value}</div>
            <div className="pp-stat-card__label">{label}</div>
          </div>
        ))}
      </div>

      {/* Chart + Platform breakdown */}
      <div className="pp-analytics__grid">

        <div className="pp-card pp-chart-card">
          <div className="pp-card__header">
            <h2 className="pp-card__title">{t('analytics.postsOverTime')}</h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`pp-filter-tab pp-filter-tab--sm ${chartTab === 'posts' ? 'pp-filter-tab--active' : ''}`}
                onClick={() => setChartTab('posts')}
              >{t('analytics.chart.posts')}</button>
              <button
                className={`pp-filter-tab pp-filter-tab--sm ${chartTab === 'reach' ? 'pp-filter-tab--active' : ''}`}
                onClick={() => setChartTab('reach')}
              >{t('analytics.chart.reach')}</button>
            </div>
          </div>

          <div className="pp-bar-chart">
            <div className="pp-bar-chart__bars">
              {chartData.map((val, i) => (
                <div key={i} className="pp-bar-chart__col">
                  <div className="pp-bar-chart__bar-wrap">
                    <div
                      className="pp-bar-chart__bar"
                      style={{ height: `${(val / maxChartVal) * 100}%` }}
                    />
                  </div>
                  <span className="pp-bar-chart__label">{DAYS[i]}</span>
                </div>
              ))}
            </div>
            {!hasChartData && !loading && (
              <div className="pp-chart-empty">
                <BarChart2 size={36} strokeWidth={1.2} />
                <p>{t('analytics.chart.emptyState')}</p>
              </div>
            )}
          </div>
        </div>

        <div className="pp-card">
          <div className="pp-card__header">
            <h2 className="pp-card__title">{t('analytics.byPlatform')}</h2>
          </div>
          <div className="pp-platform-breakdown">
            {platformBreakdown.map(({ id, name, icon, color, posts: postCount }) => (
              <div key={id} className="pp-breakdown-row">
                <div className="pp-breakdown-row__left">
                  <div className="pp-platform-row__icon" style={{ background: color + '18', color }}>{icon}</div>
                  <span className="pp-breakdown-row__name">{name}</span>
                </div>
                <div className="pp-breakdown-row__bar-wrap">
                  <div
                    className="pp-breakdown-row__bar"
                    style={{ width: `${postCount > 0 ? (postCount / maxPlatformPosts) * 100 : 0}%`, background: color }}
                  />
                </div>
                <span className="pp-breakdown-row__count">{postCount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent posts table */}
      <div className="pp-card">
        <div className="pp-card__header">
          <h2 className="pp-card__title">{t('analytics.recentPosts')}</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--pp-muted2)' }}>{activeFilterLabel}</span>
        </div>
        {loading ? (
          <p className="pp-card__desc">Loading...</p>
        ) : recentPosts.length === 0 ? (
          <div className="pp-empty" style={{ padding: '40px 20px' }}>
            <FileText size={36} strokeWidth={1.2} className="pp-empty__icon" />
            <p className="pp-empty__text">{t('analytics.noPostsInPeriod')}</p>
            <a href="/dashboard/new" className="pp-btn pp-btn--primary pp-btn--sm" style={{ marginTop: 8 }}>
              {t('analytics.createFirstPost')}
            </a>
          </div>
        ) : (
          <div className="pp-table-wrap">
          <table className="pp-table">
            <thead>
              <tr>
                <th>{t('analytics.table.content')}</th>
                <th>{t('analytics.table.platform')}</th>
                <th>{t('analytics.table.status')}</th>
                <th>{t('analytics.table.date')}</th>
                <th>{t('analytics.table.reach')}</th>
              </tr>
            </thead>
            <tbody>
              {recentPosts.map((post, i) => (
                <tr key={i}>
                  <td>{post.content}</td>
                  <td>{post.platform}</td>
                  <td>{post.status}</td>
                  <td>{post.date}</td>
                  <td>{post.reach.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

    </div>
  )
}
