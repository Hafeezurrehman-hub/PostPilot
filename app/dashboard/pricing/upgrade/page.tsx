'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Copy, Upload, ArrowLeft, Shield, Clock, Zap } from 'lucide-react';

const PLANS = {
  pro:  { name: 'Pro',  price: 1500, label: 'Rs 1,500 / month', features: ['13 accounts', 'Unlimited posts', 'Full analytics', 'AI captions'] },
  team: { name: 'Team', price: 4000, label: 'Rs 4,000 / month', features: ['Everything in Pro', '5 team members', 'Brand voice', 'Social listening'] },
};

const PAYMENT_METHODS = [
  {
    id: 'jazzcash',
    label: 'JazzCash',
    color: '#FF6600',
    bg: 'rgba(255,102,0,0.08)',
    details: {
      accountTitle: 'Hafeez ur Rehman',
      accountNumber: '03075253269',
      instructions: 'Open JazzCash → Send Money → Mobile Account',
    },
  },
  {
    id: 'easypaisa',
    label: 'Easypaisa',
    color: '#00A651',
    bg: 'rgba(0,166,81,0.08)',
    details: {
      accountTitle: 'Hafeez ur Rehman',
      accountNumber: '03110528707',
      instructions: 'Open Easypaisa → Send Money → Mobile Account',
    },
  },
  {
    id: 'bank',
    label: 'Bank Transfer',
    color: '#6366F1',
    bg: 'rgba(99,102,241,0.08)',
    details: {
      accountTitle: 'Hafeez ur Rehman',
      bankName: 'Meezan Bank',
      accountNumber: '00300109755028',
      iban: '',
      instructions: 'Transfer via IBFT or Internet Banking',
    },
  },
];

