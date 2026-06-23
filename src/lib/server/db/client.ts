import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { Pool } from 'pg';
import * as schema from './schema';
import { resolveRuntimeDbConfig } from './runtime-db-config';
import { migrateDb } from './migrate';

export type AppDb = BetterSQLite3Database<typeof schema>;
export type RuntimeDbEngine = 'sqlite' | 'postgres';
export type RuntimeDbContext = {
	engine: RuntimeDbEngine;
	appDb: AppDb;
	postgresPool: Pool | null;
};

let runtimePostgresPool: Pool | null = null;
const runtimePostgresDbStub = Object.freeze({ __runtimeEngine: 'postgres' }) as unknown as AppDb;

export function getRuntimeDbEngine(env: NodeJS.ProcessEnv = process.env): RuntimeDbEngine {
	return resolveRuntimeDbConfig(env).engine;
}

export function getAppDbEngine(db: AppDb): RuntimeDbEngine {
	return (db as { __runtimeEngine?: RuntimeDbEngine }).__runtimeEngine ?? 'sqlite';
}

export function isRuntimePostgresEnabled(env: NodeJS.ProcessEnv = process.env) {
	const config = resolveRuntimeDbConfig(env);
	return config.engine === 'postgres' && Boolean(config.postgresDsn);
}

export function getRuntimePostgresPool() {
	if (!isRuntimePostgresEnabled()) {
		return null;
	}

	if (!runtimePostgresPool) {
		runtimePostgresPool = new Pool({
			connectionString: resolveRuntimeDbConfig().postgresDsn ?? undefined
		});
	}

	return runtimePostgresPool;
}

export function requireRuntimePostgresPool() {
	const pool = getRuntimePostgresPool();

	if (!pool) {
		throw new Error('Runtime PostgreSQL access requested without an active pool.');
	}

	return pool;
}

export function createDb(filename = resolveRuntimeDbConfig().sqlitePath): AppDb {
	if (filename === ':memory:') {
		const sqlite = new Database(filename);
		sqlite.pragma('foreign_keys = ON');
		migrateDb(sqlite);
		return drizzle({ client: sqlite, schema });
	}

	if (getRuntimeDbEngine() === 'postgres') {
		return runtimePostgresDbStub;
	}

	throw new Error(
		'File-backed SQLite app runtime is no longer supported. Use APP_DB_ENGINE=postgres with APP_DB_POSTGRES_DSN, or :memory: for the unit test harness.'
	);
}

export function createRuntimeDbContext(filename = resolveRuntimeDbConfig().sqlitePath): RuntimeDbContext {
	return {
		engine: getRuntimeDbEngine(),
		appDb: createDb(filename),
		postgresPool: getRuntimePostgresPool()
	};
}
