# Moving the API to Frankfurt (always-on)

Status: prepared, not done. Nothing here has been run against the live site.

## Why

Checked on 26 November 2026:

| Part | Where it runs | Plan |
| --- | --- | --- |
| Pages (Vercel) | Worldwide edge | Hobby |
| API (Render, `rookie-quest-keeper-api`) | Oregon, USA | Free |
| Database (MongoDB Atlas, `rookiequestkeeper`) | Western Europe | Free |

Two things make the site slow:

1. **The free API sleeps.** After a quiet spell the next visitor waits while it
   wakes ("The backend may be waking up").
2. **The API is a long way from the database.** Every load or save travels
   from the US west coast to Europe and back, often several times per page.

A paid instance in Frankfurt fixes both: it stays on, and it sits next to the
database and close to UK players.

Render cannot change a service's region, so this is a new service and a
switch-over, not an edit.

## Steps

Each step is safe to stop after. The old service keeps serving the site until
step 5.

### 1. Create the new service (owner, about 10 minutes)

1. In Render: **New → Blueprint**, choose this repository. Render reads
   `render.yaml` and offers `rookie-quest-keeper-api-eu` (Frankfurt, Starter).
2. It asks for each environment value. Open the old service's **Environment**
   tab in another window and copy each one across.
   - `JWT_SECRET_KEY` **must be identical**, or every signed-in user is signed
     out and password-reset links in flight stop working.
   - `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS` and `APP_URL`: identical.
   - Copy any other variable the old service has, even if it is not listed in
     `render.yaml`.
3. Approve. This starts the paid plan.

### 2. Let the database accept the new service (owner)

In MongoDB Atlas → **Network Access**: if the list is "allow from anywhere"
(`0.0.0.0/0`), nothing to do. If it lists specific addresses, add the new
service's outbound addresses (Render → the service → **Connect → Outbound**).

### 3. Check the new service on its own

Before any switch, these should work against
`https://rookie-quest-keeper-api-eu.onrender.com`:

- `GET /api/health` answers.
- Sign in with a test account through the API and load its characters.

The site is still using the old service at this point.

### 4. Point the site at the new service (one small pull request)

Three places name the API's address:

| File | What |
| --- | --- |
| `frontend/vercel.json` | the `/api/:path*` rewrite destination |
| `frontend/src/lib/api.js` | `PRODUCTION_SOCKET_HOSTS` (two entries, `wss://…`) |
| `frontend/src/lib/liveDisplaySocket.test.js` | the two expectations for those hosts |

Change `rookie-quest-keeper-api.onrender.com` to
`rookie-quest-keeper-api-eu.onrender.com` in all three, run the tests, merge.
Vercel deploys in a couple of minutes.

### 5. Verify, then retire the old service

- Sign in on the live site, open a character, save a change, reload.
- Open a campaign in Live Play with the player display on a second device
  (this exercises the live socket).
- Leave the old service running for a day or two as a fallback. To roll back,
  revert the pull request from step 4.
- Then suspend the old service in Render. It costs nothing while free, so
  there is no rush.

## What does not change

- The database, its data and its address.
- The site's address, Google sign-in settings and CORS origins (the pages
  still come from the same domain).
- Any code path: only the API's address changes.

## Later, before a public launch

- **Atlas**: the free cluster shares hardware and has a small storage cap.
  The next tier up (Flex) is the sensible step when storage or speed becomes
  a limit.
- **Vercel Pro**: not a speed upgrade. Needed for the daily deployment limit
  and for commercial use.
