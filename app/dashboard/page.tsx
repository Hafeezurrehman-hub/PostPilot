'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  PenSquare, Users, BarChart2, Zap, ArrowRight,
  Clock, CheckCircle2, AlertCircle, Trash2, Pencil,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import OnboardingBanner from '@/components/OnboardingBanner'

type Post = {
  id: string
  content: string
  platforms: string[]
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  scheduled_for: string | null
  published_at: string | null
  created_at: string
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusBadgeClass(status: Post['status']) {
  switch (status) {
    case 'published': return 'pp-badge pp-badge--green'
    case 'scheduled': return 'pp-badge pp-badge--indigo'
    case 'failed': return 'pp-badge pp-badge--red'
    default: return 'pp-badge pp-badge--gray'
  }
}

export default function DashboardPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<Post[]>([])
  const [connectedCount, setConnectedCount] = useState(0)
  const [totalReach, setTotalReach] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (isMounted) setLoading(false)
        return
      }

      const [{ data: postsData }, { count: connectionsCount }] = await Promise.all([
        supabase
          .from('posts')
          .select('id, content, platforms, status, scheduled_for, published_at, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('platform_connections')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ])

      if (!isMounted) return

      const fetchedPosts = (postsData as Post[]) || []
      setPosts(fetchedPosts)
      setConnectedCount(connectionsCount || 0)

      // Sum reach across this user's posts (best-effort; ok if analytics table is empty)
      const postIds = fetchedPosts.map(p => p.id)
      if (postIds.length > 0) {
        const { data: analyticsData } = await supabase
          .from('post_analytics')
          .select('reach')
          .in('post_id', postIds)
        if (isMounted) {
          if (analyticsData && analyticsData.length > 0) {
            const sum = analyticsData.reduce((acc, row: { reach: number | null }) => acc + (row.reach || 0), 0)
            setTotalReach(sum)
          } else {
            setTotalReach(null)
          }
        }
      } else {
        setTotalReach(null)
      }

      setLoading(false)
    }

    load()
    return () => { isMounted = false }
  }, [supabase])

  const publishedCount = posts.filter(p => p.status === 'published').length
  const scheduledCount = posts.filter(p => p.status === 'scheduled').length

  const stats = [
    { label: 'Posts Published', value: String(publishedCount), icon: CheckCircle2, color: 'var(--pp-green)' },
    { label: 'Scheduled', value: String(scheduledCount), icon: Clock, color: 'var(--pp-indigo)' },
    { label: 'Connected Accounts', value: String(connectedCount), icon: Users, color: 'var(--pp-purple)' },
    { label: 'Total Reach', value: totalReach !== null ? totalReach.toLocaleString() : '—', icon: BarChart2, color: 'var(--pp-amber)' },
  ]

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const toastId = toast.loading('Deleting post...')
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id)
      if (error) throw error
      setPosts(prev => prev.filter(p => p.id !== id))
      toast.success('Post deleted', { id: toastId })
    } catch (e) {
      console.error(e)
      toast.error('Failed to delete post', { id: toastId })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="pp-dashboard">

      <OnboardingBanner />

      {/* Welcome */}
      <div className="pp-welcome">
        <div>
          <h1 className="pp-welcome__heading">Good evening 👋</h1>
          <p className="pp-welcome__sub">
            You have {scheduledCount} post{scheduledCount === 1 ? '' : 's'} scheduled. Ready to create?
          </p>
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

        {/* Posts List */}
        <div className="pp-card">
          <div className="pp-card__header">
            <h2 className="pp-card__title">Your Posts</h2>
            <Link href="/dashboard/new" className="pp-link">
              New Post <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <p className="pp-card__desc">Loading posts...</p>
          ) : posts.length === 0 ? (
            <div className="pp-empty">
              <AlertCircle size={32} strokeWidth={1.4} className="pp-empty__icon" />
              <p className="pp-empty__text">No posts yet</p>
              <Link href="/dashboard/new" className="pp-link pp-link--centered">
                Create your first post →
              </Link>
            </div>
          ) : (
            <div className="pp-post-list">
              {posts.map(post => (
                <div key={post.id} className="pp-post-row">
                  <div className="pp-post-row__main">
                    <span className={statusBadgeClass(post.status)}>{post.status}</span>
                    <p className="pp-post-row__content">
                      {post.content.length > 80 ? post.content.slice(0, 80) + '…' : post.content}
                    </p>
                    <div className="pp-post-row__meta">
                      <span>{post.platforms.join(', ') || 'No platforms'}</span>
                      <span>·</span>
                      <span>
                        {post.status === 'published'
                          ? formatDate(post.published_at)
                          : post.status === 'scheduled'
                            ? formatDate(post.scheduled_for)
                            : formatDate(post.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="pp-post-row__actions">
                    <Link href={`/dashboard/new?edit=${post.id}`} className="pp-icon-btn" title="Edit">
                      <Pencil size={15} />
                    </Link>
                    <button
                      className="pp-icon-btn pp-icon-btn--danger"
                      title="Delete"
                      disabled={deletingId === post.id}
                      onClick={() => handleDelete(post.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions + connect platforms */}
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

          {/* Connect platforms shortcut */}
          <div className="pp-card">
            <div className="pp-card__header">
              <h2 className="pp-card__title">Accounts</h2>
              <Link href="/dashboard/connect" className="pp-link">
                Manage <ArrowRight size={14} />
              </Link>
            </div>
            <p className="pp-card__desc">
              {connectedCount === 0
                ? 'No accounts connected yet.'
                : `${connectedCount} account${connectedCount === 1 ? '' : 's'} connected.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
