'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ⚠️ Is page ka URL secret rakhein — /dashboard/admin/upgrades
// Sirf aap use karein. Future mein role-based guard lagayein.

type Request = {
  id: string;
  user_id: string;
  user_email: string;
  plan_requested: string;
  payment_method: string;
  transaction_id: string;
  screenshot_url: string;
  amount_pkr: number;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string;
  created_at: string;
};

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#22c55e',
  rejected: '#ef4444',
};

export default function AdminUpgradePanel() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actionNote, setActionNote] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => { fetchRequests(); }, [filter]);

  async function fetchRequests() {
    setLoading(true);
    let query = supabase
      .from('upgrade_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter !== 'all') query = query.eq('status', filter);

    const { data } = await query;
    setRequests(data || []);
    setLoading(false);
  }

  async function viewScreenshot(path: string) {
    const { data } = await supabase.storage
      .from('payment-screenshots')
      .createSignedUrl(path, 300); // 5 min
    if (data?.signedUrl) setScreenshotUrl(data.signedUrl);
  }

  async function handleAction(req: Request, action: 'approved' | 'rejected') {
    setProcessing(req.id);
    try {
      // 1. Update request status
      await supabase
        .from('upgrade_requests')
        .update({
          status: action,
          admin_note: actionNote[req.id] || '',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', req.id);

      // 2. Agar approve — user ka plan update karo
      if (action === 'approved') {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        await supabase
          .from('profiles')
          .update({
            plan: req.plan_requested,
            plan_expires_at: expiresAt.toISOString(),
          })
          .eq('id', req.user_id);
      }

      await fetchRequests();
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <h1>🔐 Upgrade Requests</h1>
        <div className="admin-filters">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'filter-btn--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="admin-empty">Koi {filter} request nahi hai</div>
      ) : (
        <div className="request-list">
          {requests.map((req) => (
            <div key={req.id} className="request-card">
              <div className="request-card__top">
                <div>
                  <span className="request-card__email">{req.user_email}</span>
                  <span
                    className="request-card__status"
                    style={{ background: STATUS_COLOR[req.status] }}
                  >
                    {req.status}
                  </span>
                </div>
                <span className="request-card__date">
                  {new Date(req.created_at).toLocaleDateString('ur-PK', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div className="request-card__details">
                <span>📦 Plan: <strong>{req.plan_requested.toUpperCase()}</strong></span>
                <span>💰 Amount: <strong>Rs {req.amount_pkr.toLocaleString()}</strong></span>
                <span>💳 Method: <strong>{req.payment_method}</strong></span>
                <span>🔖 TXN ID: <strong>{req.transaction_id}</strong></span>
              </div>

              <div className="request-card__actions">
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => viewScreenshot(req.screenshot_url)}
                >
                  📸 Screenshot Dekhein
                </button>

                {req.status === 'pending' && (
                  <>
                    <input
                      type="text"
                      placeholder="Note (optional)"
                      className="form-input form-input--sm"
                      value={actionNote[req.id] || ''}
                      onChange={(e) =>
                        setActionNote((p) => ({ ...p, [req.id]: e.target.value }))
                      }
                    />
                    <button
                      className="btn btn--success btn--sm"
                      disabled={processing === req.id}
                      onClick={() => handleAction(req, 'approved')}
                    >
                      ✅ Approve
                    </button>
                    <button
                      className="btn btn--danger btn--sm"
                      disabled={processing === req.id}
                      onClick={() => handleAction(req, 'rejected')}
                    >
                      ❌ Reject
                    </button>
                  </>
                )}

                {req.admin_note && (
                  <div className="request-card__note">Note: {req.admin_note}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Screenshot Lightbox */}
      {screenshotUrl && (
        <div className="lightbox" onClick={() => setScreenshotUrl(null)}>
          <div className="lightbox__inner" onClick={(e) => e.stopPropagation()}>
            <img src={screenshotUrl} alt="Payment proof" />
            <button className="lightbox__close" onClick={() => setScreenshotUrl(null)}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
