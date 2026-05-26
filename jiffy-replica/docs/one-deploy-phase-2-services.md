# One-Deploy Phase 2: Services API Cutover

This phase migrates the public services and service categories API from Render to the Supabase Edge function while keeping Render as a fallback for unmigrated routes.

## Scope

Migrated through `supabase/functions/bridgework-api`:

- `GET /health`
- `GET /api/services`
- `GET /api/services/search`
- `GET /api/services/categories`
- `GET /api/services/categories/:id`
- `GET /api/services/:id`

All other `/api/*` routes continue to proxy to `LEGACY_API_BASE_URL` when that variable is configured.

## Supabase Deploy

Run from `jiffy-replica` with a Supabase account that has deploy access to project `oazubtxbiqgpvyiphvis`:

```bash
npx supabase functions deploy bridgework-api --project-ref oazubtxbiqgpvyiphvis
```

If deploying manually in the Supabase dashboard, create or edit the `bridgework-api` function and paste the contents of `supabase/functions/bridgework-api/index.ts`. The function is self-contained for dashboard deployment and does not require uploading the repo's `_shared` folder.

This local machine reached the project but received a `403` from Supabase, so an authorized owner/admin account must run the deploy or provide a valid Supabase access token.

## Netlify Environment

Set these in Netlify, then redeploy the site:

```bash
SUPABASE_EDGE_API_URL=https://oazubtxbiqgpvyiphvis.supabase.co/functions/v1/bridgework-api
LEGACY_API_BASE_URL=https://your-current-render-backend.example.com
NEXT_PUBLIC_API_URL=https://your-current-render-backend.example.com
```

`SUPABASE_EDGE_API_URL` is the preferred target. `LEGACY_API_BASE_URL` keeps non-migrated routes working. `NEXT_PUBLIC_API_URL` remains a temporary emergency fallback and should be removed after Edge parity is complete.

## Smoke Checks

After deploying the function:

```bash
curl https://oazubtxbiqgpvyiphvis.supabase.co/functions/v1/bridgework-api/health
curl "https://oazubtxbiqgpvyiphvis.supabase.co/functions/v1/bridgework-api/api/services?search=hvac&sales_channel=residential"
curl "https://oazubtxbiqgpvyiphvis.supabase.co/functions/v1/bridgework-api/api/services/categories?sales_channel=residential"
```

After setting Netlify env vars and redeploying:

```bash
curl "https://bridgeworkservices.com/api/services?search=hvac&sales_channel=residential"
curl "https://bridgeworkservices.com/api/services/categories?sales_channel=residential"
```

Expected: each services response returns `success: true` and includes HVAC/category data. The public services page should show HVAC when searching at `/services?type=residential`.
