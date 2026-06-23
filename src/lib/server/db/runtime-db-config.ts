import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type RuntimeDbConfig = {
	engine: 'sqlite' | 'postgres';
	sqlitePath: string;
	postgresDsn: string | null;
};

export function resolveRuntimeDbConfig(env: NodeJS.ProcessEnv = process.env): RuntimeDbConfig {
	const effectiveEnv = resolveRuntimeEnv(env);
	const rawEngine = effectiveEnv.APP_DB_ENGINE?.trim().toLowerCase();
	const engine =
		rawEngine === 'sqlite' ? 'sqlite'
		: rawEngine === 'postgres' || Boolean(effectiveEnv.APP_DB_POSTGRES_DSN?.trim()) ? 'postgres'
		: 'sqlite';

	return {
		engine,
		sqlitePath: effectiveEnv.APP_DB_PATH?.trim() || 'data/checklist.sqlite',
		postgresDsn: effectiveEnv.APP_DB_POSTGRES_DSN?.trim() || null
	};
}

export function requireRuntimePostgresDsn(env: NodeJS.ProcessEnv = process.env): string {
	const config = resolveRuntimeDbConfig(env);

	if (config.engine !== 'postgres') {
		throw new Error('The configured app runtime DB engine is not postgres.');
	}

	if (!config.postgresDsn) {
		throw new Error('APP_DB_ENGINE=postgres requires APP_DB_POSTGRES_DSN to be set.');
	}

	return config.postgresDsn;
}

function resolveRuntimeEnv(env: NodeJS.ProcessEnv) {
	const fileEnv = loadRuntimeEnvFile();
	return {
		...fileEnv,
		...env
	};
}

function loadRuntimeEnvFile() {
	for (const envPath of candidateEnvPaths()) {
		if (!existsSync(envPath)) {
			continue;
		}

		return parseEnvFile(readFileSync(envPath, 'utf8'));
	}

	return {};
}

function candidateEnvPaths() {
	const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');

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
