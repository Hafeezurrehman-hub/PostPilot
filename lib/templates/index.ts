/**
 * Post Templates — Reusable post templates save karo.
 *
 * Templates me variables ho sakte hain: {{title}}, {{url}}, {{date}}, etc.
 * User template select kare to variables auto-fill ho jayein.
 */

import { createClient } from "@supabase/supabase-js";

export interface PostTemplate {
  id: string;
  user_id: string;
  name: string;
  content: string;
  platforms: string[];
  category: "announcement" | "promo" | "engagement" | "educational" | "custom";
  variables: string[];  // Detected from {{...}} in content
  created_at: string;
}

/**
 * Template save karo.
 */
export async function saveTemplate(
  userId: string,
  template: Omit<PostTemplate, "id" | "user_id" | "created_at" | "variables">
): Promise<PostTemplate> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Auto-detect variables from content
  const variables = detectVariables(template.content);

  const { data, error } = await supabase
    .from("post_templates")
    .insert({
      user_id: userId,
      ...template,
      variables,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PostTemplate;
}

/**
 * User ki templates nikalo.
 */
export async function getTemplates(userId: string): Promise<PostTemplate[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("post_templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PostTemplate[];
}

/**
 * Template delete karo.
 */
export async function deleteTemplate(id: string, userId: string): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase
    .from("post_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
}

/**
 * Template me variables fill karo.
 */
export function fillTemplate(
  content: string,
  values: Record<string, string>
): string {
  let filled = content;
  for (const [key, value] of Object.entries(values)) {
    filled = filled.replaceAll(`{{${key}}}`, value);
  }
  return filled;
}

/**
 * Content se {{variable}} names detect karo.
 */
function detectVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
}

/**
 * Pre-built templates for common use cases.
 */
export const BUILTIN_TEMPLATES: Omit<PostTemplate, "id" | "user_id" | "created_at">[] = [
  {
    name: "Product Launch",
    content: "🚀 Introducing {{title}}!\n\n{{description}}\n\nCheck it out: {{url}}\n\n#launch #new",
    platforms: ["twitter", "linkedin"],
    category: "announcement",
    variables: ["title", "description", "url"],
  },
  {
    name: "Blog Share",
    content: "📝 New blog post: {{title}}\n\n{{summary}}\n\nRead more: {{url}}",
    platforms: ["twitter", "linkedin", "facebook"],
    category: "educational",
    variables: ["title", "summary", "url"],
  },
  {
    name: "Engagement Question",
    content: "💬 {{question}}\n\nDrop your answer below! 👇",
    platforms: ["twitter", "linkedin", "facebook", "instagram"],
    category: "engagement",
    variables: ["question"],
  },
  {
    name: "Weekly Tip",
    content: "💡 Weekly Tip:\n\n{{tip}}\n\n{{hashtags}}",
    platforms: ["twitter", "linkedin"],
    category: "educational",
    variables: ["tip", "hashtags"],
  },
  {
    name: "Behind the Scenes",
    content: "👀 Behind the scenes at {{company}}\n\n{{content}}\n\n#bts #behindthescenes",
    platforms: ["instagram", "facebook"],
    category: "engagement",
    variables: ["company", "content"],
  },
  {
    name: "Testimonial",
    content: "\"{{quote}}\" — {{author}}\n\nThank you for the kind words! 🙏",
    platforms: ["twitter", "linkedin", "facebook"],
    category: "promo",
    variables: ["quote", "author"],
  },
];
