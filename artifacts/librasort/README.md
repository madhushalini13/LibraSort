# LibraSort

**Smart Library Book Arrangement & Optimization System**

LibraSort is a private digital library for cataloguing books and demonstrating
real Data Structures & Algorithms through search, grouping, sorting, and shelf
assignment. Each account sees only its own profile, books, and optimization
history.

## Features

- Email/password account sign-in and optional Google sign-in through the
  configured identity provider
- Private dashboard with live counts, category and shelf summaries, recent
  books, and the last saved optimization
- Book creation, editing, deletion, details, search, filters, sorting, and
  pagination
- Deterministic optimization with persisted before/after arrangements and
  operation metrics
- Saved optimization history and profile editing
- Responsive public landing page and DAA explainer

No sample users, books, or dashboard values are inserted. A new account starts
with an empty library.

## Architecture

- React + Vite web application: `artifacts/librasort`
- Express API: `artifacts/api-server`
- Shared OpenAPI contract: `lib/api-spec/openapi.yaml`
- Generated API hooks and validation schemas: `lib/api-client-react` and
  `lib/api-zod`
- PostgreSQL schema: `lib/db/src/schema`
- Authentication: Clerk-managed web sessions; protected API routes derive the
  user ID from the verified session cookie

## Database schema

- `users`: identity-provider user ID, display name, email, profile image, and
  account timestamps
- `books`: user-owned book metadata, status, shelf, and position
- `optimizations`: user-owned run metrics plus full before/after snapshots

The books and optimizations tables reference the user table with cascading
deletes. Every protected query is scoped to the authenticated user on the
server; the client cannot choose an owner ID.

## DAA algorithm

An optimization run groups books by the selected criterion (category, author,
title, or publication year), orders group keys and books inside groups using a
stable, top-down **merge sort**, then assigns the ordered collection across the
user's existing shelf labels with balanced contiguous positions.

- **Time complexity:** `O(n log n)` for sorting and `O(n)` for grouping and
  shelf assignment; total `O(n log n)`
- **Space complexity:** `O(n)` for the merge buffers, groups, and result
- **Operations:** counted merge comparisons, grouping insertions, and shelf
  assignments
- **Execution time:** measured around the in-memory optimization itself; database
  persistence is reported separately from this algorithm timing

The API saves the computed shelf/position updates and optimization snapshot in
one database transaction. The before and after views use the user's actual
records.

## API routes

All routes except the health check require a verified signed-in session.

- `GET /api/healthz` — service health
- `GET /api/dashboard` — live library summary
- `GET /api/profile`, `PATCH /api/profile` — read or update the signed-in
  account's local profile
- `GET /api/books` — search, filter, sort, and paginate owned books
- `POST /api/books` — add an owned book
- `GET /api/books/:id`, `PUT /api/books/:id`, `DELETE /api/books/:id` — read,
  edit, or delete one owned book
- `POST /api/optimization` — run and save an arrangement
- `GET /api/optimization/history` — list saved runs
- `GET /api/optimization/history/:id` — read one saved run

## Authentication setup

The application uses Clerk-managed sessions; it does not store or verify
passwords itself. Email/password sign-in is managed by the identity provider.
To offer Google OAuth, enable Google as a sign-in provider for this app in its
authentication provider settings. LibraSort uses the provider's actual
sign-in/sign-up components and does not show a decorative Google button when
the provider is unavailable.

## Environment

The runtime needs PostgreSQL and the identity provider's server/client
configuration:

- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_CLERK_PROXY_URL` (supplied by the managed production environment)

Never commit real values. Configure secrets through the deployment environment.

## Development

From the workspace root:

```sh
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/librasort run typecheck
```

The managed development workflows run the API server and web app. The API is
served under `/api`; the web app uses same-origin cookie requests.

## Deployment

Configure production database access, identity-provider settings, and the
production callback domain before publishing. Apply the database schema through
the deployment platform's supported production schema flow. Verify that Google
OAuth is enabled for the production identity-provider environment; development
and production authentication environments may have separate provider
settings.