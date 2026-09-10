# PostPilot — Setup

## 1. Supabase project banao (5 min, free)

1. https://supabase.com par jao, "New Project" banao
2. Project Settings → API me jao, ye 2 values copy karo:
   - Project URL
   - anon public key
3. `.env.local.example` ko `.env.local` naam se copy karo, dono values paste karo

## 2. Database schema chalao

1. Supabase Dashboard → SQL Editor kholo
2. `supabase/schema.sql` ki poori file copy-paste karo
3. "Run" dabao — ye 4 tables banayega: `profiles`, `platform_connections`, `posts`, `post_results`
   (saath me Row Level Security bhi on ho jayegi, taaki har user sirf apna data dekhe)

## 3. Local run karo

```bash
npm install
npm run dev
```

`http://localhost:3000` par jao.

## 4. Test karo

1. `/login` par signup karo (email confirm karna pad sakta hai — Supabase Auth
   settings me "Confirm email" off bhi kar sakte ho testing ke liye, Authentication →
   Providers → Email)
2. Login karke `/dashboard` par pahonch jaoge
3. "Naya post" se ek draft banao aur save karo — DB me save hoke dashboard par dikhega

## Ab kya kaam kar raha hai (Phase 1 complete)

- Real signup/login/logout (Supabase Auth)
- Protected `/dashboard` route (bina login access nahi)
- Post banake draft save karna (asli database me)
- Dashboard par apne saved posts dekhna

## Abhi kya baaki hai (Phase 2+)

- Platform (Instagram/Facebook/Twitter/LinkedIn) connect karna — OAuth
- Publish button abhi disabled hai, jab tak platform connect na ho
- Scheduling, analytics — sabse last me (jaisa plan tha)
