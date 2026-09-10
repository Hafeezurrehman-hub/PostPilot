/**
 * Recurring Posts — Schedule repeats (daily/weekly/monthly).
 *
 * Recurring posts ek template hota hai jo baar baar publish hota hai
 * set frequency ke hisaab se. Cron scheduler inko detect karke publish karta hai.
 *
 * Flow:
 * 1. User recurring post create karta hai (content + frequency + interval)
 * 2. next_run_at set hota hai
 * 3. Cron scheduler check karta hai: kya koi recurring post due hai?
 * 4. Due hone pe: naya post create + publish + next_run_at update
 */

import { createClient } from "@supabase/supabase-js";

export interface RecurringPost {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  platforms: string[];
  frequency: "daily" | "weekly" | "monthly";
  interval_count: number;
  days_of_week: number[] | null;
  day_of_month: number | null;
  next_run_at: string;
  last_run_at: string | null;
  is_active: boolean;
}

/**
 * Check karo ki kaab recurring posts due hain, unhe publish karo,
 * aur next_run_at update karo.
 */
export async function processRecurringPosts(): Promise<{
  processed: number;
  published: number;
  failed: number;
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date().toISOString();

  // Sabhi active recurring posts nikalo jo due hain
  const { data: duePosts, error } = await supabase
    .from("recurring_posts")
    .select("*")
    .eq("is_active", true)
    .lte("next_run_at", now);

  if (error || !duePosts || duePosts.length === 0) {
    return { processed: 0, published: 0, failed: 0 };
  }

  console.log(`Recurring: Found ${duePosts.length} due recurring post(s)`);

  let published = 0;
  let failed = 0;

  for (const recurring of duePosts) {
    try {
      // Naya post create karo
      const { data: newPost, error: insertErr } = await supabase
        .from("posts")
        .insert({
          user_id: recurring.user_id,
          content: recurring.content,
          media_url: recurring.media_url,
          platforms: recurring.platforms,
          status: "draft",
        })
        .select("id")
        .single();

      if (insertErr || !newPost) {
        console.error(`Recurring: Failed to create post for ${recurring.id}`);
        failed++;
        continue;
      }

      // Publish karo
      const { publishPost } = await import("@/lib/publish/publish-post");
      const outcomes = await publishPost(newPost.id);
      const anySuccess = outcomes.some((o) => o.status === "success");

      if (anySuccess) {
        published++;
      } else {
        failed++;
      }

      // Next run calculate karo
      const nextRun = calculateNextRun(recurring as RecurringPost);

      // Update recurring post
      await supabase
        .from("recurring_posts")
        .update({
          next_run_at: nextRun.toISOString(),
          last_run_at: now,
        })
        .eq("id", recurring.id);

      console.log(
        `Recurring: Processed ${recurring.id} — next run: ${nextRun.toISOString()}`
      );
    } catch (err) {
      console.error(`Recurring: Error processing ${recurring.id}:`, err);
      failed++;
    }
  }

  return { processed: duePosts.length, published, failed };
}

/**
 * Next run date calculate karo based on frequency and interval.
 */
function calculateNextRun(post: RecurringPost): Date {
  const current = new Date(post.next_run_at);
  const next = new Date(current);

  switch (post.frequency) {
    case "daily":
      next.setDate(next.getDate() + post.interval_count);
      break;

    case "weekly": {
      if (post.days_of_week && post.days_of_week.length > 0) {
        // Find next matching day of week
        const currentDay = current.getDay();
        const sortedDays = [...post.days_of_week].sort((a, b) => a - b);

        // Check remaining days in current week
        for (const day of sortedDays) {
          if (day > currentDay) {
            next.setDate(current.getDate() + (day - currentDay));
            return next;
          }
        }
        // Wrap to next week
        const daysUntilNextWeek = 7 - currentDay + sortedDays[0];
        next.setDate(current.getDate() + daysUntilNextWeek);
      } else {
        next.setDate(next.getDate() + 7 * post.interval_count);
      }
      break;
    }

    case "monthly": {
      if (post.day_of_month) {
        next.setMonth(next.getMonth() + post.interval_count);
        next.setDate(Math.min(post.day_of_month, getLastDayOfMonth(next)));
      } else {
        next.setMonth(next.getMonth() + post.interval_count);
      }
      break;
    }
  }

  return next;
}

function getLastDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
