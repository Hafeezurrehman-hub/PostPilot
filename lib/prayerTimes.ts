// Namaz-aware scheduling helper — uses the free Aladhan API to fetch prayer
// times for the user's current location and checks whether a chosen
// schedule time falls too close to one of them.

export type PrayerTimes = {
  Fajr: string
  Dhuhr: string
  Asr: string
  Maghrib: string
  Isha: string
}

const PRAYER_NAMES: (keyof PrayerTimes)[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

/**
 * Gets the browser's current position. Resolves to null if permission is
 * denied or geolocation isn't available — callers should treat that as
 * "skip namaz-aware checks" rather than an error.
 */
export function getUserLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 1000 * 60 * 60 } // cache browser-side for an hour
    )
  })
}

/**
 * Fetches prayer times for a given date + location from Aladhan's free API.
 * `date` should be a JS Date; only the date part is used (Aladhan wants DD-MM-YYYY).
 * Returns null on any failure so the caller can silently skip the feature.
 */
export async function fetchPrayerTimes(
  lat: number,
  lng: number,
  date: Date
): Promise<PrayerTimes | null> {
  try {
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = date.getFullYear()
    const dateStr = `${dd}-${mm}-${yyyy}`

    const res = await fetch(
      `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=1`
    )
    if (!res.ok) return null
    const data = await res.json()
    const timings = data?.data?.timings
    if (!timings) return null

    return {
      Fajr: timings.Fajr,
      Dhuhr: timings.Dhuhr,
      Asr: timings.Asr,
      Maghrib: timings.Maghrib,
      Isha: timings.Isha,
    }
  } catch {
    return null
  }
}

/**
 * Checks whether `scheduledDate` falls within `bufferMinutes` of any prayer
 * time on the same day. Returns the matching prayer name + how close it is,
 * or null if it's clear.
 */
export function checkNamazConflict(
  scheduledDate: Date,
  prayerTimes: PrayerTimes,
  bufferMinutes = 15
): { prayer: string; minutesAway: number } | null {
  const scheduledMinutes = scheduledDate.getHours() * 60 + scheduledDate.getMinutes()

  for (const name of PRAYER_NAMES) {
    const [h, m] = prayerTimes[name].split(':').map(Number)
    const prayerMinutes = h * 60 + m
    const diff = Math.abs(scheduledMinutes - prayerMinutes)
    if (diff <= bufferMinutes) {
      return { prayer: name, minutesAway: diff }
    }
  }
  return null
}

/**
 * Suggests the next clear time slot (in HH:MM, same day) that's at least
 * `bufferMinutes` away from every prayer time, searching forward from
 * `fromDate` in 5-minute steps up to 4 hours ahead.
 */
export function suggestClearTime(
  fromDate: Date,
  prayerTimes: PrayerTimes,
  bufferMinutes = 15
): Date | null {
  const candidate = new Date(fromDate)
  for (let i = 0; i < 48; i++) { // up to 4 hours in 5-min steps
    candidate.setMinutes(candidate.getMinutes() + 5)
    if (!checkNamazConflict(candidate, prayerTimes, bufferMinutes)) {
      return candidate
    }
  }
  return null
}
