import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Database from 'better-sqlite3';
import { Client } from 'pg';
import { appRoles } from '$lib/roles';
import { requireRuntimePostgresDsn, resolveRuntimeDbConfig } from './runtime-db-config';
import { resetRuntimePostgresSequences } from './runtime-postgres-sequences';

const defaultDbPath = 'data/checklist.sqlite';
const runtimeSchemaPath = path.resolve(process.cwd(), '..', 'schema', 'schema.sql');
const runtimePostgresSchemaPath = path.resolve(process.cwd(), '..', 'schema', 'app-runtime.postgres.sql');
type SqliteDatabase = InstanceType<typeof Database>;
const appRoleSqlList = appRoles.map((role) => `'${role}'`).join(', ');

export function loadRuntimeSchemaSql(engine: 'sqlite' | 'postgres' = 'sqlite') {
	return fs.readFileSync(engine === 'postgres' ? runtimePostgresSchemaPath : runtimeSchemaPath, 'utf8');
}

export function migrateDb(sqlite: SqliteDatabase) {
	sqlite.exec(loadRuntimeSchemaSql());
	ensureQuestionColumns(sqlite);
	ensureAppUserColumns(sqlite);
	ensurePublicationJobColumns(sqlite);
}

function ensureQuestionColumns(sqlite: SqliteDatabase) {
	ensureTableColumns(sqlite, 'app_questions', [['annual_question', 'integer not null default 0']]);
}

function ensureAppUserColumns(sqlite: SqliteDatabase) {
	const columns: Array<[string, string]> = [
		['username', "text not null default ''"],
		['password_hash', "text not null default ''"],
		['role', "text not null default 'user'"],
		['first_name', "text not null default ''"],
		['last_name', "text not null default ''"],
		['phone', "text not null default ''"],
		['website', "text not null default ''"],
		['company_name', "text not null default ''"],
		['company_org_num', "text not null default ''"],
		['company_address_1', "text not null default ''"],
		['company_address_2', "text not null default ''"],
		['company_city', "text not null default ''"],
		['company_postcode', "text not null default ''"],
		['address_1', "text not null default ''"],
		['address_2', "text not null default ''"],
		['postcode', "text not null default ''"],
		['city', "text not null default ''"],
		['lrf_id', "text not null default ''"],
		['alert_sms', 'integer not null default 0'],
		['alert_email', 'integer not null default 1'],
		['created_at', "text not null default ''"]
	];

	ensureTableColumns(sqlite, 'app_users', columns);

	sqlite.exec("update app_users set username = email where username = ''");
	sqlite.exec("update app_users set created_at = current_timestamp where created_at = ''");
	normalizeRuntimeUserRolesInSqlite(sqlite);
	sqlite.exec('create unique index if not exists idx_app_users_username on app_users (username)');
}

function normalizeRuntimeUserRolesInSqlite(sqlite: SqliteDatabase) {
	sqlite.exec(`
		update app_users
		set role = lower(trim(role))
		where trim(coalesce(role, '')) <> ''
			and lower(trim(role)) in (${appRoleSqlList})
			and role <> lower(trim(role))
	`);
	sqlite.exec(`
		update app_users
		set role = 'user'
		where trim(coalesce(lower(role), '')) not in (${appRoleSqlList})
	`);
}

function ensurePublicationJobColumns(sqlite: SqliteDatabase) {
	const columns: Array<[string, string]> = [
		['attempt_count', 'integer not null default 0'],
		['max_attempts', 'integer not null default 3'],
		['output_pdf_path', "text not null default ''"],
		['queued_at', "text not null default current_timestamp"],
		['last_attempt_at', 'text'],
		['next_retry_at', 'text']
	];

	ensureTableColumns(sqlite, 'app_publication_jobs', columns);

	sqlite.exec("update app_publication_jobs set queued_at = created_at where queued_at is null or queued_at = ''");
}

function ensureTableColumns(sqlite: SqliteDatabase, tableName: string, columns: Array<[string, string]>) {
	const existingColumns = new Set(
		sqlite
			.prepare(`pragma table_info(${tableName})`)
			.all()
			.map((column) => (column as { name: string }).name)
	);

	for (const [name, definition] of columns) {
		if (!existingColumns.has(name)) {
			sqlite.exec(`alter table ${tableName} add column ${name} ${definition}`);
		}
	}
}

export function resolveRuntimeDbPath(filename = process.env.APP_DB_PATH ?? defaultDbPath) {
	return filename === ':memory:' ? filename : path.resolve(filename);
}

export function migrateRuntimeDb(filename = process.env.APP_DB_PATH ?? defaultDbPath) {
	if (filename !== ':memory:') {
		throw new Error(
			'File-backed SQLite runtime migration is no longer supported. Use migrateRuntimePostgres for the app runtime, or :memory: for the unit test harness.'
		);
	}

	const resolvedFilename = resolveRuntimeDbPath(filename);

	const sqlite = new Database(resolvedFilename);

	try {
		sqlite.pragma('foreign_keys = ON');

		migrateDb(sqlite);
	} finally {
		sqlite.close();
	}

	return resolvedFilename;
}

export async function migrateRuntimePostgres(dsn = requireRuntimePostgresDsn()) {
	const client = new Client({ connectionString: dsn });
	await client.connect();

	try {
		await client.query(loadRuntimeSchemaSql('postgres'));
		await ensureRuntimePostgresQuestionColumns(client);
		await normalizeRuntimeUserRolesInPostgres(client);
		await resetRuntimePostgresSequences(client);
	} finally {
		await client.end();
	}

	return dsn;
}

export async function ensureRuntimePostgresQuestionColumns(clientOrDsn: Client | string = requireRuntimePostgresDsn()) {
	if (typeof clientOrDsn !== 'string') {
		await clientOrDsn.query(
			'alter table if exists app_questions add column if not exists annual_question boolean not null default false'
		);
		return;
	}

	const client = new Client({ connectionString: clientOrDsn });
	await client.connect();

	try {
		await ensureRuntimePostgresQuestionColumns(client);
	} finally {
		await client.end();
	}
}

async function normalizeRuntimeUserRolesInPostgres(client: Client) {
	await client.query(`
		update app_users
		set role = lower(trim(role))
		where trim(coalesce(role, '')) <> ''
			and lower(trim(role)) in (${appRoleSqlList})
			and role <> lower(trim(role))
	`);
	await client.query(`
		update app_users
		set role = 'user'
		where trim(coalesce(lower(role), '')) not in (${appRoleSqlList})
	`);
}

export async function migrateConfiguredRuntimeStore() {
	const config = resolveRuntimeDbConfig();
	if (config.engine === 'postgres') {
		return migrateRuntimePostgres(requireRuntimePostgresDsn());
	}
	throw new Error(
		'Configured app runtime migrations now require APP_DB_ENGINE=postgres with APP_DB_POSTGRES_DSN. Use migrateRuntimeDb(\":memory:\") only for the unit test harness.'
	);
}

function isDirectExecution(metaUrl: string) {
	const entryPath = process.argv[1];
	return Boolean(entryPath) && metaUrl === pathToFileURL(entryPath).href;
}

if (isDirectExecution(import.meta.url)) {
	migrateConfiguredRuntimeStore()
		.then((target) => {
			console.log(`Applied runtime schema to ${target}`);
		})
		.catch((error) => {
			console.error(error);
			process.exitCode = 1;
		});
}
