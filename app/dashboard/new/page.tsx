'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Zap, Image as ImageIcon, Link, Calendar, Clock, Send, Smile, X, AlertTriangle, CheckCircle2, Film } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { PLATFORM_MEDIA_SPECS, aspectMatches } from '@/lib/platformMediaSpecs'

const PLATFORMS = [
  { id: 'twitter',   label: 'Twitter / X', icon: '𝕏',  limit: 280 },
  { id: 'linkedin',  label: 'LinkedIn',    icon: 'in', limit: 3000 },
  { id: 'instagram', label: 'Instagram',   icon: '📸', limit: 2200 },
  { id: 'facebook',  label: 'Facebook',    icon: 'f',  limit: 63206 },
  { id: 'tiktok',    label: 'TikTok',      icon: '♪',  limit: 2200 },
]

type MediaState = {
  file: File
  previewUrl: string
  type: 'image' | 'video'
  width: number
  height: number
  sizeMB: number
}

export default function NewPostPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const editId = searchParams.get('edit')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selected, setSelected] = useState<string[]>(['twitter', 'linkedin'])
  const [content, setContent] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now')
  const [scheduledFor, setScheduledFor] = useState('')
  const [loadingPost, setLoadingPost] = useState(!!editId)
  const [media, setMedia] = useState<MediaState | null>(null)
  const [existingMediaUrl, setExistingMediaUrl] = useState<string | null>(null)

  const loadPost = useCallback(async (id: string) => {
    setLoadingPost(true)
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('content, platforms, status, scheduled_for, media_url')
        .eq('id', id)
        .single()

      if (error || !data) {
        toast.error('Could not load post to edit')
        setLoadingPost(false)
        return
      }

      setContent(data.content || '')
      setSelected(data.platforms || [])
      setExistingMediaUrl(data.media_url || null)
      if (data.status === 'scheduled' && data.scheduled_for) {
        setScheduleMode('schedule')
        setScheduledFor(new Date(data.scheduled_for).toISOString().slice(0, 16))
      } else {
        setScheduleMode('now')
      }
    } finally {
      setLoadingPost(false)
    }
  }, [supabase])

  useEffect(() => {
    if (editId) {
      loadPost(editId)
    }
  }, [editId, loadPost])

  // Clean up object URLs when media changes/unmounts
  useEffect(() => {
    return () => {
      if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl)
    }
  }, [media])

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const minLimit = Math.min(
    ...selected.map(id => PLATFORMS.find(p => p.id === id)?.limit ?? 9999)
  )
  const charCount = content.length
  const charClass =
    charCount > minLimit ? 'pp-char-danger'
    : charCount > minLimit * 0.85 ? 'pp-char-warn'
    : ''

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      toast.error('Please select an image or video file.')
      return
    }

    const sizeMB = file.size / (1024 * 1024)
    const previewUrl = URL.createObjectURL(file)

    if (isImage) {
      const img = new window.Image()
      img.onload = () => {
        setMedia({ file, previewUrl, type: 'image', width: img.naturalWidth, height: img.naturalHeight, sizeMB })
      }
      img.onerror = () => toast.error('Could not read image dimensions.')
      img.src = previewUrl
    } else {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        setMedia({ file, previewUrl, type: 'video', width: video.videoWidth, height: video.videoHeight, sizeMB })
      }
      video.onerror = () => toast.error('Could not read video metadata.')
      video.src = previewUrl
    }

    setExistingMediaUrl(null)
    e.target.value = ''
  }

  const removeMedia = () => {
    if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl)
    setMedia(null)
    setExistingMediaUrl(null)
  }

  const uploadMedia = async (): Promise<{ url: string; type: 'image' | 'video' } | null> => {
    if (!media) return null
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('You must be logged in to upload media.')
      return null
    }

    setUploadingMedia(true)
    try {
      const ext = media.file.name.split('.').pop() || (media.type === 'image' ? 'jpg' : 'mp4')
      const path = `${user.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(path, media.file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`)
        return null
      }

      const { data: publicUrlData } = supabase.storage.from('post-media').getPublicUrl(path)
      return { url: publicUrlData.publicUrl, type: media.type }
    } finally {
      setUploadingMedia(false)
    }
  }

  const handleAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe your post first!')
      return
    }
    const tid = toast.loading('AI is writing your caption...')
    try {
      const res = await fetch('/api/ai/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, platforms: selected }),
      })
      const data = await res.json()
      if (data.caption) {
        setContent(data.caption)
        toast.success('Caption generated!', { id: tid })
      } else {
        toast.error('Could not generate caption', { id: tid })
      }
    } catch {
      toast.error('AI service unavailable', { id: tid })
    }
  }

  const handleSaveDraft = () => {
    if (!content.trim()) {
      toast.error('Write something first!')
      return
    }
    toast.success('Draft saved!')
  }

  const handlePublish = async () => {
    if (!content.trim()) {
      toast.error('Post content cannot be empty!')
      return
    }
    if (selected.length === 0) {
      toast.error('Select at least one platform!')
      return
    }
    if (charCount > minLimit) {
      toast.error(`Post too long for ${PLATFORMS.find(p => p.limit === minLimit)?.label}!`)
      return
    }
    if (scheduleMode === 'schedule' && !scheduledFor) {
      toast.error('Pick a date and time to schedule!')
      return
    }

    setLoading(true)
    const tid = toast.loading(
      editId
        ? 'Updating your post...'
        : scheduleMode === 'now' ? 'Publishing your post...' : 'Scheduling your post...'
    )

    try {
      // Upload new media first (if any) so we have a URL to save with the post
      let mediaUrl = existingMediaUrl
      let mediaType: string | null = media?.type ?? null
      if (media) {
        const uploaded = await uploadMedia()
        if (!uploaded) {
          toast.error('Media upload failed — post not saved.', { id: tid })
          setLoading(false)
          return
        }
        mediaUrl = uploaded.url
        mediaType = uploaded.type
      }

      if (editId) {
        const res = await fetch(`/api/posts/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            platforms: selected,
            status: scheduleMode === 'now' ? 'published' : 'scheduled',
            scheduled_for: scheduleMode === 'schedule' ? new Date(scheduledFor).toISOString() : null,
            media_url: mediaUrl,
            media_type: mediaType,
          }),
        })

        if (res.ok) {
          toast.success('✅ Post updated!', { id: tid })
          setContent('')
          setAiPrompt('')
          router.push('/dashboard')
        } else {
          const data = await res.json().catch(() => ({} as { error?: string }))
          toast.error(data.error || 'Failed to update post.', { id: tid })
        }
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          toast.error('You must be logged in to post.', { id: tid })
          setLoading(false)
          return
        }

        const { data: newPost, error: insertError } = await supabase
          .from('posts')
          .insert({
            user_id: user.id,
            content,
            platforms: selected,
            status: scheduleMode === 'schedule' ? 'scheduled' : 'draft',
            scheduled_for: scheduleMode === 'schedule' ? new Date(scheduledFor).toISOString() : null,
            media_url: mediaUrl,
            media_type: mediaType,
          })
          .select('id')
          .single()

        if (insertError || !newPost) {
          toast.error(insertError?.message || 'Failed to save post.', { id: tid })
          setLoading(false)
          return
        }

        if (scheduleMode === 'now') {
          const res = await fetch('/api/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: newPost.id }),
          })
          const data = await res.json().catch(() => ({} as { success?: boolean; message?: string; error?: string }))

          if (res.ok && data.success) {
            setContent('')
            setAiPrompt('')
            removeMedia()
            toast.success(data.message || '🚀 Published successfully!', { id: tid })
          } else {
            toast.error(data.message || data.error || 'Failed to publish. Connect a platform first.', { id: tid })
          }
        } else {
          setContent('')
          setAiPrompt('')
          removeMedia()
          toast.success('🕐 Post scheduled!', { id: tid })
        }
      }
    } catch {
      toast.error('Network error. Check connection.', { id: tid })
    } finally {
      setLoading(false)
    }
  }

  if (loadingPost) {
    return (
      <div className="pp-composer">
        <p style={{ color: 'var(--pp-muted2)', padding: '2rem' }}>Loading post...</p>
      </div>
    )
  }

  const activeMediaUrl = media?.previewUrl || existingMediaUrl
  const activeMediaType = media?.type || (existingMediaUrl ? 'image' : null) // best-effort for existing posts

  return (
    <div className="pp-composer">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <div className="pp-composer__header">
        <div>
          <h1 className="pp-composer__title">{editId ? 'Edit Post' : 'New Post'}</h1>
          <p style={{ color: 'var(--pp-muted2)', fontSize: '0.83rem', marginTop: 3 }}>
            {editId ? 'Update your post below' : 'Write once — publish everywhere'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!editId && (
            <button className="pp-btn pp-btn--ghost pp-btn--sm" onClick={handleSaveDraft}>
              Save Draft
            </button>
          )}
          <button
            className="pp-btn pp-btn--primary pp-btn--sm"
            onClick={handlePublish}
            disabled={loading || uploadingMedia}
          >
            <Send size={14} />
            {uploadingMedia ? 'Uploading media...' : editId ? 'Update' : scheduleMode === 'now' ? 'Publish Now' : 'Schedule'}
          </button>
        </div>
      </div>

      {/* Platform toggles */}
      <div className="pp-platform-toggles">
        {PLATFORMS.map(({ id, label, icon }) => (
          <button
            key={id}
            className={`pp-toggle ${selected.includes(id) ? 'pp-toggle--active' : ''}`}
            onClick={() => toggle(id)}
          >
            <span>{icon}</span>
            {label}
            {selected.includes(id) && <span className="pp-toggle__dot" />}
          </button>
        ))}
      </div>

      <div className="pp-composer__body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* AI bar */}
          <div className="pp-ai-bar">
            <span className="pp-ai-bar__label"><Zap size={13} /> AI</span>
            <input
              className="pp-ai-bar__input"
              placeholder="Describe your post — AI writes the caption..."
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAI()}
            />
            <button className="pp-btn pp-btn--purple pp-btn--sm" onClick={handleAI} disabled={loading}>
              Generate
            </button>
          </div>

          {/* Compose box */}
          <div className="pp-compose-box">
            <div className="pp-compose-box__label">Your post</div>
            <textarea
              placeholder="What's on your mind? Write your post here..."
              value={content}
              onChange={e => setContent(e.target.value)}
            />

            {/* Media preview */}
            {activeMediaUrl && (
              <div className="pp-media-preview">
                {activeMediaType === 'video' ? (
                  <video src={activeMediaUrl} controls className="pp-media-preview__media" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeMediaUrl} alt="Upload preview" className="pp-media-preview__media" />
                )}
                <button className="pp-media-preview__remove" onClick={removeMedia} title="Remove media">
                  <X size={14} />
                </button>
                {media && (
                  <div className="pp-media-preview__meta">
                    {media.width}×{media.height} · {media.sizeMB.toFixed(1)} MB
                  </div>
                )}
              </div>
            )}

            <div className="pp-compose-box__footer">
              <div className="pp-compose-box__actions">
                <button className="pp-icon-btn" title="Add image or video" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon size={15} />
                </button>
                <button className="pp-icon-btn" title="Add link"><Link size={15} /></button>
                <button className="pp-icon-btn" title="Add emoji"><Smile size={15} /></button>
              </div>
              <span className={`pp-compose-box__count ${charClass}`}>
                {charCount} / {selected.length > 0 ? minLimit : '—'}
              </span>
            </div>
          </div>

          {content && (
            <div className="pp-card">
              <div style={{ fontSize: '0.8rem', color: 'var(--pp-muted2)', marginBottom: 10 }}>Preview</div>
              <div className="pp-preview">{content}</div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="pp-compose-side">
          <div className="pp-side-card">
            <div className="pp-side-card__title">Publish</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="pp-schedule-row"
                style={{ border: scheduleMode === 'now' ? '1px solid var(--pp-indigo)' : '', color: scheduleMode === 'now' ? 'var(--pp-indigo)' : '' }}
                onClick={() => setScheduleMode('now')}
              >
                <Send size={14} /> Publish now
              </button>
              <button
                className="pp-schedule-row"
                style={{ border: scheduleMode === 'schedule' ? '1px solid var(--pp-indigo)' : '', color: scheduleMode === 'schedule' ? 'var(--pp-indigo)' : '' }}
                onClick={() => setScheduleMode('schedule')}
              >
                <Calendar size={14} /> Schedule
              </button>
              {scheduleMode === 'schedule' && (
                <input
                  type="datetime-local"
                  className="pp-input"
                  style={{ marginTop: 4 }}
                  value={scheduledFor}
                  onChange={e => setScheduledFor(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="pp-side-card">
            <div className="pp-side-card__title">Posting to</div>
            {selected.length === 0 ? (
              <p style={{ color: 'var(--pp-muted)', fontSize: '0.82rem' }}>Select at least one platform.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selected.map(id => {
                  const p = PLATFORMS.find(p => p.id === id)!
                  return (
                    <div key={id} className="pp-platform-row" style={{ padding: '7px 10px' }}>
                      <div className="pp-platform-row__icon">{p.icon}</div>
                      <span className="pp-platform-row__name">{p.label}</span>
                      <span className="pp-platform-row__status pp-platform-row__status--connected">● Ready</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Media specs — recommended sizes + mismatch warnings */}
          {selected.length > 0 && (
            <div className="pp-side-card">
              <div className="pp-side-card__title">
                <Film size={11} style={{ display: 'inline', marginRight: 4 }} />
                Media size guide
              </div>
              <div className="pp-media-specs">
                {selected.map(id => {
                  const spec = PLATFORM_MEDIA_SPECS[id]
                  if (!spec) return null

                  const recommended = media?.type === 'video' ? spec.videoRecommended : spec.imageRecommended
                  const maxMB = media?.type === 'video' ? spec.videoMaxMB : spec.imageMaxMB
                  const recAspect = media?.type === 'video' ? spec.videoAspect : spec.imageAspect

                  let status: 'none' | 'ok' | 'warn' = 'none'
                  let warningText = ''

                  if (media) {
                    const actualAspect = media.width / media.height
                    const aspectOk = aspectMatches(actualAspect, recAspect)
                    const sizeOk = maxMB === 0 || media.sizeMB <= maxMB

                    if (id === 'tiktok' && media.type === 'image') {
                      status = 'warn'
                      warningText = "TikTok doesn't support image posts."
                    } else if (!aspectOk && !sizeOk) {
                      status = 'warn'
                      warningText = `Aspect ratio and file size don't match ${spec.label}'s recommendation.`
                    } else if (!aspectOk) {
                      status = 'warn'
                      warningText = `Aspect ratio may get cropped on ${spec.label}.`
                    } else if (!sizeOk) {
                      status = 'warn'
                      warningText = `File is larger than ${spec.label}'s ${maxMB}MB limit.`
                    } else {
                      status = 'ok'
                    }
                  }

                  return (
                    <div key={id} className="pp-media-spec-row">
                      <div className="pp-media-spec-row__top">
                        <span className="pp-media-spec-row__label">{spec.label}</span>
                        {status === 'ok' && <CheckCircle2 size={14} style={{ color: 'var(--pp-green)' }} />}
                        {status === 'warn' && <AlertTriangle size={14} style={{ color: 'var(--pp-amber)' }} />}
                      </div>
                      <div className="pp-media-spec-row__specs">
                        {recommended} · max {maxMB}MB
                      </div>
                      {status === 'warn' && (
                        <div className="pp-media-spec-row__warning">{warningText}</div>
                      )}
                    </div>
                  )
                })}
              </div>
              {!media && (
                <p style={{ fontSize: '0.75rem', color: 'var(--pp-muted)', marginTop: 8 }}>
                  Upload media to check it against these sizes.
                </p>
              )}
            </div>
          )}

          <div className="pp-side-card" style={{ borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.04)' }}>
            <div className="pp-side-card__title" style={{ color: 'var(--pp-amber)' }}>
              <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />Best time tip
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--pp-muted2)', lineHeight: 1.5 }}>
              Best engagement on Twitter: <strong style={{ color: 'var(--pp-text)' }}>9–11 AM</strong> and <strong style={{ color: 'var(--pp-text)' }}>6–8 PM</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
