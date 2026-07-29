# Connected accounts

**Route:** `/w/[slug]/settings/connected-accounts`  
**Status:** UI only — no real OAuth

## Files

- `app/(app)/w/[slug]/settings/connected-accounts/page.tsx`
- `components/settings/connected-accounts.tsx`

## Behavior

- Cards: Slack, Google Calendar, Notion, GitHub
- Every **Connect** button calls `toast("Coming soon", { id: "connected-accounts-soon" })`
- Descriptions say **Zyvia** (not Linear)
- Google Calendar description: “Sync your calendar out-of-office status to Zyvia”

## When implementing for real later

- Keep card layout; wire Connect to OAuth start URLs
- Connected state should expand like Linear (account handle + Connected menu)
- Do not invent fake “Connected” state without a real link
