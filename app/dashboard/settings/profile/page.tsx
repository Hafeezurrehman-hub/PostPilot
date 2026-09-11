'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ProfileSettingsPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [changingPw, setChangingPw] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
      setFullName((data.user?.user_metadata?.full_name as string) ?? '')
    })
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    const toastId = toast.loading('Saving profile...')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      })
      if (error) throw error
      toast.success('Profile updated', { id: toastId })
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update profile', { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setChangingPw(true)
    const toastId = toast.loading('Updating password...')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Password updated', { id: toastId })
      setNewPassword('')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update password', { id: toastId })
    } finally {
      setChangingPw(false)
    }
  }

  return (
    <div className="pp-composer">
      <div className="pp-composer__header">
        <button
          onClick={() => router.push('/dashboard/settings')}
          className="pp-icon-btn"
          style={{ marginRight: 4 }}
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="pp-composer__title">Profile</h1>
      </div>

      <div className="pp-side-card" style={{ maxWidth: 480 }}>
        <div className="pp-side-card__title">Basic info</div>

        <label style={{ fontSize: '0.8rem', color: 'var(--pp-muted2)', display: 'block', marginBottom: 6 }}>
          Full name
        </label>
        <input
          className="pp-input"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your name"
          style={{ marginBottom: 14 }}
        />

        <label style={{ fontSize: '0.8rem', color: 'var(--pp-muted2)', display: 'block', marginBottom: 6 }}>
          Email
        </label>
        <input
          className="pp-input"
          value={email}
          disabled
          style={{ marginBottom: 14, opacity: 0.6, cursor: 'not-allowed' }}
        />

        <button className="pp-btn pp-btn--primary pp-btn--sm" onClick={saveProfile} disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      <div className="pp-side-card" style={{ maxWidth: 480, marginTop: 16 }}>
        <div className="pp-side-card__title">Change password</div>

        <label style={{ fontSize: '0.8rem', color: 'var(--pp-muted2)', display: 'block', marginBottom: 6 }}>
          New password
        </label>
        <input
          type="password"
          className="pp-input"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="At least 6 characters"
          style={{ marginBottom: 14 }}
        />

        <button className="pp-btn pp-btn--ghost pp-btn--sm" onClick={changePassword} disabled={changingPw}>
          {changingPw ? 'Updating...' : 'Update password'}
        </button>
      </div>
    </div>
  )
}
