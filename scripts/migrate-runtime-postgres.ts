import { migrateRuntimePostgres } from '../src/lib/server/db/migrate';
import { requireRuntimePostgresDsn } from '../src/lib/server/db/runtime-db-config';

const dsn = requireRuntimePostgresDsn();
await migrateRuntimePostgres(dsn);
console.log(`Applied PostgreSQL runtime schema to ${dsn}`);
