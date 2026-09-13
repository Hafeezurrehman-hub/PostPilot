'use client'

import { useState } from 'react'
import { User, Bell, Palette, Shield, Trash2, Save, Eye, EyeOff, Sun, Moon, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function SettingsPage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab]   = useState('profile')
  const [showPass, setShowPass]     = useState(false)
  const [saving, setSaving]         = useState(false)

  const TABS = [
    { id: 'profile',       label: t('settings.tabs.profile'),       icon: User },
    { id: 'appearance',   label: t('settings.tabs.appearance'),    icon: Palette },
    { id: 'notifications',label: t('settings.tabs.notifications'), icon: Bell },
    { id: 'security',     label: t('settings.tabs.security'),      icon: Shield },
  ]

  // Profile state
  const [name, setName]             = useState('Hafeez ur Rehman')
  const [email, setEmail]           = useState('hafeez@example.com')
  const [bio, setBio]               = useState('Social media manager & developer')
  const [timezone, setTimezone]     = useState('Asia/Karachi')

  // Appearance
  const [theme, setTheme]           = useState<'dark'|'light'>('dark')
  const [accentColor, setAccent]    = useState('indigo')

  // Notifications
  const [notifs, setNotifs] = useState({
    publishSuccess: true,
    publishFail:    true,
    scheduled:      true,
    weeklyReport:   false,
    productUpdates: false,
  })

  // Security
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass]         = useState('')
  const [confirmPass, setConfirmPass] = useState('')

  const handleSaveProfile = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    toast.success('Profile updated!')
  }

  const handleThemeChange = (t: 'dark' | 'light') => {
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('pp-theme', t)
    toast.success(`${t === 'dark' ? '🌙 Dark' : '☀️ Light'} theme applied!`)
  }

  const handleSaveNotifs = () => {
    toast.success('Notification preferences saved!')
  }

  const handleChangePass = () => {
    if (!currentPass || !newPass || !confirmPass) {
      toast.error('Fill in all password fields!')
      return
    }
    if (newPass !== confirmPass) {
      toast.error('New passwords do not match!')
      return
    }
    if (newPass.length < 8) {
      toast.error('Password must be at least 8 characters!')
      return
    }
    toast.success('Password changed successfully!')
    setCurrentPass(''); setNewPass(''); setConfirmPass('')
  }

  const handleDeleteAccount = () => {
    toast.error('Contact support to delete your account.')
  }

  const ACCENTS = [
    { id: 'indigo', color: '#6366F1', label: 'Indigo' },
    { id: 'purple', color: '#8B5CF6', label: 'Purple' },
    { id: 'blue',   color: '#3B82F6', label: 'Blue' },
    { id: 'green',  color: '#10B981', label: 'Green' },
    { id: 'rose',   color: '#F43F5E', label: 'Rose' },
  ]

  const NOTIF_ITEMS = [
    { key: 'publishSuccess', label: t('settings.notifications.publishSuccess'), desc: t('settings.notifications.publishSuccessDesc') },
    { key: 'publishFail',    label: t('settings.notifications.publishFail'),    desc: t('settings.notifications.publishFailDesc') },
    { key: 'scheduled',      label: t('settings.notifications.scheduled'),      desc: t('settings.notifications.scheduledDesc') },
    { key: 'weeklyReport',   label: t('settings.notifications.weeklyReport'),   desc: t('settings.notifications.weeklyReportDesc') },
    { key: 'productUpdates', label: t('settings.notifications.productUpdates'), desc: t('settings.notifications.productUpdatesDesc') },
  ]

  return (
    <div className="pp-settings">

      {/* Header */}
      <div>
        <h1 className="pp-settings__title">{t('settings.title')}</h1>
        <p className="pp-settings__sub">{t('settings.subtitle')}</p>
      </div>

      <div className="pp-settings__layout">

        {/* Tab sidebar */}
        <div className="pp-settings__tabs">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`pp-settings__tab ${activeTab === id ? 'pp-settings__tab--active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={16} strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="pp-settings__content">

          {/* ── PROFILE ── */}
          {activeTab === 'profile' && (
            <div className="pp-settings__panel">
              <h2 className="pp-settings__panel-title">{t('settings.profile.title')}</h2>

              {/* Avatar */}
              <div className="pp-avatar-row">
                <div className="pp-avatar-lg">HA</div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t('settings.profile.photo')}</p>
                  <p style={{ color: 'var(--pp-muted2)', fontSize: '0.8rem', marginTop: 2 }}>
                    {t('settings.profile.photoDesc')}
                  </p>
                </div>
              </div>

              <div className="pp-form-grid">
                <div className="pp-form-group">
                  <label className="pp-label">{t('settings.profile.fullName')}</label>
                  <input className="pp-input" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="pp-form-group">
                  <label className="pp-label">{t('settings.profile.email')}</label>
                  <input className="pp-input" value={email} onChange={e => setEmail(e.target.value)} type="email" />
                </div>
                <div className="pp-form-group pp-form-group--full">
                  <label className="pp-label">{t('settings.profile.bio')}</label>
                  <textarea className="pp-input pp-textarea" value={bio} onChange={e => setBio(e.target.value)} />
                </div>
                <div className="pp-form-group">
                  <label className="pp-label">{t('settings.profile.timezone')}</label>
                  <select className="pp-input pp-select" value={timezone} onChange={e => setTimezone(e.target.value)}>
                    <option value="Asia/Karachi">Asia/Karachi (PKT +5:00)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  </select>
                </div>
              </div>

              <button className="pp-btn pp-btn--primary" onClick={handleSaveProfile} disabled={saving}>
                <Save size={15} />
                {saving ? t('settings.profile.saving') : t('settings.profile.saveChanges')}
              </button>
            </div>
          )}

          {/* ── APPEARANCE ── */}
          {activeTab === 'appearance' && (
            <div className="pp-settings__panel">
              <h2 className="pp-settings__panel-title">{t('settings.appearance.title')}</h2>

              {/* Theme */}
              <div className="pp-settings__section">
                <p className="pp-settings__section-label">{t('settings.appearance.theme')}</p>
                <div className="pp-theme-cards">
                  <button
                    className={`pp-theme-card ${theme === 'dark' ? 'pp-theme-card--active' : ''}`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    <div className="pp-theme-card__preview pp-theme-card__preview--dark">
                      <div className="pp-theme-card__bar" />
                      <div className="pp-theme-card__bar pp-theme-card__bar--short" />
                    </div>
                    <div className="pp-theme-card__label">
                      <Moon size={14} /> {t('settings.appearance.dark')}
                      {theme === 'dark' && <Check size={13} style={{ marginLeft: 'auto', color: 'var(--pp-indigo)' }} />}
                    </div>
                  </button>
                  <button
                    className={`pp-theme-card ${theme === 'light' ? 'pp-theme-card--active' : ''}`}
                    onClick={() => handleThemeChange('light')}
                  >
                    <div className="pp-theme-card__preview pp-theme-card__preview--light">
                      <div className="pp-theme-card__bar" />
                      <div className="pp-theme-card__bar pp-theme-card__bar--short" />
                    </div>
                    <div className="pp-theme-card__label">
                      <Sun size={14} /> {t('settings.appearance.light')}
                      {theme === 'light' && <Check size={13} style={{ marginLeft: 'auto', color: 'var(--pp-indigo)' }} />}
                    </div>
                  </button>
                </div>
              </div>

              {/* Accent color */}
              <div className="pp-settings__section">
                <p className="pp-settings__section-label">{t('settings.appearance.accentColor')}</p>
                <div className="pp-accent-colors">
                  {ACCENTS.map(({ id, color, label }) => (
                    <button
                      key={id}
                      className={`pp-accent-btn ${accentColor === id ? 'pp-accent-btn--active' : ''}`}
                      style={{ background: color }}
                      onClick={() => { setAccent(id); toast.success(`${label} accent selected!`) }}
                      title={label}
                    >
                      {accentColor === id && <Check size={14} color="#fff" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <div className="pp-settings__panel">
              <h2 className="pp-settings__panel-title">{t('settings.notifications.title')}</h2>
              <div className="pp-notif-list">
                {NOTIF_ITEMS.map(({ key, label, desc }) => (
                  <div key={key} className="pp-notif-row">
                    <div>
                      <p className="pp-notif-row__label">{label}</p>
                      <p className="pp-notif-row__desc">{desc}</p>
                    </div>
                    <button
                      className={`pp-toggle-switch ${notifs[key as keyof typeof notifs] ? 'pp-toggle-switch--on' : ''}`}
                      onClick={() => setNotifs(prev => ({ ...prev, [key]: !prev[key as keyof typeof notifs] }))}
                    >
                      <span className="pp-toggle-switch__thumb" />
                    </button>
                  </div>
                ))}
              </div>
              <button className="pp-btn pp-btn--primary" onClick={handleSaveNotifs}>
                <Save size={15} /> {t('settings.notifications.savePreferences')}
              </button>
            </div>
          )}

          {/* ── SECURITY ── */}
          {activeTab === 'security' && (
            <div className="pp-settings__panel">
              <h2 className="pp-settings__panel-title">{t('settings.security.title')}</h2>

              <div className="pp-settings__section">
                <p className="pp-settings__section-label">{t('settings.security.changePassword')}</p>
                <div className="pp-form-grid">
                  <div className="pp-form-group pp-form-group--full">
                    <label className="pp-label">{t('settings.security.currentPassword')}</label>
                    <div className="pp-input-wrap">
                      <input className="pp-input" type={showPass ? 'text' : 'password'} value={currentPass} onChange={e => setCurrentPass(e.target.value)} placeholder="••••••••" />
                      <button className="pp-input-eye" onClick={() => setShowPass(!showPass)}>
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div className="pp-form-group">
                    <label className="pp-label">{t('settings.security.newPassword')}</label>
                    <input className="pp-input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder={t('settings.security.newPasswordPlaceholder')} />
                  </div>
                  <div className="pp-form-group">
                    <label className="pp-label">{t('settings.security.confirmPassword')}</label>
                    <input className="pp-input" type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder={t('settings.security.confirmPasswordPlaceholder')} />
                  </div>
                </div>
                <button className="pp-btn pp-btn--primary" onClick={handleChangePass}>
                  <Shield size={15} /> {t('settings.security.updatePassword')}
                </button>
              </div>

              {/* Danger zone */}
              <div className="pp-danger-zone">
                <p className="pp-danger-zone__title">{t('settings.security.dangerZone')}</p>
                <p className="pp-danger-zone__desc">
                  {t('settings.security.dangerZoneDesc')}
                </p>
                <button className="pp-btn pp-btn--danger" onClick={handleDeleteAccount}>
                  <Trash2 size={15} /> {t('settings.security.deleteAccount')}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