export default function UpgradeRequestPage() {
  const searchParamsHook = useSearchParams();
  const defaultPlan = (searchParamsHook.get('plan') === 'team' ? 'team' : 'pro') as 'pro' | 'team';

  const [selectedPlan, setSelectedPlan]     = useState<'pro' | 'team'>(defaultPlan);
  const [selectedMethod, setSelectedMethod] = useState<string>('jazzcash');
  const [txnId, setTxnId]                   = useState('');
  const [file, setFile]                     = useState<File | null>(null);
  const [preview, setPreview]               = useState<string | null>(null);
  const [submitting, setSubmitting]         = useState(false);
  const [submitted, setSubmitted]           = useState(false);
  const [error, setError]                   = useState('');
  const [copied, setCopied]                 = useState<string | null>(null);

  // Coupon state
  const [couponCode, setCouponCode]         = useState('');
  const [couponStatus, setCouponStatus]     = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [couponMessage, setCouponMessage]   = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);
  const router  = useRouter();
  const supabase = createClient();

  const method = PAYMENT_METHODS.find((m) => m.id === selectedMethod)!;
  const plan   = PLANS[selectedPlan];

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError('Screenshot must be under 5MB'); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  }

  function handleCopy(value: string, key: string) {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponStatus('checking');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, planAmount: plan.price }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponStatus('valid');
        setCouponMessage(
          data.coupon.discount_type === 'percentage'
            ? `${data.coupon.discount_value}% off applied!`
            : `Rs ${data.coupon.discount_value} off applied!`
        );
        setDiscountAmount(data.discountAmount);
      } else {
        setCouponStatus('invalid');
        setCouponMessage(data.message || 'Invalid coupon code');
        setDiscountAmount(0);
      }
    } catch {
      setCouponStatus('invalid');
      setCouponMessage('Something went wrong, try again');
      setDiscountAmount(0);
    }
  }

  async function handleSubmit() {
    if (!txnId.trim()) { setError('Please enter your Transaction ID or reference number'); return; }
    if (!file)         { setError('Please upload your payment screenshot'); return; }
    setError('');
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please log in first');

      const ext  = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('payment-screenshots')
        .upload(path, file, { upsert: false });
      if (uploadErr) throw uploadErr;

      const { error: insertErr } = await supabase
        .from('upgrade_requests')
        .insert({
          user_id: user.id,
          user_email: user.email,
          plan_requested: selectedPlan,
          payment_method: selectedMethod,
          transaction_id: txnId.trim(),
          screenshot_url: path,
          amount_pkr: plan.price - discountAmount,
          coupon_code: couponStatus === 'valid' ? couponCode : null,
          status: 'pending',
        });
      if (insertErr) throw insertErr;
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── SUCCESS SCREEN ── */
  if (submitted) {
    return (
      <div className="ppu-success">
        <div className="ppu-success__glow" />
        <div className="ppu-success__icon">
          <Check size={36} strokeWidth={2.5} />
        </div>
        <h2>Request Submitted!</h2>
        <p>
          Your <strong>{plan.name}</strong> plan request has been received.
          We will verify your payment and activate your plan within 24 hours.
          You will receive an email confirmation once approved.
        </p>
        <div className="ppu-success__badges">
          <span><Clock size={13}/> Verified within 24 hours</span>
          <span><Shield size={13}/> Secure & safe</span>
        </div>
        <button className="pp-btn pp-btn--purple" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  /* ── MAIN PAGE ── */
  return (
    <div className="ppu-page">

      {/* ── TOP HEADER ── */}
      <div className="ppu-header">
        <button className="ppu-back" onClick={() => router.push('/dashboard/pricing')}>
          <ArrowLeft size={15} /> Back to Plans
        </button>
        <div className="ppu-header__text">
          <h1>Complete Your Upgrade</h1>
          <p>Pay via JazzCash, Easypaisa, or Bank — we'll activate your plan within 24 hours</p>
        </div>
        <div className="ppu-trust-row">
          <span><Shield size={13} /> Secure payment</span>
          <span><Clock  size={13} /> Activated within 24 hrs</span>
          <span><Zap    size={13} /> Instant access after approval</span>
        </div>
      </div>

      <div className="ppu-layout">

        {/* ── LEFT: STEPS ── */}
        <div className="ppu-steps">

          {/* STEP 1 */}
          <div className="ppu-card">
            <div className="ppu-step-head">
              <span className="ppu-step-num">1</span>
              <span className="ppu-step-title">Select Your Plan</span>
            </div>
            <div className="ppu-plan-grid">
              {(Object.entries(PLANS) as [string, typeof PLANS.pro][]).map(([key, p]) => (
                <button
                  key={key}
                  className={`ppu-plan-btn ${selectedPlan === key ? 'ppu-plan-btn--active' : ''}`}
                  onClick={() => setSelectedPlan(key as 'pro' | 'team')}
                >
                  <div className="ppu-plan-btn__top">
                    <span className="ppu-plan-btn__name">{p.name}</span>
                    {selectedPlan === key && (
                      <span className="ppu-plan-btn__badge"><Check size={10}/> Selected</span>
                    )}
                  </div>
                  <span className="ppu-plan-btn__price">{p.label}</span>
                  <ul className="ppu-plan-btn__features">
                    {p.features.map(f => <li key={f}><Check size={10}/>{f}</li>)}
                  </ul>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 2 */}
          <div className="ppu-card">
            <div className="ppu-step-head">
              <span className="ppu-step-num">2</span>
              <span className="ppu-step-title">Choose Payment Method</span>
            </div>

            <div className="ppu-method-row">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  className={`ppu-method-btn ${selectedMethod === m.id ? 'ppu-method-btn--active' : ''}`}
                  style={selectedMethod === m.id
                    ? { borderColor: m.color, background: m.bg, color: m.color }
                    : {}
                  }
                  onClick={() => setSelectedMethod(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="ppu-payment-box">
              <div className="ppu-payment-box__header" style={{ background: method.bg }}>
                <span style={{ color: method.color }}>●</span>
                <span>{method.details.instructions}</span>
              </div>

              <div className="ppu-payment-box__amount">
                <span>Total Amount Due</span>
                <strong style={{ color: 'var(--pp-indigo)' }}>Rs {(plan.price - discountAmount).toLocaleString()}</strong>
              </div>

              <div className="ppu-payment-box__fields">
                <CopyRow label="Account Title"  value={method.details.accountTitle}  id="title"  copied={copied} onCopy={handleCopy} />
                <CopyRow label="Account Number" value={method.details.accountNumber} id="number" copied={copied} onCopy={handleCopy} />
                {'bankName' in method.details && (
                  <CopyRow label="Bank Name" value={(method.details as any).bankName} id="bank" copied={copied} onCopy={handleCopy} />
                )}
                {'iban' in method.details && (method.details as any).iban && (
                  <CopyRow label="IBAN" value={(method.details as any).iban} id="iban" copied={copied} onCopy={handleCopy} />
                )}
              </div>
            </div>
          </div>

          {/* STEP 3 */}
          <div className="ppu-card">
            <div className="ppu-step-head">
              <span className="ppu-step-num">3</span>
              <span className="ppu-step-title">Submit Payment Proof</span>
            </div>

            <div className="ppu-field">
              <label className="ppu-label">
                Transaction ID / Reference Number
                <span className="ppu-label__req"> *</span>
              </label>
              <input
                type="text"
                className="ppu-input"
                placeholder="e.g. TXN123456789 or 16-digit reference number"
                value={txnId}
                onChange={(e) => setTxnId(e.target.value)}
              />
            </div>

            <div className="ppu-field">
              <label className="ppu-label">
                Payment Screenshot
                <span className="ppu-label__req"> *</span>
              </label>
              <div
                className={`ppu-dropzone ${preview ? 'ppu-dropzone--filled' : ''}`}
                onClick={() => fileRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} alt="Payment proof" className="ppu-dropzone__img" />
                ) : (
                  <div className="ppu-dropzone__inner">
                    <div className="ppu-dropzone__icon"><Upload size={22} strokeWidth={1.5} /></div>
                    <p>Click to upload or drag & drop</p>
                    <span>PNG, JPG — max 5MB</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
              {preview && (
                <button
                  className="ppu-remove-btn"
                  onClick={() => { setFile(null); setPreview(null); }}
                >
                  Remove screenshot
                </button>
              )}
            </div>

            {error && <div className="ppu-error">{error}</div>}

            <button
              className="pp-btn pp-btn--purple ppu-submit-btn"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <><span className="ppu-spinner" /> Submitting...</>
              ) : (
                <><Zap size={15} /> Submit Upgrade Request</>
              )}
            </button>

            <p className="ppu-note">
              Have questions? Email us at{' '}
              <a href="mailto:support@postpilot.pk">support@postpilot.pk</a>
            </p>
          </div>

        </div>

        {/* ── RIGHT: SUMMARY SIDEBAR ── */}
        <div className="ppu-sidebar">
          <div className="ppu-summary">
            <h3>Order Summary</h3>
            <div className="ppu-summary__plan">
              <span className="ppu-summary__plan-name">{plan.name} Plan</span>
              <span className="ppu-summary__plan-price">Rs {plan.price.toLocaleString()}</span>
            </div>
            <div className="ppu-summary__period">Billed monthly · cancel anytime</div>

            {/* Coupon section */}
            <div className="ppu-coupon">
              <div className="ppu-coupon__row">
                <input
                  type="text"
                  className="ppu-coupon__input"
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={couponStatus === 'valid'}
                />
                <button
                  className="ppu-coupon__btn"
                  onClick={handleApplyCoupon}
                  disabled={couponStatus === 'checking' || couponStatus === 'valid'}
                >
                  {couponStatus === 'checking' ? '...' : couponStatus === 'valid' ? 'Applied' : 'Apply'}
                </button>
              </div>
              {couponMessage && (
                <p className={couponStatus === 'valid' ? 'ppu-coupon__msg--ok' : 'ppu-coupon__msg--err'}>
                  {couponMessage}
                </p>
              )}
            </div>

            <div className="ppu-summary__divider" />

            {discountAmount > 0 && (
              <div className="ppu-summary__plan">
                <span className="ppu-summary__plan-name">Discount</span>
                <span style={{ color: 'var(--pp-green)' }}>−Rs {discountAmount.toLocaleString()}</span>
              </div>
            )}

            <div className="ppu-summary__total">
              <span>Total today</span>
              <strong>Rs {(plan.price - discountAmount).toLocaleString()}</strong>
            </div>
            <ul className="ppu-summary__features">
              {plan.features.map(f => (
                <li key={f}><Check size={13} className="ppu-summary__check" />{f}</li>
              ))}
            </ul>
          </div>

          <div className="ppu-howit">
            <h4>How it works</h4>
            <ol>
              <li><span>1</span> Pay via your preferred method</li>
              <li><span>2</span> Submit transaction ID + screenshot</li>
              <li><span>3</span> We verify within 24 hours</li>
              <li><span>4</span> Your plan activates automatically</li>
            </ol>
          </div>
        </div>

      </div>
    </div>
  );
}

function CopyRow({ label, value, id, copied, onCopy }: {
  label: string; value: string; id: string;
  copied: string | null; onCopy: (v: string, k: string) => void;
}) {
  return (
    <div className="ppu-copy-row">
      <span className="ppu-copy-row__label">{label}</span>
      <span className="ppu-copy-row__value">{value}</span>
      <button className="ppu-copy-row__btn" onClick={() => onCopy(value, id)} title="Copy">
        {copied === id
          ? <Check size={13} color="var(--pp-green)" />
          : <Copy  size={13} />
        }
      </button>
    </div>
  );
}
