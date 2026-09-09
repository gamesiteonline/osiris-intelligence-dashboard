# Vercel deployment notes

This project is a React + Vite frontend with an Express/tRPC backend. The frontend can be built by Vercel with `pnpm build`, but the current backend entrypoint is a long-running Node/Express process rather than a Vercel serverless function. For a complete deployment with OAuth, database procedures, and defensive recon, use the project’s managed Node hosting or adapt the server routes into Vercel Functions before deploying the full stack.

## Frontend-only Vercel preview

1. Import the GitHub repository into Vercel.
2. Set the framework preset to **Vite**.
3. Set the build command to `pnpm build`.
4. Set the output directory to `dist/public`.
5. Add the public frontend variables required by the client, especially `VITE_APP_TITLE`, `VITE_APP_LOGO`, `VITE_ANALYTICS_ENDPOINT`, and `VITE_ANALYTICS_WEBSITE_ID` when applicable.
6. Deploy the frontend. API calls will require a separately hosted backend and matching `/api/trpc` origin configuration.

## Full-stack deployment

For the current Express/tRPC server, deploy the Node process to a Node-compatible host, configure the database and OAuth secrets there, and point the frontend API origin at that backend. Do not commit `.env` files, OAuth secrets, database credentials, JWT secrets, or provider keys to GitHub or Vercel.

## Important data and security notes

The OSIRIS workspace is limited to clearly sourced public data. The defensive recon panel is intended only for domains and IPs that the operator owns or is explicitly authorized to assess. Public-feed availability can change, and fallback records are labeled in the interface.
