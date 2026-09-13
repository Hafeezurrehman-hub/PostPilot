'use client'

import { useState } from 'react'
import {
  BarChart2, TrendingUp, Users, FileText,
  ArrowUp, ArrowDown, Minus,
    Clock
} from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const PLATFORM_STATS = [
  { name: 'Twitter / X', icon: '𝕏', color: '#1D9BF0', posts: 0, reach: 0, engagement: 0 },
  { name: 'LinkedIn',    icon: 'in', color: '#0A66C2', posts: 0, reach: 0, engagement: 0 },
  { name: 'Instagram',   icon: '📸', color: '#E1306C', posts: 0, reach: 0, engagement: 0 },
  { name: 'Facebook',    icon: 'f',  color: '#1877F2', posts: 0, reach: 0, engagement: 0 },
  { name: 'TikTok',      icon: '♪',  color: '#FF0050', posts: 0, reach: 0, engagement: 0 },
  { name: 'YouTube',     icon: '▶',  color: '#FF0000', posts: 0, reach: 0, engagement: 0 },
]

const RECENT_POSTS: any[] = [
  // Empty for now — will populate from Supabase
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const CHART_DATA = [0, 0, 0, 0, 0, 0, 0]
const MAX_VAL = Math.max(...CHART_DATA, 1)

export default function AnalyticsPage() {
  const { t } = useLanguage()

  const DATE_FILTERS = [
    { key: 'last7', label: t('analytics.filter.last7') },
    { key: 'last30', label: t('analytics.filter.last30') },
    { key: 'last90', label: t('analytics.filter.last90') },
    { key: 'allTime', label: t('analytics.filter.allTime') },
  ]

  const STATS = [
    { label: t('analytics.stat.totalPosts'), value: '0', change: 0, icon: FileText, color: 'var(--pp-indigo)' },
    { label: t('analytics.stat.totalReach'), value: '0', change: 0, icon: TrendingUp, color: 'var(--pp-purple)' },
    { label: t('analytics.stat.platformsUsed'), value: '0', change: 0, icon: Users, color: 'var(--pp-green)' },
    { label: t('analytics.stat.scheduled'), value: '0', change: 0, icon: Clock, color: 'var(--pp-amber)' },
  ]

  const [dateFilter, setDateFilter] = useState('last7')
  const [chartTab, setChartTab] = useState<'posts' | 'reach'>('posts')

  const activeFilterLabel = DATE_FILTERS.find(f => f.key === dateFilter)?.label

  return (
    <div className="pp-analytics">

      {/* Header */}
      <div className="pp-analytics__header">
        <div>
          <h1 className="pp-analytics__title">{t('analytics.title')}</h1>
          <p className="pp-analytics__sub">{t('analytics.subtitle')}</p>
        </div>
        {/* Date filter */}
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
            <div className="pp-stat-card__value">{value}</div>
            <div className="pp-stat-card__label">{label}</div>
          </div>
        ))}
      </div>

      {/* Chart + Platform breakdown */}
      <div className="pp-analytics__grid">

        {/* Bar Chart */}
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

          {/* Chart */}
          <div className="pp-bar-chart">
            <div className="pp-bar-chart__bars">
              {CHART_DATA.map((val, i) => (
                <div key={i} className="pp-bar-chart__col">
                  <div className="pp-bar-chart__bar-wrap">
                    <div
                      className="pp-bar-chart__bar"
                      style={{ height: `${(val / MAX_VAL) * 100}%` }}
                    />
                  </div>
                  <span className="pp-bar-chart__label">{DAYS[i]}</span>
                </div>
              ))}
            </div>
            {/* Empty state overlay */}
            <div className="pp-chart-empty">
              <BarChart2 size={36} strokeWidth={1.2} />
              <p>{t('analytics.chart.emptyState')}</p>
            </div>
          </div>
        </div>

        {/* Platform breakdown */}
        <div className="pp-card">
          <div className="pp-card__header">
            <h2 className="pp-card__title">{t('analytics.byPlatform')}</h2>
          </div>
          <div className="pp-platform-breakdown">
            {PLATFORM_STATS.map(({ name, icon, color, posts }) => (
              <div key={name} className="pp-breakdown-row">
                <div className="pp-breakdown-row__left">
                  <div className="pp-platform-row__icon" style={{ background: color + '18', color }}>{icon}</div>
                  <span className="pp-breakdown-row__name">{name}</span>
                </div>
                <div className="pp-breakdown-row__bar-wrap">
                  <div
                    className="pp-breakdown-row__bar"
                    style={{ width: `${posts > 0 ? (posts / Math.max(...PLATFORM_STATS.map(p => p.posts), 1)) * 100 : 0}%`, background: color }}
                  />
                </div>
                <span className="pp-breakdown-row__count">{posts}</span>
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
        {RECENT_POSTS.length === 0 ? (
          <div className="pp-empty" style={{ padding: '40px 20px' }}>
            <FileText size={36} strokeWidth={1.2} className="pp-empty__icon" />
            <p className="pp-empty__text">{t('analytics.noPostsInPeriod')}</p>
            <a href="/dashboard/new" className="pp-btn pp-btn--primary pp-btn--sm" style={{ marginTop: 8 }}>
              {t('analytics.createFirstPost')}
            </a>
          </div>
        ) : (
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
              {RECENT_POSTS.map((post: any, i) => (
                <tr key={i}>
                  <td>{post.content}</td>
                  <td>{post.platform}</td>
                  <td>{post.status}</td>
                  <td>{post.date}</td>
                  <td>{post.reach}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
