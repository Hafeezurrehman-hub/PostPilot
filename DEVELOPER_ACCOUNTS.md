# Developer Accounts Setup — Har Platform

Ye Supabase se bilkul alag/independent kaam hai — abhi shuru kar sakte ho, Supabase
ka intezar karne ki zaroorat nahi.

**Recommended order**: Twitter ya LinkedIn pehle (sabse aasan/fast), Facebook/
Instagram sabse aakhir me (Meta ka review process sabse zyada time leta hai).

---

## 1. Twitter / X

1. https://developer.twitter.com par jao, apne normal Twitter account se sign in karo
2. "Sign up for Free Account" ya "Developer Portal" me jao — application form bharo
   (short describe karo: "personal tool to cross-post to multiple platforms")
3. Approval usually turant ya kuch ghanton me mil jata hai (Twitter ka sabse aasan hai)
4. Dashboard me ek **Project** aur uske andar ek **App** banao
5. App Settings → "User authentication settings" → Set up:
   - App permissions: **Read and Write**
   - Type of App: **Web App**
   - Callback URL: `http://localhost:3000/api/auth/twitter/callback`
   - Website URL: `http://localhost:3000` (ya jo bhi baad me domain ho)
6. "Keys and tokens" tab me jao, **OAuth 2.0 Client ID and Client Secret** copy karo
7. `.env.local` me daalo:
   ```
   TWITTER_CLIENT_ID=...
   TWITTER_CLIENT_SECRET=...
   ```

⚠️ Note: Free tier me posting ke liye limited monthly tweet cap hota hai — testing
ke liye kaafi hai, production scale ke liye baad me paid tier dekhna padega.

---

## 2. LinkedIn

1. https://www.linkedin.com/developers/apps par jao, "Create app" dabao
2. Form bharo: App name, LinkedIn Page (agar nahi hai to ek company page banani
   padegi — personal profile kaafi nahi, LinkedIn ki requirement hai), Logo, etc.
3. App banne ke baad, **Products** tab me jao, ye add karo:
   - "Sign In with LinkedIn using OpenID Connect"
   - "Share on LinkedIn"
4. **Auth** tab me jao:
   - Authorized redirect URL add karo: `http://localhost:3000/api/auth/linkedin/callback`
   - Client ID aur Client Secret yahi mil jayenge
5. `.env.local` me daalo:
   ```
   LINKEDIN_CLIENT_ID=...
   LINKEDIN_CLIENT_SECRET=...
   ```

⚠️ Note: "Share on LinkedIn" product turant approve ho jata hai, review nahi
mangta — LinkedIn sabse smooth process hai in sab me.

---

## 3. Facebook + Instagram (dono ek hi setup se)

1. https://developers.facebook.com par jao, "My Apps" → "Create App"
2. App type: **Business** select karo
3. App bante hi, **Products** me "Facebook Login" add karo
4. Facebook Login → Settings me:
   - Valid OAuth Redirect URI: `http://localhost:3000/api/auth/facebook/callback`
5. App Dashboard → Settings → Basic me **App ID** aur **App Secret** mil jayenge
6. `.env.local` me daalo:
   ```
   FACEBOOK_CLIENT_ID=...
   FACEBOOK_CLIENT_SECRET=...
   ```

### Testing abhi ke liye (bina full review ke):
- Naya app "Development Mode" me hota hai by default
- Development mode me sirf wahi log app use kar sakte hain jo app ke "Roles" me
  add hon (khud ka account already added hota hai as Admin)
- Matlab **khud test karne ke liye abhi review ki zaroorat nahi** — turant kaam
  karega apne hi account ke sath

### Public launch ke liye baad me (jab dusre log bhi use karen):
- App Review submit karni hogi permissions ke liye: `pages_manage_posts`,
  `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`
- Isme business verification bhi lag sakti hai, aur review me days-to-weeks
  lag sakte hain — ye sabse mushkil/slow part hai (jaisa humne pehle discuss
  kiya tha), isliye ye sabse last me karna

### Instagram specific requirement:
- Instagram account **Business** ya **Creator** type ka hona chahiye (Personal
  account se API se post nahi ho sakta — Instagram app ke Settings me free me
  switch kar sakte ho)
- Wo Instagram account ek Facebook Page se linked hona chahiye
- Humara code (`/api/auth/facebook/callback`) automatically dono check karke
  connect kar deta hai jab tum Facebook se connect karte ho

---

## Summary Table

| Platform | Approval Time | Testing abhi possible? |
|---|---|---|
| Twitter/X | Minutes-hours | Haan |
| LinkedIn | Turant (no review) | Haan |
| Facebook | Turant for own account (Dev mode) | Haan (apne account se) |
| Instagram | Same as Facebook | Haan (agar Business account + linked Page hai) |

Matlab **abhi tino/chaaro platforms khud test kar sakte ho** — sirf jab app ko
duniya ke liye public karoge (dusre log bhi use karen) tab Facebook/Instagram ka
full review chahiye hoga.
