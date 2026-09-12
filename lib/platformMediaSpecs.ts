export type MediaSpec = {
  label: string
  imageRecommended: string
  imageAspect: number // width / height
  imageMaxMB: number
  videoRecommended: string
  videoAspect: number
  videoMaxMB: number
  videoMaxSeconds: number
  note?: string
}

export const PLATFORM_MEDIA_SPECS: Record<string, MediaSpec> = {
  twitter: {
    label: 'Twitter / X',
    imageRecommended: '1200×675 (16:9)',
    imageAspect: 16 / 9,
    imageMaxMB: 5,
    videoRecommended: '1280×720 (16:9)',
    videoAspect: 16 / 9,
    videoMaxMB: 512,
    videoMaxSeconds: 140,
  },
  linkedin: {
    label: 'LinkedIn',
    imageRecommended: '1200×627 (1.91:1)',
    imageAspect: 1.91,
    imageMaxMB: 5,
    videoRecommended: '1280×720 (16:9)',
    videoAspect: 16 / 9,
    videoMaxMB: 5120,
    videoMaxSeconds: 600,
  },
  instagram: {
    label: 'Instagram',
    imageRecommended: '1080×1080 (1:1) or 1080×1350 (4:5)',
    imageAspect: 1,
    imageMaxMB: 8,
    videoRecommended: '1080×1920 (9:16, Reels)',
    videoAspect: 9 / 16,
    videoMaxMB: 250,
    videoMaxSeconds: 90,
    note: 'Square (1:1) or portrait (4:5) works best for feed posts.',
  },
  facebook: {
    label: 'Facebook',
    imageRecommended: '1200×630 (1.91:1)',
    imageAspect: 1.91,
    imageMaxMB: 10,
    videoRecommended: '1280×720 (16:9)',
    videoAspect: 16 / 9,
    videoMaxMB: 4096,
    videoMaxSeconds: 240,
  },
  tiktok: {
    label: 'TikTok',
    imageRecommended: '—',
    imageAspect: 9 / 16,
    imageMaxMB: 0,
    videoRecommended: '1080×1920 (9:16)',
    videoAspect: 9 / 16,
    videoMaxMB: 287,
    videoMaxSeconds: 600,
    note: 'TikTok is video-only — images aren\'t supported.',
  },
}

/**
 * Compare an uploaded media's aspect ratio against a platform's recommended
 * aspect ratio. Returns true if it's "close enough" (within ~12%).
 */
export function aspectMatches(actual: number, recommended: number, tolerance = 0.12): boolean {
  return Math.abs(actual - recommended) / recommended <= tolerance
}
