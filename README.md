# 7shifts Live Checklist Dashboard (Next.js)

**Bezpieczeństwo:** `.env.local` zawiera sekrety — NIE commituj go. `.gitignore` już go wyklucza.

## Start lokalny
```bash
npm i
npm run dev
```

## Deploy na Vercel
- Ustaw w Project Settings → Environment Variables: `SEVENSHIFTS_ACCESS_TOKEN`, `SEVENSHIFTS_COMPANY_ID`, `DEFAULT_LOCATION_IDS`.
- Nigdy nie commituj `.env.local`.
