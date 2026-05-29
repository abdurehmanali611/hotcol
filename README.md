# Hotcol User (tenant app)

Next.js frontend with a GraphQL API in `BackEnd/`. Database schema and migrations live in `BackEnd/prisma/`.

## Development

```bash
# Terminal 1 — API (port 4000)
cd BackEnd && npm run dev

# Terminal 2 — Frontend (port 3000)
npm run dev
```

Set `DATABASE_URL` in `BackEnd/.env`. Prisma 7 uses `BackEnd/prisma.config.ts` for CLI and a MariaDB driver adapter at runtime (`BackEnd/lib/prismaClient.js`).

Set `NEXT_PUBLIC_GRAPHQL_URL` in `.env.local` (e.g. `https://hotcol-backend.vercel.app/graphql` for production, or `http://localhost:4000/graphql` when running `BackEnd` locally). Restart `npm run dev` after changing env files.

## Validate before deploy

```bash
npm run validate
```

Runs ESLint, Next.js production build, and `prisma generate` in BackEnd.

## Backend

| Command | Description |
|---------|-------------|
| `npm run build --prefix BackEnd` | Generate Prisma client |
| `npm run db:push --prefix BackEnd` | Push schema (dev only) |
| `npm run db:studio --prefix BackEnd` | Prisma Studio |

Apex dashboard API and UI live in separate repos (`hotcol`, `GraphQl-BackEnd`).
