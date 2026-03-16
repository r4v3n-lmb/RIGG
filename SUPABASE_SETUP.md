# Supabase + Resend Setup

## 1. Create Supabase project
1. Create a new project in Supabase.
2. Save your `Project URL` and `anon` key.

## 2. Create the database table
1. Open the SQL editor in Supabase.
2. Run the SQL in `supabase/schema.sql`.

## 3. Deploy the Edge Function
Use the provided script to deploy via `npx` (no global install):

```powershell
$env:SUPABASE_ACCESS_TOKEN="YOUR_SUPABASE_ACCESS_TOKEN"
$env:SUPABASE_PROJECT_REF="YOUR_PROJECT_REF"
$env:RESEND_API_KEY="YOUR_RESEND_API_KEY"
$env:RESEND_FROM="RIGG <hello@rigg.io>"
$env:SITE_URL="https://your-github-pages-site"
./scripts/supabase-deploy.ps1
```

## 4. Update the frontend config
Update these values in `index.html`:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 5. Resend domain setup
Verify your sending domain in Resend so the emails deliver correctly.

## 6. View data
Use the Supabase Table Editor to view/export pre-orders.
