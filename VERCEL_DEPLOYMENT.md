# OSIRIS deployment guide

## Deployment architecture

OSIRIS is a Vite React frontend plus an Express/tRPC Node backend. The repository’s `pnpm build` command creates both `dist/public` for the browser bundle and `dist/index.js` for the Node server. Vercel can host the static frontend directly, but the current Express server is not automatically converted into Vercel Functions. Therefore, there are two supported deployment paths.

| Goal | Recommended deployment | Result |
|---|---|---|
| Public visual globe preview | Vercel static deployment | The React globe and client UI are available. Backend procedures requiring `/api/trpc`, OAuth, database access, and server-side recon remain unavailable unless a separate API origin is configured. |
| Complete OSIRIS workspace | Node-compatible hosting for the full repository | Express, tRPC, OAuth, database persistence, public snapshot adapters, and defensive recon run together. The frontend and API share the same origin. |

The managed deployment at `https://osirisdash-dp34v9zy.manus.space` is the complete full-stack version. If you want the same architecture outside that hosting, use a Node-compatible service that runs `pnpm build` followed by `pnpm start`, rather than importing the project as a Vercel static-only site.

## Option A: Vercel frontend preview

Import the GitHub repository `gamesiteonline/osiris-intelligence-dashboard` into Vercel. Use **Other** or **Vite** as the framework preset, set the install command to `pnpm install --frozen-lockfile`, set the build command to `pnpm exec vite build`, and set the output directory to `dist/public`. Do not use the repository’s combined `pnpm build` command for this static-only deployment unless you intentionally want Vercel to also run the unused server bundle step.

The static preview needs no database or server secrets. The only optional client-side variables are shown below. If the project is later changed to call a separately hosted API, add the API origin using the application’s supported configuration and configure CORS and cookies on that API; do not expose server secrets in variables beginning with `VITE_`.

| Variable | Scope | Required for static preview | Purpose |
|---|---|---:|---|
| `VITE_ANALYTICS_ENDPOINT` | Vercel client | Optional | Analytics script base URL used by `client/index.html`. |
| `VITE_ANALYTICS_WEBSITE_ID` | Vercel client | Optional | Analytics site identifier used by `client/index.html`. |

The globe texture is already stored as a project-managed `/manus-storage/...` asset, so no map-provider key is needed for the current globe preview.

## Option B: complete full-stack deployment

For the complete app, deploy the repository to a Node-compatible host with a long-running Node process. Use `pnpm install --frozen-lockfile`, `pnpm build`, and `pnpm start`. The process listens on the platform-provided `PORT`; do not hardcode a port. The backend must serve the built frontend and the `/api/trpc` procedures from the same public origin.

Set these server-side variables. Keep them private and never commit them to GitHub.

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | MySQL/TiDB connection string used by Drizzle persistence. |
| `JWT_SECRET` | Yes | Session-cookie signing secret. Use a long random value. |
| `VITE_APP_ID` | Yes | Manus OAuth application ID used by the server. |
| `OAUTH_SERVER_URL` | Yes | OAuth backend base URL. |
| `VITE_OAUTH_PORTAL_URL` | Yes for login UI | OAuth portal URL used by the frontend login flow. |
| `OWNER_OPEN_ID` | Yes | Owner identity used by the auth and admin boundary. |
| `OWNER_NAME` | Recommended | Display name for the project owner. |
| `BUILT_IN_FORGE_API_URL` | Yes | Server-side built-in API endpoint used by public-data and platform helpers. |
| `BUILT_IN_FORGE_API_KEY` | Yes | Server-side bearer credential for built-in APIs. |
| `NODE_ENV` | Set by host | Use `production`. |
| `PORT` | Set by host | Use the host-provided port; the app reads it automatically. |
| `VITE_ANALYTICS_ENDPOINT` | Optional | Analytics script base URL. |
| `VITE_ANALYTICS_WEBSITE_ID` | Optional | Analytics site identifier. |

The existing project configuration also exposes `VITE_FRONTEND_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY`, `VITE_APP_LOGO`, and `VITE_APP_TITLE` as platform-managed values. They are not needed by the current server environment object for the globe rendering, but if the frontend or platform runtime references them in a future revision, configure them as non-secret public values only when appropriate. Never place `BUILT_IN_FORGE_API_KEY`, `JWT_SECRET`, or `DATABASE_URL` in a `VITE_` variable.

## OAuth and database configuration

Register the deployed origin and OAuth callback with the OAuth provider. The callback route is `/api/oauth/callback`, so a deployment at `https://example.com` needs the callback URL `https://example.com/api/oauth/callback`. The frontend login portal and backend OAuth server must refer to the same deployment environment. Configure the production database connection with TLS where supported, run the project’s reviewed schema migration through the platform’s database workflow, and verify that the application can reach `/api/trpc` after startup.

## If full-stack Vercel hosting is required

The current repository is not a Vercel-native full-stack deployment. To run it entirely on Vercel, the Express entrypoint must be adapted into Vercel-compatible serverless functions, the OAuth callback and `/api/trpc` routing must be mapped in `vercel.json`, database connections must be reused safely across invocations, and any long-running or network-sensitive recon work must be bounded for serverless execution. That adaptation is a separate engineering change; do not select `dist/public` and assume the backend is deployed automatically.

## Security and permitted use

OSIRIS is intended for clearly sourced public data and authorized defensive checks. Do not commit `.env` files or credentials, do not expose private API keys in client bundles, and use the recon panel only for domains and IPs you own or are explicitly authorized to assess. Public feeds may be unavailable or delayed; the interface labels fallback and provenance states accordingly.
