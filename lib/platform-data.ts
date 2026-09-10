/** Platform metadata — descriptions, categories, limits, help text */

export interface PlatformMeta {
  id: string;
  name: string;
  description: string;
  authUrl: string;
  setupApi?: string;
  /** "core" platforms shown first, "extended" shown second */
  category: "core" | "extended";
  /** Character limit for post content */
  charLimit?: number;
  /** Extra notes shown on the card */
  note?: string;
  /** Help text shown in tooltip */
  help: string;
  /** Whether this platform uses manual token setup instead of OAuth */
  manualSetup: boolean;
}

export const ALL_PLATFORMS: PlatformMeta[] = [
  // ── Core (most popular, show first) ──
  {
    id: "twitter",
    name: "Twitter / X",
    description: "Post tweets with text and images",
    authUrl: "/api/auth/twitter/start",
    category: "core",
    charLimit: 280,
    help: "Click Connect → Log in to Twitter → Authorize PostPilot. You can post tweets with text and images.",
    manualSetup: false,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Share professional updates and articles",
    authUrl: "/api/auth/linkedin/start",
    category: "core",
    charLimit: 3000,
    help: "Click Connect → Log in to LinkedIn → Allow access. Great for professional content and articles.",
    manualSetup: false,
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Post to your Facebook Page",
    authUrl: "/api/auth/facebook/start",
    category: "core",
    charLimit: 63206,
    note: "Requires a Facebook Page (personal profiles not supported)",
    help: "Click Connect → Log in to Facebook → Select your Page → Allow. Posts go to your Facebook Page.",
    manualSetup: false,
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Share photos and reels to your feed",
    authUrl: "/api/auth/facebook/start",
    category: "core",
    charLimit: 2200,
    note: "Requires Business/Creator account + linked Facebook Page",
    help: "Connected automatically with Facebook. You need an Instagram Business or Creator account linked to a Facebook Page.",
    manualSetup: false,
  },

  // ── Extended platforms ──
  {
    id: "threads",
    name: "Threads",
    description: "Post to your Threads profile",
    authUrl: "/api/auth/threads/start",
    category: "extended",
    charLimit: 500,
    help: "Click Connect → Log in to Facebook → Threads is linked to your Instagram account.",
    manualSetup: false,
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Upload videos to TikTok",
    authUrl: "/api/auth/tiktok/start",
    category: "extended",
    help: "Click Connect → Log in to TikTok → Authorize. You can upload videos directly.",
    manualSetup: false,
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "Upload videos to your YouTube channel",
    authUrl: "/api/auth/youtube/start",
    category: "extended",
    help: "Click Connect → Log in with Google → Allow YouTube access. Uploads go to your channel.",
    manualSetup: false,
  },
  {
    id: "pinterest",
    name: "Pinterest",
    description: "Create pins on your boards",
    authUrl: "/api/auth/pinterest/start",
    category: "extended",
    help: "Click Connect → Log in to Pinterest → Allow. You can create pins with images.",
    manualSetup: false,
  },
  {
    id: "reddit",
    name: "Reddit",
    description: "Submit posts to subreddits",
    authUrl: "/api/auth/reddit/start",
    category: "extended",
    help: "Click Connect → Log in to Reddit → Allow. You can submit text posts and links.",
    manualSetup: false,
  },
  {
    id: "mastodon",
    name: "Mastodon",
    description: "Post to your Mastodon instance",
    authUrl: "/api/auth/mastodon/start",
    category: "extended",
    help: "Enter your instance URL (e.g., mastodon.social) → Log in → Authorize.",
    manualSetup: false,
  },
  {
    id: "bluesky",
    name: "Bluesky",
    description: "Post using an app password",
    authUrl: "/api/auth/bluesky/start",
    category: "extended",
    manualSetup: true,
    setupApi: "/api/auth/bluesky/setup",
    help: "Go to bsky.app → Settings → Advanced → App Passwords. Generate one and enter it here.",
  },
  {
    id: "google_business",
    name: "Google Business",
    description: "Post updates to your Google Business Profile",
    authUrl: "/api/auth/google-business/start",
    category: "extended",
    help: "Click Connect → Log in with Google → Allow. Posts appear on your Google Business Profile.",
    manualSetup: false,
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Send messages via WhatsApp Business API",
    authUrl: "/api/auth/whatsapp/start",
    category: "extended",
    manualSetup: true,
    setupApi: "/api/auth/whatsapp/setup",
    help: "Get a permanent access token from Meta Business Dashboard → Enter your Phone Number ID and token.",
  },
];

export function getPlatformById(id: string): PlatformMeta | undefined {
  return ALL_PLATFORMS.find((p) => p.id === id);
}

export function getCorePlatforms(): PlatformMeta[] {
  return ALL_PLATFORMS.filter((p) => p.category === "core");
}

export function getExtendedPlatforms(): PlatformMeta[] {
  return ALL_PLATFORMS.filter((p) => p.category === "extended");
}
