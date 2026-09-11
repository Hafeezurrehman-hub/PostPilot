'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArrowLeft, ExternalLink, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function PrivacySecurityPage() {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSignOutEverywhere = async () => {
    const toastId = toast.loading('Signing out of all sessions...')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      if (error) throw error
      toast.success('Signed out everywhere', { id: toastId })
      router.push('/login')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to sign out', { id: toastId })
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    const toastId = toast.loading('Requesting account deletion...')
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to submit request')
      toast.success('Deletion request submitted', { id: toastId })
      setConfirmOpen(false)
    } catch (e: any) {
      toast.error(e.message ?? 'Something went wrong', { id: toastId })
    } finally {
      setDeleting(false)
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
        <h1 className="pp-composer__title">Privacy & Security</h1>
      </div>

      <div className="pp-side-card" style={{ maxWidth: 560 }}>
        <div className="pp-side-card__title">Policies</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link href="/privacy" className="pp-link" style={{ fontSize: '0.85rem' }}>
            Privacy Policy <ExternalLink size={13} />
          </Link>
          <Link href="/terms" className="pp-link" style={{ fontSize: '0.85rem' }}>
            Terms of Service <ExternalLink size={13} />
          </Link>
        </div>
      </div>

      <div className="pp-side-card" style={{ maxWidth: 560, marginTop: 16 }}>
        <div className="pp-side-card__title">Session security</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--pp-muted2)', marginBottom: 12 }}>
          Sign out of PostPilot on all devices where you're currently logged in.
        </p>
        <button className="pp-btn pp-btn--ghost pp-btn--sm" onClick={handleSignOutEverywhere}>
          Sign out everywhere
        </button>
      </div>

      <div
        className="pp-side-card"
        style={{ maxWidth: 560, marginTop: 16, borderColor: 'rgba(239,68,68,0.3)' }}
      >
        <div className="pp-side-card__title" style={{ color: 'var(--pp-red)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldAlert size={14} /> Danger zone
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--pp-muted2)', marginBottom: 12 }}>
          Permanently delete your account and all associated data. This cannot be undone.
        </p>

        {!confirmOpen ? (
          <button
            className="pp-btn pp-btn--ghost pp-btn--sm"
            style={{ color: 'var(--pp-red)', borderColor: 'rgba(239,68,68,0.4)' }}
            onClick={() => setConfirmOpen(true)}
          >
            Delete account
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--pp-text)' }}>Are you sure?</span>
            <button
              className="pp-btn pp-btn--primary pp-btn--sm"
              style={{ background: 'var(--pp-red)' }}
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? 'Submitting...' : 'Yes, delete'}
            </button>
            <button className="pp-btn pp-btn--ghost pp-btn--sm" onClick={() => setConfirmOpen(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
