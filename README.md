# Checklist App

## Install

```powershell
npm install
```

## Prepare data

```powershell
npm run db:migrate
npm run sync:importer
npm run db:seed-demo
```

For the preferred Postgres-backed dev/staging bootstrap:

```powershell
npm run prepare:dev-postgres
```

That script starts a local Postgres 16 container on `127.0.0.1:5433`, prepares both the durable store and the live app runtime in Postgres, syncs the app runtime from Postgres, seeds the demo user, and writes `app/.env.local` so later `npm run dev` sessions use the same runtime DSN.

## Runtime Postgres Cutover

The live request-path app now runs on a Postgres-first runtime path. File-backed SQLite runtime boot is intentionally blocked; SQLite remains only in the in-memory unit-test harness.

Use these commands to bootstrap and audit the runtime store:

```powershell
npm run db:migrate:runtime-postgres
npm run audit:runtime-postgres-cutover
```

Or from the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File E:\Projekt\Miljöhusesyn\new-system\scripts\prepare-app-runtime-postgres.ps1
```

The cutover audit now separates live runtime debt from harness-only SQLite files, so the remaining SQLite surface in `*.sqlite.ts`, `schema.ts`, and `tests/unit/test-db.ts` is treated as test-only support rather than request-path coupling.

## Run

```powershell
npm run dev
```

## Test

```powershell
npm run test:unit
npm run test:e2e
```
