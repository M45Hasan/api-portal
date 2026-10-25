# ApiPortal Backend — Step 1

Starter backend for the secure HHAexchange API Gateway project.

## Requirements

- Node.js 22 LTS (or another supported Node.js LTS release)
- npm
- MongoDB running locally or a reachable development MongoDB instance

## Setup on Windows PowerShell

1. Extract the ZIP.
2. Open PowerShell in the extracted `api-portal` folder.
3. Install dependencies:

   ```powershell
   npm install
   ```

4. Copy the example environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

5. Ensure MongoDB is running and the URI in `.env` is correct.
6. Start the development server:

   ```powershell
   npm run dev
   ```

## Verify

Open `http://localhost:4000/` and `http://localhost:4000/health`.

The health endpoint returns `healthy` only when the MongoDB connection is active.

Run checks:

```powershell
npm run typecheck
npm run build
```

## Current scope

This ZIP includes only the initial project foundation: Express, TypeScript, MongoDB connection, environment validation, basic security middleware, rate limiting, health endpoint, and generic error handling.

It does **not** yet implement developer authentication, admin access grants, portal credentials, the HHAexchange connector, or production secrets management. Do not expose it to production or the public internet until those phases are implemented and security-tested.

HHAexchange credentials must never be added to this repository, `.env.example`, frontend code, logs, or source control.
