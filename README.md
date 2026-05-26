# Hotcol User (tenant app)

Next.js frontend with a GraphQL API in `BackEnd/`. Database schema and migrations live in `BackEnd/prisma/`.

## Development

```bash
# Frontend (port 3000)
npm run dev

# API (from BackEnd/)
cd BackEnd && npm run dev
```

Set `DATABASE_URL` in `BackEnd/.env`. Prisma 7 uses `BackEnd/prisma.config.ts` for CLI and a MariaDB driver adapter at runtime (`BackEnd/lib/prismaClient.js`).

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
