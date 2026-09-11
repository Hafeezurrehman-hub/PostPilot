'use client'

import { useState } from 'react'
import { CheckCircle2, Plus, Trash2, ExternalLink, AlertCircle, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

const PLATFORMS = [
  { id: 'twitter', name: 'Twitter / X', icon: '𝕏', color: '#1D9BF0', desc: 'Share short updates, threads, and engage with your audience.', authUrl: '/api/auth/twitter/start', category: 'Social' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'in', color: '#0A66C2', desc: 'Reach professionals and grow your business network.', authUrl: '/api/auth/linkedin/start', category: 'Professional' },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: '#E1306C', desc: 'Share photos, reels, and stories with your followers.', authUrl: '/api/auth/facebook/start', category: 'Social' },
  { id: 'facebook', name: 'Facebook', icon: 'f', color: '#1877F2', desc: 'Post to pages, groups, and reach billions of users.', authUrl: '/api/auth/facebook/start', category: 'Social' },
  { id: 'tiktok', name: 'TikTok', icon: '♪', color: '#FF0050', desc: 'Post short videos and reach a younger audience.', authUrl: '/api/auth/tiktok/start', category: 'Video' },
  { id: 'youtube', name: 'YouTube', icon: '▶', color: '#FF0000', desc: 'Upload videos and manage your YouTube channel.', authUrl: '/api/auth/youtube/start', category: 'Video' },
  { id: 'pinterest', name: 'Pinterest', icon: '📌', color: '#E60023', desc: 'Pin ideas and drive traffic to your website.', authUrl: '/api/auth/pinterest/start', category: 'Social' },
  { id: 'reddit', name: 'Reddit', icon: '🤖', color: '#FF4500', desc: 'Post to subreddits and engage with communities.', authUrl: '/api/auth/reddit/start', category: 'Community' },
  { id: 'threads', name: 'Threads', icon: '@', color: '#000000', desc: "Meta's text-based social platform linked to Instagram.", authUrl: '/api/auth/threads/start', category: 'Social' },
  { id: 'bluesky', name: 'Bluesky', icon: '🦋', color: '#0085FF', desc: 'Decentralized social network — Twitter alternative.', authUrl: '/api/auth/bluesky/setup', category: 'Social' },
  { id: 'mastodon', name: 'Mastodon', icon: '🐘', color: '#6364FF', desc: 'Open-source federated social network.', authUrl: '/api/auth/mastodon/start', category: 'Community' },
  { id: 'whatsapp', name: 'WhatsApp Business', icon: '💬', color: '#25D366', desc: 'Send messages to your WhatsApp Business contacts.', authUrl: '/api/auth/whatsapp/start', category: 'Messaging' },
  { id: 'google-business', name: 'Google Business', icon: 'G', color: '#4285F4', desc: 'Post updates to your Google Business Profile.', authUrl: '/api/auth/google-business/start', category: 'Business' },
]

const CATEGORIES = ['All', 'Social', 'Professional', 'Video', 'Community', 'Messaging', 'Business']

export default function ConnectPage() {
  const [connected, setConnected] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const filtered = activeCategory === 'All' ? PLATFORMS : PLATFORMS.filter(p => p.category === activeCategory)
  const connectedPlatforms = PLATFORMS.filter(p => connected.includes(p.id))
  const availablePlatforms = filtered.filter(p => !connected.includes(p.id))

  const handleConnect = (authUrl: string, name: string) => {
    toast.loading(`Redirecting to ${name}...`, { duration: 1500 })
    window.location.href = authUrl
  }

  const handleDisconnect = async (id: string, name: string) => {
    setDisconnecting(id)
    const toastId = toast.loading(`Disconnecting ${name}...`)
    try {
      const res = await fetch('/api/auth/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: id }),
      })
      if (!res.ok) throw new Error('Failed')
      setConnected(prev => prev.filter(p => p !== id))
      toast.success(`${name} disconnected`, { id: toastId })
    } catch (e) {
      console.error(e)
      toast.error(`Failed to disconnect ${name}`, { id: toastId })
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <div className="pp-connect">
      {/* Header */}
      <div className="pp-connect__header">
        <div>
          <h1 className="pp-connect__title">Connected Accounts</h1>
          <p className="pp-connect__sub">Connect your social accounts to start posting everywhere at once.</p>
        </div>
        <div className="pp-connect__badge">
          <Zap size={13} />
          {connected.length} / {PLATFORMS.length} connected
        </div>
      </div>

      {/* Connected */}
      {connectedPlatforms.length > 0 && (
        <div className="pp-section">
          <div className="pp-section__label"><CheckCircle2 size={14} /> Connected</div>
          <div className="pp-platform-grid">
            {connectedPlatforms.map(p => (
              <div key={p.id} className="pp-platform-card pp-platform-card--connected">
                <div className="pp-platform-card__top">
                  <div className="pp-platform-card__icon" style={{ background: p.color + '22', color: p.color }}>{p.icon}</div>
                  <span className="pp-platform-card__status pp-platform-card__status--ok">● Connected</span>
                </div>
                <div className="pp-platform-card__name">{p.name}</div>
                <div className="pp-platform-card__desc">{p.desc}</div>
                <div className="pp-platform-card__actions">
                  <button className="pp-btn pp-btn--ghost pp-btn--sm" onClick={() => handleDisconnect(p.id, p.name)} disabled={disconnecting === p.id}>
                    <Trash2 size={13} />
                    {disconnecting === p.id ? 'Removing…' : 'Disconnect'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="pp-filter-tabs">
        {CATEGORIES.map(cat => (
          <button key={cat} className={`pp-filter-tab ${activeCategory === cat ? 'pp-filter-tab--active' : ''}`} onClick={() => setActiveCategory(cat)}>
            {cat}
          </button>
        ))}
      </div>

      {/* Available */}
      <div className="pp-section">
        {connectedPlatforms.length === 0 && (
          <div className="pp-connect__tip">
            <AlertCircle size={15} />
            Connect at least one platform to start publishing posts.
          </div>
        )}
        <div className="pp-platform-grid">
          {availablePlatforms.map(p => (
            <div key={p.id} className="pp-platform-card">
              <div className="pp-platform-card__top">
                <div className="pp-platform-card__icon" style={{ background: p.color + '18', color: p.color }}>{p.icon}</div>
                <span className="pp-platform-card__category">{p.category}</span>
              </div>
              <div className="pp-platform-card__name">{p.name}</div>
              <div className="pp-platform-card__desc">{p.desc}</div>
              <div className="pp-platform-card__actions">
                <button className="pp-btn pp-btn--primary pp-btn--sm" onClick={() => handleConnect(p.authUrl, p.name)}>
                  <Plus size={13} /> Connect
                </button>
                <a href="#" className="pp-icon-btn" title="Learn more"><ExternalLink size={14} /></a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
