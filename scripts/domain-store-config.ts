import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const defaultSqlitePath = path.resolve(process.cwd(), '../schema/domain-store.sqlite');

export type DomainStoreConfig = {
	engine: 'sqlite' | 'postgres';
	sqlitePath: string;
	postgresDsn: string | null;
};

export function resolveDomainStoreConfig(env: NodeJS.ProcessEnv = process.env): DomainStoreConfig {
	const effectiveEnv = resolveDomainStoreEnv(env);
	const rawEngine = effectiveEnv.MHS_DOMAIN_STORE_ENGINE?.trim().toLowerCase();
	const engine =
		rawEngine === 'sqlite' ? 'sqlite'
		: rawEngine === 'postgres' || Boolean(effectiveEnv.MHS_DOMAIN_STORE_POSTGRES_DSN?.trim()) ? 'postgres'
		: 'sqlite';

	return {
		engine,
		sqlitePath: effectiveEnv.MHS_DOMAIN_STORE_SQLITE_PATH?.trim() || defaultSqlitePath,
		postgresDsn: effectiveEnv.MHS_DOMAIN_STORE_POSTGRES_DSN?.trim() || null
	};
}

export function requireSqliteDomainStorePath(env: NodeJS.ProcessEnv = process.env): string {
	const config = resolveDomainStoreConfig(env);

	if (config.engine !== 'sqlite') {
		throw new Error(
			'The configured durable-store engine is not sqlite.'
		);
	}

	return config.sqlitePath;
}

export function requirePostgresDsn(env: NodeJS.ProcessEnv = process.env): string {
	const config = resolveDomainStoreConfig(env);

	if (config.engine !== 'postgres') {
		throw new Error('The configured durable-store engine is not postgres.');
	}

	if (!config.postgresDsn) {
		throw new Error(
			'MHS_DOMAIN_STORE_ENGINE=postgres requires MHS_DOMAIN_STORE_POSTGRES_DSN to be set.'
		);
	}

	return config.postgresDsn;
}

function resolveDomainStoreEnv(env: NodeJS.ProcessEnv) {
	const fileEnv = loadDomainStoreEnvFile();
	return {
		...fileEnv,
		...env
	};
}

function loadDomainStoreEnvFile() {
	for (const envPath of candidateEnvPaths()) {
		if (!existsSync(envPath)) {
			continue;
		}

		return parseEnvFile(readFileSync(envPath, 'utf8'));
	}

	return {};
}

function candidateEnvPaths() {
	const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../');

	return [
		process.env.APP_ENV_FILE,
		path.join(process.cwd(), '.env.local'),
		path.join(process.cwd(), '.env'),
		path.join(appRoot, '.env.local'),
		path.join(appRoot, '.env')
	].filter((value): value is string => Boolean(value));
}

function parseEnvFile(contents: string) {
	const values: Record<string, string> = {};

	for (const rawLine of contents.split(/\r?\n/)) {
		const line = rawLine.trim();

		if (!line || line.startsWith('#')) {
			continue;
		}

		const separatorIndex = line.indexOf('=');
		if (separatorIndex === -1) {
			continue;
		}

		const key = line.slice(0, separatorIndex).trim();
		const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');

		if (key) {
			values[key] = value;
		}
	}

	return values;
}
