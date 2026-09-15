/**
 * Best posting time — per platform.
 *
 * If the user has enough of their own published-post history (with
 * analytics), we compute the actual best hour from THEIR data (real,
 * not generic advice). Otherwise we fall back to widely-cited industry
 * benchmarks, clearly labeled as such so it's never presented as "real"
 * when it isn't.
 */

export type TimeRecommendation = {
  label: string          // e.g. "9–11 AM"
  source: 'your-data' | 'industry'
  sampleSize?: number     // how many of the user's own posts this is based on
}

// Widely-cited industry benchmarks (local time), used only as a fallback
// when the user doesn't have enough of their own data yet.
const INDUSTRY_BEST_TIMES: Record<string, string> = {
  twitter: '9–11 AM and 6–8 PM',
  linkedin: 'Tue–Thu, 10 AM–12 PM',
  instagram: '11 AM–1 PM and 7–9 PM',
  facebook: '1 PM–4 PM',
  tiktok: '6 PM–10 PM',
  youtube: '2 PM–4 PM',
  pinterest: '8 PM–11 PM',
  reddit: '6 AM–9 AM',
  threads: '11 AM–1 PM',
  bluesky: '9 AM–11 AM',
  mastodon: '10 AM–12 PM',
  telegram: '12 PM–2 PM and 6 PM–9 PM',
  whatsapp: '9 AM–11 AM and 7 PM–9 PM',
  'google-business': '10 AM–2 PM (business hours)',
  google_business: '10 AM–2 PM (business hours)',
}

const MIN_SAMPLE_SIZE = 5 // need at least this many of the user's own posts for a platform before trusting "real" data

function formatHourRange(hour: number): string {
  const start = new Date(2000, 0, 1, hour)
  const end = new Date(2000, 0, 1, hour + 1)
  const fmt = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', hour12: true })
  return `${fmt(start)}–${fmt(end)}`
}

/**
 * Computes the best posting hour for a platform from the user's own
 * published-post history. `rows` should be { publishedAt: string; reach: number }[]
 * for that specific platform only.
 */
export function computeBestTimeFromHistory(
  rows: { publishedAt: string; reach: number }[]
): TimeRecommendation | null {
  if (rows.length < MIN_SAMPLE_SIZE) return null

  const hourTotals = new Array(24).fill(0)
  const hourCounts = new Array(24).fill(0)

  for (const row of rows) {
    const hour = new Date(row.publishedAt).getHours()
    hourTotals[hour] += row.reach
    hourCounts[hour] += 1
  }

  let bestHour = -1
  let bestAvg = -1
  for (let h = 0; h < 24; h++) {
    if (hourCounts[h] === 0) continue
    const avg = hourTotals[h] / hourCounts[h]
    if (avg > bestAvg) {
      bestAvg = avg
      bestHour = h
    }
  }

  if (bestHour === -1) return null

  return {
    label: formatHourRange(bestHour),
    source: 'your-data',
    sampleSize: rows.length,
  }
}

/**
 * Gets the best-time recommendation for a platform — real data if there's
 * enough of it, otherwise the industry-benchmark fallback.
 */
export function getBestTimeRecommendation(
  platform: string,
  historyRows: { publishedAt: string; reach: number }[]
): TimeRecommendation {
  const fromData = computeBestTimeFromHistory(historyRows)
  if (fromData) return fromData

  return {
    label: INDUSTRY_BEST_TIMES[platform] || 'No data yet',
    source: 'industry',
  }
}
