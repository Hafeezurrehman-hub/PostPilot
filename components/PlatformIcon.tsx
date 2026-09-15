'use client'

/**
 * Renders each platform as its real "app icon" style — a rounded square in
 * the platform's official background (gradient for Instagram, solid brand
 * color for the rest) with a white glyph on top. This matches how these
 * brands actually present themselves (e.g. the Instagram home-screen icon)
 * rather than a flat single-color outline.
 */

import {
  SiX, SiInstagram, SiFacebook, SiTiktok, SiYoutube,
  SiPinterest, SiReddit, SiThreads, SiBluesky, SiMastodon, SiWhatsapp,
  SiTelegram, SiGoogle,
} from 'react-icons/si'
import { FaLinkedinIn } from 'react-icons/fa6'
import type { IconType } from 'react-icons'

type PlatformStyle = {
  Icon: IconType
  background: string // solid color or CSS gradient
  iconColor?: string // defaults to white
}

export const PLATFORM_STYLES: Record<string, PlatformStyle> = {
  twitter: {
    Icon: SiX,
    background: '#000000',
  },
  linkedin: {
    Icon: FaLinkedinIn,
    background: '#0A66C2',
  },
  instagram: {
    Icon: SiInstagram,
    background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
  },
  facebook: {
    Icon: SiFacebook,
    background: '#1877F2',
  },
  tiktok: {
    Icon: SiTiktok,
    background: 'linear-gradient(135deg, #25F4EE 0%, #000000 50%, #FE2C55 100%)',
  },
  youtube: {
    Icon: SiYoutube,
    background: '#FF0000',
  },
  pinterest: {
    Icon: SiPinterest,
    background: '#E60023',
  },
  reddit: {
    Icon: SiReddit,
    background: '#FF4500',
  },
  threads: {
    Icon: SiThreads,
    background: '#000000',
  },
  bluesky: {
    Icon: SiBluesky,
    background: '#0285FF',
  },
  mastodon: {
    Icon: SiMastodon,
    background: '#6364FF',
  },
  whatsapp: {
    Icon: SiWhatsapp,
    background: '#25D366',
  },
  'google-business': {
    Icon: SiGoogle,
    background: '#FFFFFF',
    iconColor: '#4285F4',
  },
  google_business: {
    Icon: SiGoogle,
    background: '#FFFFFF',
    iconColor: '#4285F4',
  },
  telegram: {
    Icon: SiTelegram,
    background: '#26A5E4',
  },
}

/**
 * A colored "app icon" style badge for a platform — use this in most places
 * (cards, toggles, sidebar rows).
 */
export function PlatformIcon({ platform, size = 32 }: { platform: string; size?: number }) {
  const style = PLATFORM_STYLES[platform]
  if (!style) return null
  const { Icon, background, iconColor } = style
  const isWhiteBg = background === '#FFFFFF'

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        border: isWhiteBg ? '1px solid var(--pp-border)' : 'none',
      }}
    >
      <Icon size={size * 0.55} color={iconColor || '#fff'} />
    </div>
  )
}
