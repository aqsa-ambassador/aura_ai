# Aura AI — Fixed Build

## Kya theek hua (What was fixed)

1. **Chat history save nahi ho rahi thi** — asal wajah: `worker/index.js`
   sirf `/api/chat` ko Groq se connect karta tha, koi database (D1)
   involved hi nahi thi. Ab `worker/src/index.js` mein poora D1-backed
   system hai: `conversations` + `messages` tables, aur
   `/api/conversations` (GET/POST/DELETE) + `/api/messages` (GET)
   endpoints — Clerk token se verify hoke.
2. **Scrollbar** — sab jagah thin, rounded, contained scrollbar
   (`style.css` mein `::-webkit-scrollbar` rules) — screen ke bahar nahi
   nikalta ab.
3. **Sidebar resizable + hide** — sidebar ke right edge par drag handle
   hai (width adjust hoti hai, `localStorage` mein save hoti hai), aur
   header ka ☰ button + sidebar ke andar wala arrow button use karke
   sidebar collapse/expand hoti hai (desktop par slide, mobile par
   overlay).
4. **"You" text hata diya** — user ke messages ab ek clean person-icon
   avatar dikhate hain, text label nahi (Claude/Gemini jaisa).
5. **Login/Signup mandatory** — jab tak sign in nahi karte, chat input
   locked rehta hai (guest mode hata diya gaya).
6. **Image generation** — input bar mein ek naya icon (🖼) hai; usse
   on karke prompt likhein, Aura ek image generate kar dega
   (pollinations.ai — free, koi API key nahi chahiye).
7. **Bullet-point formatting** — AI ke jawabaat ab markdown parse karke
   dikhaye jate hain, matlab `-` ya `1.` se shuru hone wali lines asal
   bullet/numbered lists ban jati hain, `**bold**` bhi kaam karta hai.

## Deploy karne ke steps

### 1. Worker
```bash
cd worker
npm install
npx wrangler secret put CLERK_SECRET_KEY   # Clerk dashboard → API Keys
npx wrangler secret put GROQ_API_KEY
npx wrangler d1 create aura-ai-db          # prints a database_id
```
`wrangler.toml` mein `REPLACE_WITH_YOUR_DATABASE_ID` ko us id se badal dein.

```bash
npm run db:migrate:remote
npx wrangler deploy
```
Deploy hone ke baad jo URL milega (e.g. `https://aura-ai-worker.<you>.workers.dev`),
wo `frontend/js/app.js` ke top par `API_BASE` mein already daala hua hai —
apna asal URL confirm/update kar lein.

### 2. Frontend
`frontend` folder ko Cloudflare Pages (ya kisi bhi static host) par upload
kar dein. Koi build step nahi chahiye — plain HTML/CSS/JS hai.

## Note
- CORS abhi `*` (sab ke liye open) hai — production mein apne Pages domain
  tak limit kar dein.
- Rate limiting add karna recommended hai public launch se pehle.
