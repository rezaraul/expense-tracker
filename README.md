# Expense Tracker V5 - Shared Sync + Excel/PDF export

Fixes:
- Category dropdown repair: defaults are reseeded automatically if the local database is empty/corrupted.
- Shared household sync for two phones using Supabase Auth + Row Level Security.
- Excel export (.xlsx) containing:
  - Transactions
  - Categories
  - Monthly Summary
  - Category Summary
- PDF export containing the visible dashboard, monthly chart, categories, and transactions.
- CSV export remains available.
- Unlimited custom categories.

## Shared sync setup
1. Create a free Supabase project.
2. Open SQL Editor and run `supabase_setup.sql`.
3. In Project Settings/API, copy:
   - Project URL
   - public anon/publishable key
4. In the app: Settings -> paste both -> Save.
5. On your phone: create/sign in to your account, then Create Household.
6. Give the 6-character join code to your wife.
7. On her phone: open the same web app, sign up/sign in with her own email, paste the same Supabase URL/key, then Join Household using your code.
8. Both phones can press Sync. New transactions/categories are also pushed to the shared household when added.

Security:
- Do NOT paste a Supabase service-role key into the app.
- The supplied SQL enables Row Level Security.
- People outside your household cannot read household transactions through the API policies.
- The GitHub source code remains public, but your household data lives in your Supabase database, not in GitHub.

Exports:
- Excel and PDF export libraries are loaded from public CDNs, so export needs internet access the first time those libraries load.


## V5.1 security patch
The Join Household action now uses the secure `join_household_by_code()` Supabase RPC from the corrected SQL setup. The app no longer searches household join codes directly.

## V5.2 cache/sync fix
- Forces a new service-worker cache so iPhones stop using the older V5 join-household JavaScript.
- Keeps the secure `join_household_by_code()` RPC join method.
- After uploading this version, fully close the Home Screen web app/Safari tab and reopen it.
