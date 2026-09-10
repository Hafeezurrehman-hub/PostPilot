/**
 * Smart Scheduling — AI-powered best time to post.
 *
 * Historical engagement data se best posting times analyze karo.
 * Har platform ke liye alag best time hota hai.
 *
 * Algorithm:
 * 1. User ke past posts nikalo with published_at
 * 2. Unke engagement data se best hours/day nikalo
 * 3. Current best time suggest karo
 * 4. Agar data nahi hai to platform defaults use karo
 */

import { createClient } from "@supabase/supabase-js";

export interface TimeSlot {
  day: string;      // "Monday", "Tuesday", etc.
  hour: number;     // 0-23
  score: number;    // 0-100, higher = better
  label: string;    // "Mon 9:00 AM"
}

export interface SmartScheduleResult {
  bestTimes: TimeSlot[];
  nextBestSlot: TimeSlot;
  confidence: "low" | "medium" | "high";
  dataPoints: number;
}

// Platform-specific default best times (when no user data available)
const DEFAULT_TIMES: Record<string, TimeSlot[]> = {
  twitter: [
    { day: "Monday", hour: 8, score: 70, label: "Mon 8:00 AM" },
    { day: "Tuesday", hour: 10, score: 75, label: "Tue 10:00 AM" },
    { day: "Wednesday", hour: 12, score: 80, label: "Wed 12:00 PM" },
    { day: "Thursday", hour: 15, score: 72, label: "Thu 3:00 PM" },
    { day: "Friday", hour: 9, score: 68, label: "Fri 9:00 AM" },
  ],
  linkedin: [
    { day: "Tuesday", hour: 8, score: 85, label: "Tue 8:00 AM" },
    { day: "Wednesday", hour: 10, score: 82, label: "Wed 10:00 AM" },
    { day: "Thursday", hour: 9, score: 78, label: "Thu 9:00 AM" },
  ],
  facebook: [
    { day: "Monday", hour: 9, score: 72, label: "Mon 9:00 AM" },
    { day: "Wednesday", hour: 13, score: 75, label: "Wed 1:00 PM" },
    { day: "Friday", hour: 11, score: 70, label: "Fri 11:00 AM" },
  ],
  instagram: [
    { day: "Tuesday", hour: 11, score: 80, label: "Tue 11:00 AM" },
    { day: "Thursday", hour: 14, score: 78, label: "Thu 2:00 PM" },
    { day: "Saturday", hour: 10, score: 82, label: "Sat 10:00 AM" },
  ],
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Best posting times nikalo user ke historical data se.
 */
export async function getSmartSchedule(
  userId: string,
  platform: string,
  count: number = 5
): Promise<SmartScheduleResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // User ke published posts nikalo with analytics
  const { data: posts } = await supabase
    .from("posts")
    .select("id, published_at, platforms")
    .eq("user_id", userId)
    .eq("status", "published")
    .contains("platforms", [platform])
    .order("published_at", { ascending: false })
    .limit(100);

  if (!posts || posts.length < 3) {
    // Not enough data — use defaults
    const defaults = (DEFAULT_TIMES[platform] ?? DEFAULT_TIMES.twitter).slice(0, count);
    const now = new Date();
    const nextSlot = findNextSlot(defaults, now);

    return {
      bestTimes: defaults,
      nextBestSlot: nextSlot,
      confidence: "low",
      dataPoints: posts?.length ?? 0,
    };
  }

  // Analytics data nikalo
  const postIds = posts.map((p) => p.id);
  const { data: analytics } = await supabase
    .from("post_analytics")
    .select("post_id, impressions, engagements, likes, comments, shares")
    .in("post_id", postIds);

  // Engagement data combine karo
  const engagementBySlot = new Map<string, { totalEngagement: number; count: number }>();

  for (const post of posts) {
    if (!post.published_at) continue;
    const date = new Date(post.published_at);
    const day = DAYS[date.getDay()];
    const hour = date.getHours();
    const key = `${day}-${hour}`;

    const postAnalytics = (analytics ?? []).filter((a) => a.post_id === post.id);
    const totalEngagement = postAnalytics.reduce(
      (sum, a) => sum + (a.engagements ?? 0) + (a.likes ?? 0) + (a.comments ?? 0) + (a.shares ?? 0),
      0
    );

    const existing = engagementBySlot.get(key) ?? { totalEngagement: 0, count: 0 };
    engagementBySlot.set(key, {
      totalEngagement: existing.totalEngagement + totalEngagement,
      count: existing.count + 1,
    });
  }

  // Calculate average engagement per slot and score
  const slots: TimeSlot[] = [];
  let maxAvg = 0;

  for (const [key, data] of engagementBySlot) {
    const [day, hourStr] = key.split("-");
    const hour = parseInt(hourStr);
    const avg = data.totalEngagement / data.count;
    maxAvg = Math.max(maxAvg, avg);
    slots.push({ day, hour, score: 0, label: formatTimeLabel(day, hour) });
  }

  // Normalize scores to 0-100
  if (maxAvg > 0) {
    for (const slot of slots) {
      const avg = engagementBySlot.get(`${slot.day}-${slot.hour}`);
      slot.score = Math.round(((avg?.totalEngagement ?? 0) / (avg?.count ?? 1)) / maxAvg * 100);
    }
  }

  // Sort by score
  slots.sort((a, b) => b.score - a.score);
  const bestTimes = slots.slice(0, count);

  // Find next best slot
  const now = new Date();
  const nextBestSlot = findNextSlot(bestTimes, now);

  // Determine confidence based on data points
  let confidence: "low" | "medium" | "high" = "low";
  if (posts.length >= 20) confidence = "high";
  else if (posts.length >= 10) confidence = "medium";

  return {
    bestTimes,
    nextBestSlot,
    confidence,
    dataPoints: posts.length,
  };
}

/**
 * Agla best time slot nikalo (ab se baad ka).
 */
function findNextSlot(slots: TimeSlot[], now: Date): TimeSlot {
  const currentDay = DAYS[now.getDay()];
  const currentHour = now.getHours();

  // Check same day, later hours first
  for (const slot of slots) {
    if (slot.day === currentDay && slot.hour > currentHour) {
      return slot;
    }
  }

  // Next days
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() + daysAhead);
    const checkDay = DAYS[checkDate.getDay()];

    for (const slot of slots) {
      if (slot.day === checkDay) {
        return slot;
      }
    }
  }

  // Fallback
  return slots[0] ?? { day: currentDay, hour: 9, score: 50, label: "Tomorrow 9:00 AM" };
}

function formatTimeLabel(day: string, hour: number): string {
  const shortDay = day.slice(0, 3);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${shortDay} ${h}:00 ${ampm}`;
}

/**
 * Schedule date automatically set karo based on smart time.
 */
export async function getSmartScheduleDate(
  userId: string,
  platform: string
): Promise<Date> {
  const result = await getSmartSchedule(userId, platform, 5);
  const slot = result.nextBestSlot;

  const next = new Date();
  const targetDay = DAYS.indexOf(slot.day);
  const currentDay = next.getDay();

  let daysAhead = targetDay - currentDay;
  if (daysAhead < 0) daysAhead += 7;
  if (daysAhead === 0 && slot.hour <= next.getHours()) {
    daysAhead = 7;
  }

  next.setDate(next.getDate() + daysAhead);
  next.setHours(slot.hour, 0, 0, 0);

  return next;
}
