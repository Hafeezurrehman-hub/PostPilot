'use client'

import { useState } from 'react'
import { CheckCircle2, Plus, Trash2, ExternalLink, AlertCircle, Zap, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { PlatformIcon } from '@/components/PlatformIcon'

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
  { id: 'telegram', name: 'Telegram', icon: '✈', color: '#26A5E4', desc: 'Post to your Telegram channel or group via a bot.', authUrl: null, category: 'Messaging' },
]

const CATEGORIES = ['All', 'Social', 'Professional', 'Video', 'Community', 'Messaging', 'Business']

function TelegramConnectModal({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [botToken, setBotToken] = useState('')
  const [chatId, setChatId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      toast.error('Bot token aur Chat ID dono chahiye')
      return
    }
    setLoading(true)
    const tid = toast.loading('Verifying bot with Telegram...')
    try {
      const res = await fetch('/api/auth/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: botToken.trim(), chatId: chatId.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Connected as @${data.botUsername}`, { id: tid })
        onConnected()
        onClose()
      } else {
        toast.error(data.error || 'Could not connect Telegram bot', { id: tid })
      }
    } catch {
      toast.error('Network error', { id: tid })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pp-modal-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={e => e.stopPropagation()}>
        <div className="pp-modal__header">
          <h3 className="pp-modal__title">Connect Telegram</h3>
          <button className="pp-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="pp-modal__body">
          <p className="pp-modal__desc">
            Telegram OAuth use nahi karta — ek Bot Token aur Chat ID chahiye.
          </p>
          <ol className="pp-modal__steps">
            <li>Telegram pe <strong>@BotFather</strong> ko message karo, <code>/newbot</code> bhejo</li>
            <li>Jo token mile wo neeche paste karo</li>
            <li>Bot ko apne channel/group mein <strong>admin</strong> banao</li>
            <li>Channel ka Chat ID <strong>@userinfobot</strong> se nikalo</li>
          </ol>

          <div className="pp-form-group">
            <label className="pp-label">Bot Token</label>
            <input
              className="pp-input"
              placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
              value={botToken}
              onChange={e => setBotToken(e.target.value)}
            />
          </div>
          <div className="pp-form-group">
            <label className="pp-label">Chat ID</label>
            <input
              className="pp-input"
              placeholder="-1001234567890"
              value={chatId}
              onChange={e => setChatId(e.target.value)}
            />
          </div>
        </div>

        <div className="pp-modal__footer">
          <button className="pp-btn pp-btn--ghost pp-btn--sm" onClick={onClose}>Cancel</button>
          <button className="pp-btn pp-btn--primary pp-btn--sm" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  )
}

function WhatsAppRecipientsModal({ onClose }: { onClose: () => void }) {
  const [numbers, setNumbers] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    const recipients = numbers.split(/[\n,]+/).map(n => n.trim()).filter(Boolean)
    if (recipients.length === 0) {
      toast.error('Kam se kam ek number daalein')
      return
    }
    setLoading(true)
    const tid = toast.loading('Saving recipient list...')
    try {
      const res = await fetch('/api/auth/whatsapp/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`${data.count} recipients saved`, { id: tid })
        onClose()
      } else {
        toast.error(data.error || 'Could not save recipients', { id: tid })
      }
    } catch {
      toast.error('Network error', { id: tid })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pp-modal-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={e => e.stopPropagation()}>
        <div className="pp-modal__header">
          <h3 className="pp-modal__title">WhatsApp Broadcast List</h3>
          <button className="pp-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="pp-modal__body">
          <p className="pp-modal__desc">
            WhatsApp par koi official &quot;Status&quot; ya &quot;Channel&quot; posting API nahi hai abhi tak — yeh in numbers ko ek broadcast message bhejta hai jab bhi post publish ho.
          </p>
          <div className="pp-form-group">
            <label className="pp-label">Recipient Numbers (ek line ya comma se alag)</label>
            <textarea
              className="pp-input pp-textarea"
              placeholder={'923001234567\n923009876543'}
              value={numbers}
              onChange={e => setNumbers(e.target.value)}
              style={{ minHeight: 100 }}
            />
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--pp-muted)' }}>
            Country code ke sath, bina + ke (jaise 923001234567 for Pakistan).
          </p>
        </div>
        <div className="pp-modal__footer">
          <button className="pp-btn pp-btn--ghost pp-btn--sm" onClick={onClose}>Cancel</button>
          <button className="pp-btn pp-btn--primary pp-btn--sm" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save List'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ConnectPage() {
  const { t } = useLanguage()
  const [connected, setConnected] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [showTelegramModal, setShowTelegramModal] = useState(false)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)

  const filtered = activeCategory === 'All' ? PLATFORMS : PLATFORMS.filter(p => p.category === activeCategory)
  const connectedPlatforms = PLATFORMS.filter(p => connected.includes(p.id))
  const availablePlatforms = filtered.filter(p => !connected.includes(p.id))

  const handleConnect = (platform: typeof PLATFORMS[number]) => {
    if (platform.id === 'telegram') {
      setShowTelegramModal(true)
      return
    }
    toast.loading(`Redirecting to ${platform.name}...`, { duration: 1500 })
    window.location.href = platform.authUrl!
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
          <h1 className="pp-connect__title">{t('connect.title')}</h1>
          <p className="pp-connect__sub">{t('connect.subtitle')}</p>
        </div>
        <div className="pp-connect__badge">
          <Zap size={13} />
          {connected.length} / {PLATFORMS.length} {t('connect.connected')}
        </div>
      </div>

      {/* Connected */}
      {connectedPlatforms.length > 0 && (
        <div className="pp-section">
          <div className="pp-section__label"><CheckCircle2 size={14} /> {t('connect.connectedSection')}</div>
          <div className="pp-platform-grid">
            {connectedPlatforms.map(p => (
              <div key={p.id} className="pp-platform-card pp-platform-card--connected">
                <div className="pp-platform-card__top">
                  <PlatformIcon platform={p.id} size={36} />
                  <span className="pp-platform-card__status pp-platform-card__status--ok">● Connected</span>
                </div>
                <div className="pp-platform-card__name">{p.name}</div>
                <div className="pp-platform-card__desc">{p.desc}</div>
                <div className="pp-platform-card__actions">
                  {p.id === 'whatsapp' && (
                    <button className="pp-btn pp-btn--ghost pp-btn--sm" onClick={() => setShowWhatsAppModal(true)}>
                      Manage recipients
                    </button>
                  )}
                  <button className="pp-btn pp-btn--ghost pp-btn--sm" onClick={() => handleDisconnect(p.id, p.name)} disabled={disconnecting === p.id}>
                    <Trash2 size={13} />
                    {disconnecting === p.id ? t('connect.disconnecting') : t('connect.disconnect')}
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
            {t(`connect.category.${cat}`)}
          </button>
        ))}
      </div>

      {/* Available */}
      <div className="pp-section">
        {connectedPlatforms.length === 0 && (
          <div className="pp-connect__tip">
            <AlertCircle size={15} />
            {t('connect.tip')}
          </div>
        )}
        <div className="pp-platform-grid">
          {availablePlatforms.map(p => (
            <div key={p.id} className="pp-platform-card">
              <div className="pp-platform-card__top">
                <PlatformIcon platform={p.id} size={36} />
                <span className="pp-platform-card__category">{t(`connect.category.${p.category}`)}</span>
              </div>
              <div className="pp-platform-card__name">{p.name}</div>
              <div className="pp-platform-card__desc">{p.desc}</div>
              <div className="pp-platform-card__actions">
                <button className="pp-btn pp-btn--primary pp-btn--sm" onClick={() => handleConnect(p)}>
                  <Plus size={13} /> {t('connect.connect')}
                </button>
                {p.authUrl && <a href="#" className="pp-icon-btn" title="Learn more"><ExternalLink size={14} /></a>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showTelegramModal && (
        <TelegramConnectModal
          onClose={() => setShowTelegramModal(false)}
          onConnected={() => setConnected(prev => [...prev, 'telegram'])}
        />
      )}
      {showWhatsAppModal && (
        <WhatsAppRecipientsModal onClose={() => setShowWhatsAppModal(false)} />
      )}
    </div>
  )
}
