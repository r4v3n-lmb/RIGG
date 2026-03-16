$ErrorActionPreference = "Stop"

if (-not $env:SUPABASE_ACCESS_TOKEN) { throw "Missing SUPABASE_ACCESS_TOKEN" }
if (-not $env:SUPABASE_PROJECT_REF) { throw "Missing SUPABASE_PROJECT_REF" }
if (-not $env:RESEND_API_KEY) { throw "Missing RESEND_API_KEY" }
if (-not $env:RESEND_FROM) { throw "Missing RESEND_FROM" }
if (-not $env:SITE_URL) { throw "Missing SITE_URL" }

Write-Host "Deploying Edge Function to Supabase..."
npx supabase functions deploy send-confirmation --project-ref $env:SUPABASE_PROJECT_REF

Write-Host "Setting Edge Function secrets..."
npx supabase secrets set `
  RESEND_API_KEY=$env:RESEND_API_KEY `
  RESEND_FROM=$env:RESEND_FROM `
  SITE_URL=$env:SITE_URL `
  --project-ref $env:SUPABASE_PROJECT_REF

Write-Host "Done."
