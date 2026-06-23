import { createRequire } from 'node:module';
import type Database from 'better-sqlite3';
import { Pool, type QueryResultRow } from 'pg';
import {
	requirePostgresDsn,
	requireSqliteDomainStorePath,
	resolveDomainStoreConfig,
	type DomainStoreConfig
} from '../../../../scripts/domain-store-config';

const require = createRequire(import.meta.url);
export type DomainStoreEngine = 'sqlite' | 'postgres';

export type DomainStoreClient = {
	engine: DomainStoreEngine;
	all<T extends QueryResultRow>(sql: string, params?: readonly unknown[]): Promise<T[]>;
	get<T extends QueryResultRow>(sql: string, params?: readonly unknown[]): Promise<T | null>;
	run(sql: string, params?: readonly unknown[]): Promise<void>;
	close(): Promise<void>;
};

export type DomainStorePostgresQueryable = Pick<Pool, 'query'>;
type DomainStoreClientOptions = {
	postgresPool?: DomainStorePostgresQueryable;
};

let domainStorePostgresPool: Pool | null = null;
let domainStorePostgresPoolDsn: string | null = null;
let sqliteDatabaseConstructor: typeof Database | null = null;

function loadBetterSqlite3() {
	sqliteDatabaseConstructor ??=
		(require('better-sqlite3') as { default?: typeof Database }).default ??
		(require('better-sqlite3') as typeof Database);
	return sqliteDatabaseConstructor;
}

export function getDomainStoreEngine(env: NodeJS.ProcessEnv = process.env): DomainStoreEngine {
	return resolveDomainStoreConfig(env).engine;
}

export function isDomainStorePostgresEnabled(env: NodeJS.ProcessEnv = process.env) {
	const config = resolveDomainStoreConfig(env);
	return config.engine === 'postgres' && Boolean(config.postgresDsn);
}

export function getDomainStorePostgresPool(env: NodeJS.ProcessEnv = process.env) {
	if (!isDomainStorePostgresEnabled(env)) {
		return null;
	}

	const dsn = requirePostgresDsn(env);

	if (!domainStorePostgresPool || domainStorePostgresPoolDsn !== dsn) {
		domainStorePostgresPool = new Pool({ connectionString: dsn });
		domainStorePostgresPoolDsn = dsn;
	}

	return domainStorePostgresPool;
}

export function requireDomainStorePostgresPool(env: NodeJS.ProcessEnv = process.env) {
	const pool = getDomainStorePostgresPool(env);

	if (!pool) {
		throw new Error('Domain-store PostgreSQL access requested without an active pool.');
	}

	return pool;
}

export function createDomainStoreClient(
	env: NodeJS.ProcessEnv = process.env,
	options: DomainStoreClientOptions = {}
): DomainStoreClient {
	const config = resolveDomainStoreConfig(env);

	if (config.engine === 'postgres') {
		const pool = options.postgresPool ?? requireDomainStorePostgresPool(env);

		return {
			engine: 'postgres',
			async all<T extends QueryResultRow>(sql: string, params: readonly unknown[] = []) {
				const result = await pool.query<T>(rewriteSqlitePlaceholdersForPostgres(sql), [...params]);
				return result.rows;
			},
			async get<T extends QueryResultRow>(sql: string, params: readonly unknown[] = []) {
				const result = await pool.query<T>(rewriteSqlitePlaceholdersForPostgres(sql), [...params]);
				return (result.rows[0] ?? null) as T | null;
			},
			async run(sql: string, params: readonly unknown[] = []) {
				await pool.query(rewriteSqlitePlaceholdersForPostgres(sql), [...params]);
			},
			async close() {}
		};
	}

	const SqliteDatabase = loadBetterSqlite3();
	const sqlite = new SqliteDatabase(requireSqliteDomainStorePath(env));
	sqlite.pragma('foreign_keys = ON');

	return {
		engine: 'sqlite',
		async all<T extends QueryResultRow>(sql: string, params: readonly unknown[] = []) {
			return sqlite.prepare(sql).all(...params) as T[];
		},
		async get<T extends QueryResultRow>(sql: string, params: readonly unknown[] = []) {
			return (sqlite.prepare(sql).get(...params) as T | undefined) ?? null;
		},
		async run(sql: string, params: readonly unknown[] = []) {
			sqlite.prepare(sql).run(...params);
		},
		async close() {
			sqlite.close();
		}
	};
}

export async function withDomainStoreClient<T>(
	run: (client: DomainStoreClient, config: DomainStoreConfig) => Promise<T> | T,
	env: NodeJS.ProcessEnv = process.env
) {
	const config = resolveDomainStoreConfig(env);
	const client = createDomainStoreClient(env);

	try {
		return await run(client, config);
	} finally {
		await client.close();
	}
}

export function rewriteSqlitePlaceholdersForPostgres(sql: string) {
	let parameterIndex = 0;
	return sql.replace(/\?/g, () => `$${parameterIndex += 1}`);
}
